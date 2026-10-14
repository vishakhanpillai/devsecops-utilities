import { QualityCategory, SonarSeverity } from '../../types/sonar';

export interface ParsedSonarRule {
  name: string;
  rootCauseWhy: string;
  howToFix: string;
  introduction?: string;
  resources?: string;
}

export interface IssueEnrichment {
  vulnerabilityWhat: string;
  codeSnippet: string;
  rootCauseWhy: string;
  howToFix: string;
}

/**
 * Cleans a raw code snippet by stripping HTML tags and decoding entities
 */
export function cleanCodeSnippet(rawCode?: string): string {
  if (!rawCode) return 'N/A';
  const noTags = rawCode.replace(/<[^>]+>/g, '');
  return htmlToCleanText(noTags).trim() || 'N/A';
}

/**
 * Converts SonarQube HTML or Markdown descriptions into clean, legible plain text,
 * preserving bullet points, code blocks, and section breaks.
 */
export function htmlToCleanText(html: string): string {
  if (!html) return '';

  let text = html;

  // Convert break tags to newline
  text = text.replace(/<br\s*\/?>/gi, '\n');

  // Convert paragraph and block closing tags to double newlines
  text = text.replace(/<\/(p|div|h[1-6]|tr)>/gi, '\n\n');

  // Convert list items to bullet points
  text = text.replace(/<li[^>]*>/gi, '• ');
  text = text.replace(/<\/li>/gi, '\n');
  text = text.replace(/<\/(ul|ol)>/gi, '\n\n');

  // Preserve pre / code block transitions
  text = text.replace(/<pre[^>]*>/gi, '\n');
  text = text.replace(/<\/pre>/gi, '\n');

  // Remove remaining HTML tags
  text = text.replace(/<[^>]+>/g, '');

  // Decode common HTML entities
  text = text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));

  // Normalize whitespace: trim line endings and collapse 3+ consecutive newlines
  return text
    .split('\n')
    .map((l) => l.trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Extracts "Root Cause (Why)" and "How To Fix (Remediation Examples)" directly
 * from SonarQube rule metadata (supporting modern descriptionSections and classic htmlDesc/mdDesc).
 */
export function parseSonarRule(rule: {
  key?: string;
  name?: string;
  htmlDesc?: string;
  mdDesc?: string;
  descriptionSections?: Array<{ key: string; content: string }>;
}): ParsedSonarRule {
  const name = rule.name || '';
  let rootCauseWhy = '';
  let howToFix = '';
  let introduction = '';
  let resources = '';

  // 1. Check modern SonarQube descriptionSections (SonarQube 9.6+, 10.x, SonarCloud)
  if (Array.isArray(rule.descriptionSections) && rule.descriptionSections.length > 0) {
    const rootSection = rule.descriptionSections.find((s) => s.key === 'root_cause');
    if (rootSection && rootSection.content) {
      rootCauseWhy = htmlToCleanText(rootSection.content);
    }

    const introSection = rule.descriptionSections.find((s) => s.key === 'introduction');
    if (introSection && introSection.content) {
      introduction = htmlToCleanText(introSection.content);
      if (!rootCauseWhy) {
        rootCauseWhy = introduction;
      }
    }

    const fixSection = rule.descriptionSections.find(
      (s) => s.key === 'how_to_fix' || s.key === 'remediation'
    );
    if (fixSection && fixSection.content) {
      howToFix = htmlToCleanText(fixSection.content);
    }

    const resSection = rule.descriptionSections.find(
      (s) => s.key === 'resources' || s.key === 'see_also'
    );
    if (resSection && resSection.content) {
      resources = htmlToCleanText(resSection.content);
    }

    if (rootCauseWhy || howToFix) {
      return {
        name,
        rootCauseWhy: rootCauseWhy || 'Refer to SonarQube rule description for root cause analysis.',
        howToFix: howToFix || 'Refer to SonarQube rule remediation guidelines for code fixes.',
        introduction,
        resources,
      };
    }
  }

  // 2. Parse from htmlDesc or mdDesc
  const rawDesc = rule.htmlDesc || rule.mdDesc || '';
  if (rawDesc) {
    // Check for explicit "Why is this an issue?" section
    const whyRegex = /<h[23][^>]*>\s*(?:Why is this an issue\??|Ask Yourself Whether)\s*<\/h[23]>([\s\S]*?)(?=<h[23]|$)/i;
    const whyMatch = rawDesc.match(whyRegex);
    if (whyMatch && whyMatch[1]) {
      rootCauseWhy = htmlToCleanText(whyMatch[1]);
    }

    // Check for "How to fix it" / "Compliant Solution" / "Noncompliant Code Example" / "Remediation"
    const fixRegex = /<h[23][^>]*>\s*(?:How to fix it|How can you fix it\??|Compliant Solution|Noncompliant Code Example|Recommended Secure Coding Practices|Remediation)\s*<\/h[23]>([\s\S]*)$/i;
    const fixMatch = rawDesc.match(fixRegex);
    if (fixMatch) {
      howToFix = htmlToCleanText(fixMatch[0]);
    }

    // Fallback if structured headings are not found in older rule formats
    if (!rootCauseWhy) {
      const splitAtFix = rawDesc.split(/<h[23][^>]*>\s*(?:How to fix|Compliant|Noncompliant|Exceptions)/i);
      if (splitAtFix.length > 1) {
        rootCauseWhy = htmlToCleanText(splitAtFix[0]);
        if (!howToFix) {
          howToFix = htmlToCleanText(rawDesc.slice(splitAtFix[0].length));
        }
      } else {
        rootCauseWhy = htmlToCleanText(rawDesc);
      }
    }
  }

  return {
    name,
    rootCauseWhy: rootCauseWhy || 'Refer to SonarQube rule description for detailed root cause analysis.',
    howToFix: howToFix || 'Refer to SonarQube rule remediation guidelines for code examples.',
    introduction,
    resources,
  };
}

/**
 * Enriches SonarQube issue using purely what SonarQube states,
 * avoiding any artificial comments or custom opinions.
 */
export function enrichIssueDetails(issue: {
  key: string;
  rule: string;
  ruleName?: string;
  message: string;
  severity: SonarSeverity;
  category: QualityCategory;
  component: string;
  line?: number;
  effort?: string;
  debt?: string;
  author?: string;
  vulnerabilityWhat?: string;
  codeSnippet?: string;
  rootCauseWhy?: string;
  howToFix?: string;
}): IssueEnrichment {
  const ruleName = issue.ruleName || '';
  const msg = issue.message || '';

  // 1. VULNERABILITY (WHAT) - Exactly what SonarQube states
  let vulnerabilityWhat = issue.vulnerabilityWhat || '';
  if (!vulnerabilityWhat) {
    if (ruleName && ruleName !== issue.rule && ruleName !== msg) {
      vulnerabilityWhat = `${ruleName}: ${msg}`;
    } else {
      vulnerabilityWhat = msg || ruleName || 'Issue identified by SonarQube static analysis';
    }
  }

  // 2. CODE SNIPPET - Use SonarQube source snippet if provided
  const codeSnippet = issue.codeSnippet || '';

  // 3. ROOT CAUSE (WHY) - Directly from SonarQube rule definition
  const rootCauseWhy = issue.rootCauseWhy || 'Refer to SonarQube rule documentation.';

  // 4. HOW TO FIX (REMEDIATION EXAMPLES) - Directly from SonarQube rule definition
  const howToFix = issue.howToFix || 'Refer to SonarQube rule remediation guidelines.';

  return {
    vulnerabilityWhat,
    codeSnippet,
    rootCauseWhy,
    howToFix,
  };
}
