export interface LicenseRule {
  id: string;
  type: 'url' | 'package' | 'regex';
  pattern: string;
  version?: string;
  targetType: 'id' | 'name';
  targetValue: string;
  description?: string;
  isCustom?: boolean;
}

export type ResolutionMethod =
  | 'already_valid'
  | 'custom_rule'
  | 'exact_url'
  | 'heuristic_pattern'
  | 'name_normalization'
  | 'package_rule'
  | 'manual_override'
  | 'unresolved';

export interface ResolvedComponent {
  id: string;
  bomRef?: string;
  name: string;
  version: string;
  group?: string;
  purl?: string;
  type?: string;
  originalLicenseText: string;
  originalLicenseUrl?: string;
  resolvedSpdxId?: string;
  resolvedLicenseName?: string;
  method: ResolutionMethod;
  isResolved: boolean;
  wasUnknown: boolean;
}

export interface SbomResolutionStats {
  totalComponents: number;
  totalLicenseEntries: number;
  alreadyValid: number;
  resolvedUnknowns: number;
  unresolved: number;
  resolutionRate: number;
  topLicenses: { spdx: string; count: number }[];
}

export interface SbomResolutionResult {
  bomFormat: 'CycloneDX' | 'SPDX' | 'Custom';
  specVersion?: string;
  serialNumber?: string;
  metadata?: any;
  components: ResolvedComponent[];
  resolvedBom: any;
  stats: SbomResolutionStats;
}

