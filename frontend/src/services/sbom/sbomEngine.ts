import {
  LicenseRule,
  ResolutionMethod,
  ResolvedComponent,
  SbomResolutionResult,
  SbomResolutionStats,
} from '../../types/sbom';
import {
  EXACT_URL_MAPPINGS,
  PACKAGE_RULES,
  NAME_NORMALIZATION_MAP,
  matchUrlHeuristics,
} from './licenseDictionary';

export function isUnknownLicenseName(name?: string): boolean {
  if (!name) return false;
  const lower = name.toLowerCase().trim();
  return (
    lower.includes('unknown') ||
    lower === 'noassertion' ||
    lower === 'none' ||
    lower === 'not found' ||
    lower.includes('see url') ||
    lower.includes('unresolved')
  );
}

/**
 * Resolves a single license entry given component metadata and optional custom rules
 */
export function resolveLicenseEntry(
  compName: string,
  compVersion: string,
  entry: any,
  customRules: LicenseRule[] = []
): {
  resolvedLicense: any;
  method: ResolutionMethod;
  wasUnknown: boolean;
  originalText: string;
  originalUrl?: string;
} {
  const lic = entry.license || {};
  const originalName = lic.name || (typeof entry.expression === 'string' ? entry.expression : '');
  const originalSpdx = lic.id;
  const originalUrl = lic.url;
  const originalText = originalSpdx || originalName || originalUrl || 'No license specified';

  // If it already has a valid standardized SPDX ID and doesn't say "unknown", it's already valid
  if (originalSpdx && !isUnknownLicenseName(originalSpdx)) {
    return {
      resolvedLicense: lic,
      method: 'already_valid',
      wasUnknown: false,
      originalText,
      originalUrl,
    };
  }

  const isUnknown = isUnknownLicenseName(originalName) || !originalSpdx;

  // 1. Check user custom rules first (Highest Priority)
  for (const rule of customRules) {
    if (rule.type === 'url' && originalUrl && originalUrl.trim() === rule.pattern.trim()) {
      return {
        resolvedLicense: { [rule.targetType]: rule.targetValue, ...(originalUrl ? { url: originalUrl } : {}) },
        method: 'custom_rule',
        wasUnknown: isUnknown,
        originalText,
        originalUrl,
      };
    }
    if (rule.type === 'package') {
      const nameMatches = compName.toLowerCase() === rule.pattern.toLowerCase();
      const versionMatches = !rule.version || compVersion === rule.version;
      if (nameMatches && versionMatches) {
        return {
          resolvedLicense: { [rule.targetType]: rule.targetValue, ...(originalUrl ? { url: originalUrl } : {}) },
          method: 'custom_rule',
          wasUnknown: isUnknown,
          originalText,
          originalUrl,
        };
      }
    }
    if (rule.type === 'regex' && originalUrl) {
      try {
        const reg = new RegExp(rule.pattern, 'i');
        if (reg.test(originalUrl)) {
          return {
            resolvedLicense: { [rule.targetType]: rule.targetValue, ...(originalUrl ? { url: originalUrl } : {}) },
            method: 'custom_rule',
            wasUnknown: isUnknown,
            originalText,
            originalUrl,
          };
        }
      } catch {
        // Invalid regex ignore
      }
    }
  }

  // 2. Exact URL match from dictionary
  if (originalUrl && EXACT_URL_MAPPINGS[originalUrl.trim()]) {
    const match = EXACT_URL_MAPPINGS[originalUrl.trim()];
    return {
      resolvedLicense: { [match.type]: match.value, url: originalUrl },
      method: 'exact_url',
      wasUnknown: true,
      originalText,
      originalUrl,
    };
  }

  // 3. Heuristic Pattern match on URL
  if (originalUrl) {
    const heuristic = matchUrlHeuristics(originalUrl);
    if (heuristic) {
      return {
        resolvedLicense: { [heuristic.type]: heuristic.value, url: originalUrl },
        method: 'heuristic_pattern',
        wasUnknown: true,
        originalText,
        originalUrl,
      };
    }
  }

  // 4. Exact (package_name, version) and package_name fallback rules
  for (const rule of PACKAGE_RULES) {
    if (rule.type === 'package') {
      const nameMatches = compName.toLowerCase() === rule.pattern.toLowerCase();
      const versionMatches = !rule.version || compVersion === rule.version;
      if (nameMatches && versionMatches) {
        return {
          resolvedLicense: { [rule.targetType]: rule.targetValue, ...(originalUrl ? { url: originalUrl } : {}) },
          method: 'package_rule',
          wasUnknown: true,
          originalText,
          originalUrl,
        };
      }
    }
    if (rule.type === 'regex' && originalUrl) {
      try {
        const reg = new RegExp(rule.pattern, 'i');
        if (reg.test(originalUrl)) {
          return {
            resolvedLicense: { [rule.targetType]: rule.targetValue, ...(originalUrl ? { url: originalUrl } : {}) },
            method: 'package_rule',
            wasUnknown: true,
            originalText,
            originalUrl,
          };
        }
      } catch {
        // Ignore
      }
    }
  }

  // 5. Name normalization (if name is verbose e.g. "Apache License, Version 2.0" -> "Apache-2.0")
  if (originalName && !isUnknownLicenseName(originalName)) {
    const norm = NAME_NORMALIZATION_MAP[originalName.toLowerCase().trim()];
    if (norm) {
      return {
        resolvedLicense: { id: norm, ...(originalUrl ? { url: originalUrl } : {}) },
        method: 'name_normalization',
        wasUnknown: false,
        originalText,
        originalUrl,
      };
    }
  }

  // If already had a non-unknown name, treat as already recognized
  if (originalName && !isUnknownLicenseName(originalName)) {
    return {
      resolvedLicense: lic,
      method: 'already_valid',
      wasUnknown: false,
      originalText,
      originalUrl,
    };
  }

  // Unresolved
  return {
    resolvedLicense: lic,
    method: 'unresolved',
    wasUnknown: true,
    originalText,
    originalUrl,
  };
}