export const EXACT_URL_MAPPINGS: Record<string, { type: 'id' | 'name'; value: string }> = {
  // Apache-2.0
  'https://raw.githubusercontent.com/aspnet/AspNetCore/2.0.0/LICENSE.txt': { type: 'id', value: 'Apache-2.0' },
  'https://raw.githubusercontent.com/aspnet/AspNetKatana/v4.0.1/LICENSE.txt': { type: 'id', value: 'Apache-2.0' },
  'https://raw.githubusercontent.com/aspnet/Home/2.0.0/LICENSE.txt': { type: 'id', value: 'Apache-2.0' },
  'http://www.apache.org/licenses/LICENSE-2.0': { type: 'id', value: 'Apache-2.0' },
  'https://www.apache.org/licenses/LICENSE-2.0': { type: 'id', value: 'Apache-2.0' },
  'http://www.apache.org/licenses/LICENSE-2.0.html': { type: 'id', value: 'Apache-2.0' },
  'https://www.apache.org/licenses/LICENSE-2.0.html': { type: 'id', value: 'Apache-2.0' },
  'http://opensource.org/licenses/Apache-2.0': { type: 'id', value: 'Apache-2.0' },
  'https://opensource.org/licenses/Apache-2.0': { type: 'id', value: 'Apache-2.0' },
  'https://github.com/imperugo/StackExchange.Redis.Extensions/blob/master/LICENSE': { type: 'id', value: 'Apache-2.0' },
  'http://bundletransformer.codeplex.com/license': { type: 'id', value: 'Apache-2.0' },
  'https://github.com/owin-contrib/owin-hosting/blob/master/LICENSE.txt': { type: 'id', value: 'Apache-2.0' },

  // MIT
  'https://github.com/dotnet/corefx/blob/master/LICENSE.TXT': { type: 'id', value: 'MIT' },
  'https://github.com/dotnet/core-setup/blob/master/LICENSE.TXT': { type: 'id', value: 'MIT' },
  'https://github.com/AzureAD/azure-activedirectory-identitymodel-extensions-for-dotnet/blob/master/LICENSE.txt': { type: 'id', value: 'MIT' },
  'http://www.opensource.org/licenses/mit-license.php': { type: 'id', value: 'MIT' },
  'https://www.opensource.org/licenses/mit-license.php': { type: 'id', value: 'MIT' },
  'http://opensource.org/licenses/MIT': { type: 'id', value: 'MIT' },
  'https://opensource.org/licenses/MIT': { type: 'id', value: 'MIT' },
  'https://licenses.nuget.org/MIT': { type: 'id', value: 'MIT' },
  'http://jquery.org/license': { type: 'id', value: 'MIT' },
  'https://raw.github.com/JamesNK/Newtonsoft.Json/master/LICENSE.md': { type: 'id', value: 'MIT' },
  'https://raw.githubusercontent.com/JamesNK/Newtonsoft.Json/master/LICENSE.md': { type: 'id', value: 'MIT' },
  'https://raw.github.com/StackExchange/StackExchange.Redis/master/LICENSE': { type: 'id', value: 'MIT' },
  'https://github.com/AutoMapper/AutoMapper/blob/master/LICENSE.txt': { type: 'id', value: 'MIT' },
  'https://github.com/madskristensen/BundlerMinifier/blob/master/LICENSE': { type: 'id', value: 'MIT' },
  'https://github.com/zzzprojects/html-agility-pack/blob/master/LICENSE': { type: 'id', value: 'MIT' },
  'https://github.com/trentrichardson/jQuery-Timepicker-Addon/blob/master/LICENSE-MIT': { type: 'id', value: 'MIT' },
  'https://github.com/clarkis117/Mime-Detective/blob/master/LICENSE': { type: 'id', value: 'MIT' },
  'http://www.modernizr.com/license/': { type: 'id', value: 'MIT' },
  'https://raw.github.com/timrwood/moment/master/LICENSE': { type: 'id', value: 'MIT' },
  'http://github.com/sstephenson/prototype/raw/master/LICENSE': { type: 'id', value: 'MIT' },
  'https://github.com/select2/select2/blob/master/LICENSE.md': { type: 'id', value: 'MIT' },
  'https://github.com/mattfrear/Swashbuckle.Examples/blob/master/LICENSE': { type: 'id', value: 'MIT' },
  'https://github.com/bzinchenko/bpmnview/blob/master/LICENSE': { type: 'id', value: 'MIT' },
  'http://www.bouncycastle.org/licence.html': { type: 'id', value: 'MIT' },
  'https://www.bouncycastle.org/csharp/licence.html': { type: 'id', value: 'MIT' },

  // BSD-3-Clause
  'https://github.com/NLog/NLog/blob/master/LICENSE.txt': { type: 'id', value: 'BSD-3-Clause' },
  'http://raw.github.com/NLog/NLog/master/LICENSE.txt': { type: 'id', value: 'BSD-3-Clause' },
  'http://opensource.org/licenses/BSD-3-Clause': { type: 'id', value: 'BSD-3-Clause' },
  'https://opensource.org/licenses/BSD-3-Clause': { type: 'id', value: 'BSD-3-Clause' },
  'http://www.antlr3.org/license.html': { type: 'id', value: 'BSD-3-Clause' },
  'https://github.com/Antaris/RazorEngine/blob/master/LICENSE.md': { type: 'id', value: 'BSD-3-Clause' },

  // AGPL
  'https://www.gnu.org/licenses/agpl.html': { type: 'id', value: 'AGPL-3.0-only' },
  'http://www.gnu.org/licenses/agpl.html': { type: 'id', value: 'AGPL-3.0-only' },

  // Font
  'http://fontawesome.io/license/': { type: 'id', value: 'OFL-1.1' },

  // MS-PL
  'http://wpl.codeplex.com/license': { type: 'id', value: 'MS-PL' },

  // Microsoft Proprietary
  'http://go.microsoft.com/fwlink/?LinkId=329770': { type: 'name', value: 'Microsoft Software License Terms - Microsoft .NET Library' },
  'http://go.microsoft.com/fwlink/?LinkId=529443': { type: 'name', value: 'Microsoft Software License Terms - Microsoft .NET Library' },
  'http://go.microsoft.com/fwlink/?LinkID=214339': { type: 'name', value: 'Microsoft Software License Terms - Microsoft Web Infrastructure' },
  'http://www.microsoft.com/web/webpi/eula/net_library_eula_ENU.htm': { type: 'name', value: 'Microsoft Software License Terms - Microsoft .NET Library' },
  'http://www.microsoft.com/web/webpi/eula/net_library_eula_enu.htm': { type: 'name', value: 'Microsoft Software License Terms - Microsoft .NET Library' },
  'http://www.microsoft.com/web/webpi/eula/aspnetcomponent_rtw_enu.htm': { type: 'name', value: 'Microsoft Software License Terms - Microsoft ASP.NET Component' },
  'http://www.microsoft.com/web/webpi/eula/aspnetcomponent_rtw_ENU.htm': { type: 'name', value: 'Microsoft Software License Terms - Microsoft ASP.NET Component' },
  'https://webpifeed.blob.core.windows.net/webpifeed/eula/net_library_eula_enu.htm': { type: 'name', value: 'Microsoft Software License Terms - Microsoft .NET Library' },

  // EULAs
  'https://company.aspose.com/legal/eula': { type: 'name', value: 'Aspose EULA' },
  'http://www.hiqpdf.com/SoftwareLicenseAgreeement.aspx': { type: 'name', value: 'HiQPdf Software License Agreement' },
  'https://www.oracle.com/downloads/licenses/distribution-license.html': { type: 'name', value: 'Oracle Free Distribution License' },
};

export const PACKAGE_RULES: LicenseRule[] = [
  {
    id: 'pkg-owin-jwt-401',
    type: 'package',
    pattern: 'Microsoft.Owin.Security.Jwt',
    version: '4.0.1',
    targetType: 'id',
    targetValue: 'Apache-2.0',
  },
  {
    id: 'pkg-owin-jwt',
    type: 'package',
    pattern: 'Microsoft.Owin.Security.Jwt',
    targetType: 'id',
    targetValue: 'Apache-2.0',
  },
];

export function isUnknownLicenseName(name?: string): boolean {
  if (!name) return false;
  const lower = name.toLowerCase().trim();
  return lower.includes('unknown') || lower === 'noassertion' || lower.includes('see url');
}

export function resolveBackendSbom(rawJson: any, customRules: LicenseRule[] = []): SbomResolutionResult {
  const bom = JSON.parse(JSON.stringify(rawJson));
  const resolvedComponents: ResolvedComponent[] = [];
  const licenseCounts: Record<string, number> = {};

  let alreadyValid = 0;
  let resolvedUnknowns = 0;
  let unresolved = 0;

  const processComp = (comp: any) => {
    const compName = comp.name || 'unnamed-component';
    const compVer = comp.version || '';
    const compId = comp['bom-ref'] || `${compName}@${compVer}`;
    const licenses = Array.isArray(comp.licenses) ? comp.licenses : [];

    for (let i = 0; i < licenses.length; i++) {
      const entry = licenses[i];
      const lic = entry.license || {};
      const origName = lic.name || (typeof entry.expression === 'string' ? entry.expression : '');
      const origSpdx = lic.id;
      const origUrl = lic.url;
      const origText = origSpdx || origName || origUrl || 'No license specified';

      if (origSpdx && !isUnknownLicenseName(origSpdx)) {
        alreadyValid++;
        resolvedComponents.push({
          id: `${compId}-${i}`,
          name: compName,
          version: compVer,
          originalLicenseText: origText,
          originalLicenseUrl: origUrl,
          resolvedSpdxId: origSpdx,
          method: 'already_valid',
          isResolved: true,
          wasUnknown: false,
        });
        continue;
      }

      let resolved: any = null;
      let method: ResolutionMethod = 'unresolved';

      // 0. Check custom rules
      for (const cr of customRules) {
        if (cr.type === 'url' && origUrl && origUrl.trim() === cr.pattern.trim()) {
          resolved = { [cr.targetType]: cr.targetValue, ...(origUrl ? { url: origUrl } : {}) };
          method = 'custom_rule';
          break;
        }
        if (cr.type === 'package' && compName.toLowerCase() === cr.pattern.toLowerCase()) {
          resolved = { [cr.targetType]: cr.targetValue, ...(origUrl ? { url: origUrl } : {}) };
          method = 'custom_rule';
          break;
        }
      }

      // 1. Exact URL
      if (!resolved && origUrl && EXACT_URL_MAPPINGS[origUrl.trim()]) {
        const m = EXACT_URL_MAPPINGS[origUrl.trim()];
        resolved = { [m.type]: m.value, url: origUrl };
        method = 'exact_url';
      } else if (origUrl && origUrl.includes('aspnet/AspNetKatana')) {
        resolved = { id: 'Apache-2.0', url: origUrl };
        method = 'heuristic_pattern';
      } else {
        // Package check
        for (const pr of PACKAGE_RULES) {
          if (compName.toLowerCase() === pr.pattern.toLowerCase()) {
            resolved = { [pr.targetType]: pr.targetValue, ...(origUrl ? { url: origUrl } : {}) };
            method = 'package_rule';
            break;
          }
        }
      }

      if (resolved) {
        resolvedUnknowns++;
        entry.license = resolved;
        delete entry.expression;
        const spdx = resolved.id || resolved.name;
        if (spdx) licenseCounts[spdx] = (licenseCounts[spdx] || 0) + 1;

        resolvedComponents.push({
          id: `${compId}-${i}`,
          name: compName,
          version: compVer,
          originalLicenseText: origText,
          originalLicenseUrl: origUrl,
          resolvedSpdxId: resolved.id,
          resolvedLicenseName: resolved.name,
          method,
          isResolved: true,
          wasUnknown: true,
        });
      } else {
        unresolved++;
        resolvedComponents.push({
          id: `${compId}-${i}`,
          name: compName,
          version: compVer,
          originalLicenseText: origText,
          originalLicenseUrl: origUrl,
          method: 'unresolved',
          isResolved: false,
          wasUnknown: true,
        });
      }
    }

    if (Array.isArray(comp.components)) {
      comp.components.forEach(processComp);
    }
  };

  if (Array.isArray(bom.components)) {
    bom.components.forEach(processComp);
  }

  const totalComponents = resolvedComponents.length;
  const compliantTotal = alreadyValid + resolvedUnknowns;
  const resolutionRate = totalComponents > 0 ? (compliantTotal / totalComponents) * 100 : 100;

  const topLicenses = Object.entries(licenseCounts)
    .map(([spdx, count]) => ({ spdx, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return {
    bomFormat: 'CycloneDX',
    specVersion: bom.specVersion,
    serialNumber: bom.serialNumber,
    metadata: bom.metadata,
    components: resolvedComponents,
    resolvedBom: bom,
    stats: {
      totalComponents,
      totalLicenseEntries: totalComponents,
      alreadyValid,
      resolvedUnknowns,
      unresolved,
      resolutionRate: Math.round(resolutionRate * 10) / 10,
      topLicenses,
    },
  };
}