/**
 * Main General-Purpose SBOM License Resolver Engine
 * Accepts any CycloneDX JSON (1.2 - 1.6) or SPDX JSON, processes all components,
 * and outputs the patched SBOM structure, component table data, and compliance statistics.
 */
export function resolveSbom(
  rawJson: any,
  customRules: LicenseRule[] = []
): SbomResolutionResult {
  if (!rawJson || typeof rawJson !== 'object') {
    throw new Error('Invalid SBOM file: Input must be a valid JSON object.');
  }

  // Deep clone to avoid mutating input during processing
  const bom = JSON.parse(JSON.stringify(rawJson));

  let bomFormat: 'CycloneDX' | 'SPDX' | 'Custom' = 'Custom';
  if (bom.bomFormat === 'CycloneDX' || Array.isArray(bom.components)) {
    bomFormat = 'CycloneDX';
  } else if (bom.spdxVersion || Array.isArray(bom.packages)) {
    bomFormat = 'SPDX';
  }

  const resolvedComponents: ResolvedComponent[] = [];
  const licenseCounts: Record<string, number> = {};

  let alreadyValidCount = 0;
  let resolvedUnknownsCount = 0;
  let unresolvedCount = 0;

  // Handler for CycloneDX component
  const processCycloneComponent = (comp: any) => {
    const compName = comp.name || 'unnamed-component';
    const compVer = comp.version || '';
    const compId = comp['bom-ref'] || `${compName}@${compVer}`;

    const licenses = Array.isArray(comp.licenses) ? comp.licenses : [];

    if (licenses.length === 0) {
      // Check if externalReferences has a license URL
      let extLicenseUrl: string | undefined;
      if (Array.isArray(comp.externalReferences)) {
        const licRef = comp.externalReferences.find(
          (ref: any) => ref.type === 'license' || (ref.url && ref.url.includes('license'))
        );
        if (licRef && licRef.url) {
          extLicenseUrl = licRef.url;
        }
      }

      if (extLicenseUrl) {
        const dummyEntry = { license: { name: 'Unknown - See URL', url: extLicenseUrl } };
        const resolution = resolveLicenseEntry(compName, compVer, dummyEntry, customRules);
        if (resolution.method !== 'unresolved') {
          comp.licenses = [{ license: resolution.resolvedLicense }];
          resolvedUnknownsCount++;
          const finalSpdx = resolution.resolvedLicense.id || resolution.resolvedLicense.name;
          if (finalSpdx) {
            licenseCounts[finalSpdx] = (licenseCounts[finalSpdx] || 0) + 1;
          }
          resolvedComponents.push({
            id: compId,
            bomRef: comp['bom-ref'],
            name: compName,
            version: compVer,
            group: comp.group,
            purl: comp.purl,
            type: comp.type,
            originalLicenseText: 'None (URL in externalReferences)',
            originalLicenseUrl: extLicenseUrl,
            resolvedSpdxId: resolution.resolvedLicense.id,
            resolvedLicenseName: resolution.resolvedLicense.name,
            method: resolution.method,
            isResolved: true,
            wasUnknown: true,
          });
          return;
        }
      }

      // Truly missing license
      unresolvedCount++;
      resolvedComponents.push({
        id: compId,
        bomRef: comp['bom-ref'],
        name: compName,
        version: compVer,
        group: comp.group,
        purl: comp.purl,
        type: comp.type,
        originalLicenseText: 'No license declared',
        method: 'unresolved',
        isResolved: false,
        wasUnknown: true,
      });
      return;
    }

    // Process each license entry in component
    for (let i = 0; i < licenses.length; i++) {
      const entry = licenses[i];
      const resolution = resolveLicenseEntry(compName, compVer, entry, customRules);

      if (resolution.method === 'already_valid' || resolution.method === 'name_normalization') {
        alreadyValidCount++;
      } else if (resolution.method === 'unresolved') {
        unresolvedCount++;
      } else {
        // Resolved from unknown!
        resolvedUnknownsCount++;
        entry.license = resolution.resolvedLicense;
        delete entry.expression;
      }

      const spdxId = resolution.resolvedLicense?.id;
      const licName = resolution.resolvedLicense?.name || resolution.originalText;
      const primaryKey = spdxId || licName;
      if (primaryKey && resolution.method !== 'unresolved') {
        licenseCounts[primaryKey] = (licenseCounts[primaryKey] || 0) + 1;
      }

      resolvedComponents.push({
        id: `${compId}-lic-${i}`,
        bomRef: comp['bom-ref'],
        name: compName,
        version: compVer,
        group: comp.group,
        purl: comp.purl,
        type: comp.type,
        originalLicenseText: resolution.originalText,
        originalLicenseUrl: resolution.originalUrl,
        resolvedSpdxId: spdxId,
        resolvedLicenseName: licName,
        method: resolution.method,
        isResolved: resolution.method !== 'unresolved',
        wasUnknown: resolution.wasUnknown,
      });
    }

    // Process nested components if present in CycloneDX
    if (Array.isArray(comp.components)) {
      comp.components.forEach(processCycloneComponent);
    }
  };

  if (bomFormat === 'CycloneDX' && Array.isArray(bom.components)) {
    bom.components.forEach(processCycloneComponent);
  } else if (bomFormat === 'SPDX' && Array.isArray(bom.packages)) {
    // SPDX packages
    for (const pkg of bom.packages) {
      const compName = pkg.name || 'unnamed-package';
      const compVer = pkg.versionInfo || '';
      const declaredLic = pkg.licenseDeclared || pkg.licenseConcluded || 'NOASSERTION';
      const dummyEntry = {
        license: {
          name: declaredLic,
          url: pkg.homepage || pkg.downloadLocation,
        },
      };

      const resolution = resolveLicenseEntry(compName, compVer, dummyEntry, customRules);
      if (resolution.method === 'already_valid' || resolution.method === 'name_normalization') {
        alreadyValidCount++;
      } else if (resolution.method === 'unresolved') {
        unresolvedCount++;
      } else {
        resolvedUnknownsCount++;
        if (resolution.resolvedLicense?.id) {
          pkg.licenseConcluded = resolution.resolvedLicense.id;
          pkg.licenseDeclared = resolution.resolvedLicense.id;
        }
      }

      const spdx = resolution.resolvedLicense?.id || resolution.resolvedLicense?.name;
      if (spdx && resolution.method !== 'unresolved') {
        licenseCounts[spdx] = (licenseCounts[spdx] || 0) + 1;
      }

      resolvedComponents.push({
        id: pkg.SPDXID || `${compName}@${compVer}`,
        name: compName,
        version: compVer,
        originalLicenseText: declaredLic,
        originalLicenseUrl: dummyEntry.license.url,
        resolvedSpdxId: resolution.resolvedLicense?.id,
        resolvedLicenseName: resolution.resolvedLicense?.name,
        method: resolution.method,
        isResolved: resolution.method !== 'unresolved',
        wasUnknown: resolution.wasUnknown,
      });
    }
  }

  const totalComponents = resolvedComponents.length;
  const compliantTotal = alreadyValidCount + resolvedUnknownsCount;
  const resolutionRate = totalComponents > 0 ? (compliantTotal / totalComponents) * 100 : 100;

  // Top licenses sorted by frequency
  const topLicenses = Object.entries(licenseCounts)
    .map(([spdx, count]) => ({ spdx, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const stats: SbomResolutionStats = {
    totalComponents,
    totalLicenseEntries: totalComponents,
    alreadyValid: alreadyValidCount,
    resolvedUnknowns: resolvedUnknownsCount,
    unresolved: unresolvedCount,
    resolutionRate: Math.round(resolutionRate * 10) / 10,
    topLicenses,
  };

  return {
    bomFormat,
    specVersion: bom.specVersion || bom.spdxVersion,
    serialNumber: bom.serialNumber,
    metadata: bom.metadata,
    components: resolvedComponents,
    resolvedBom: bom,
    stats,
  };
}
