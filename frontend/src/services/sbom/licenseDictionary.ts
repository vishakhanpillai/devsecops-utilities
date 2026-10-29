import { LicenseRule } from '../../types/sbom';

/**
 * Built-in exact URL to SPDX ID / License Name mappings
 * Combines legacy NuGet license URLs and standard open-source URLs
 */
export const EXACT_URL_MAPPINGS: Record<string, { type: 'id' | 'name'; value: string }> = {
  // --- Apache-2.0 ---
  'https://raw.githubusercontent.com/aspnet/AspNetCore/2.0.0/LICENSE.txt': { type: 'id', value: 'Apache-2.0' },
  'https://raw.githubusercontent.com/aspnet/AspNetKatana/v4.0.1/LICENSE.txt': { type: 'id', value: 'Apache-2.0' },
  'https://raw.githubusercontent.com/aspnet/Home/2.0.0/LICENSE.txt': { type: 'id', value: 'Apache-2.0' },
  'http://www.apache.org/licenses/LICENSE-2.0': { type: 'id', value: 'Apache-2.0' },
  'https://www.apache.org/licenses/LICENSE-2.0': { type: 'id', value: 'Apache-2.0' },
  'http://www.apache.org/licenses/LICENSE-2.0.html': { type: 'id', value: 'Apache-2.0' },
  'https://www.apache.org/licenses/LICENSE-2.0.html': { type: 'id', value: 'Apache-2.0' },
  'http://www.apache.org/licenses/LICENSE-2.0.txt': { type: 'id', value: 'Apache-2.0' },
  'https://www.apache.org/licenses/LICENSE-2.0.txt': { type: 'id', value: 'Apache-2.0' },
  'http://opensource.org/licenses/Apache-2.0': { type: 'id', value: 'Apache-2.0' },
  'https://opensource.org/licenses/Apache-2.0': { type: 'id', value: 'Apache-2.0' },
  'https://github.com/imperugo/StackExchange.Redis.Extensions/blob/master/LICENSE': { type: 'id', value: 'Apache-2.0' },
  'http://bundletransformer.codeplex.com/license': { type: 'id', value: 'Apache-2.0' },
  'https://github.com/owin-contrib/owin-hosting/blob/master/LICENSE.txt': { type: 'id', value: 'Apache-2.0' },

  // --- MIT ---
  'https://github.com/dotnet/corefx/blob/master/LICENSE.TXT': { type: 'id', value: 'MIT' },
  'https://github.com/dotnet/core-setup/blob/master/LICENSE.TXT': { type: 'id', value: 'MIT' },
  'https://github.com/AzureAD/azure-activedirectory-identitymodel-extensions-for-dotnet/blob/master/LICENSE.txt': { type: 'id', value: 'MIT' },
  'http://www.opensource.org/licenses/mit-license.php': { type: 'id', value: 'MIT' },
  'https://www.opensource.org/licenses/mit-license.php': { type: 'id', value: 'MIT' },
  'http://opensource.org/licenses/MIT': { type: 'id', value: 'MIT' },
  'https://opensource.org/licenses/MIT': { type: 'id', value: 'MIT' },
  'https://licenses.nuget.org/MIT': { type: 'id', value: 'MIT' },
  'http://jquery.org/license': { type: 'id', value: 'MIT' },
  'https://jquery.org/license': { type: 'id', value: 'MIT' },
  'https://raw.github.com/JamesNK/Newtonsoft.Json/master/LICENSE.md': { type: 'id', value: 'MIT' },
  'https://raw.githubusercontent.com/JamesNK/Newtonsoft.Json/master/LICENSE.md': { type: 'id', value: 'MIT' },
  'https://raw.github.com/StackExchange/StackExchange.Redis/master/LICENSE': { type: 'id', value: 'MIT' },
  'https://raw.githubusercontent.com/StackExchange/StackExchange.Redis/master/LICENSE': { type: 'id', value: 'MIT' },
  'https://github.com/AutoMapper/AutoMapper/blob/master/LICENSE.txt': { type: 'id', value: 'MIT' },
  'https://github.com/madskristensen/BundlerMinifier/blob/master/LICENSE': { type: 'id', value: 'MIT' },
  'https://github.com/zzzprojects/html-agility-pack/blob/master/LICENSE': { type: 'id', value: 'MIT' },
  'https://github.com/trentrichardson/jQuery-Timepicker-Addon/blob/master/LICENSE-MIT': { type: 'id', value: 'MIT' },
  'https://github.com/clarkis117/Mime-Detective/blob/master/LICENSE': { type: 'id', value: 'MIT' },
  'http://www.modernizr.com/license/': { type: 'id', value: 'MIT' },
  'https://www.modernizr.com/license/': { type: 'id', value: 'MIT' },
  'https://raw.github.com/timrwood/moment/master/LICENSE': { type: 'id', value: 'MIT' },
  'http://github.com/sstephenson/prototype/raw/master/LICENSE': { type: 'id', value: 'MIT' },
  'https://github.com/select2/select2/blob/master/LICENSE.md': { type: 'id', value: 'MIT' },
  'https://github.com/mattfrear/Swashbuckle.Examples/blob/master/LICENSE': { type: 'id', value: 'MIT' },
  'https://github.com/bzinchenko/bpmnview/blob/master/LICENSE': { type: 'id', value: 'MIT' },
  'http://www.bouncycastle.org/licence.html': { type: 'id', value: 'MIT' },
  'https://www.bouncycastle.org/licence.html': { type: 'id', value: 'MIT' },
  'https://www.bouncycastle.org/csharp/licence.html': { type: 'id', value: 'MIT' },

  // --- BSD-3-Clause ---
  'https://github.com/NLog/NLog/blob/master/LICENSE.txt': { type: 'id', value: 'BSD-3-Clause' },
  'http://raw.github.com/NLog/NLog/master/LICENSE.txt': { type: 'id', value: 'BSD-3-Clause' },
  'http://opensource.org/licenses/BSD-3-Clause': { type: 'id', value: 'BSD-3-Clause' },
  'https://opensource.org/licenses/BSD-3-Clause': { type: 'id', value: 'BSD-3-Clause' },
  'http://www.opensource.org/licenses/bsd-license.php': { type: 'id', value: 'BSD-3-Clause' },
  'https://www.opensource.org/licenses/bsd-license.php': { type: 'id', value: 'BSD-3-Clause' },
  'http://www.antlr3.org/license.html': { type: 'id', value: 'BSD-3-Clause' },
  'https://github.com/Antaris/RazorEngine/blob/master/LICENSE.md': { type: 'id', value: 'BSD-3-Clause' },

  // --- BSD-2-Clause ---
  'http://opensource.org/licenses/BSD-2-Clause': { type: 'id', value: 'BSD-2-Clause' },
  'https://opensource.org/licenses/BSD-2-Clause': { type: 'id', value: 'BSD-2-Clause' },

  // --- ISC ---
  'http://opensource.org/licenses/ISC': { type: 'id', value: 'ISC' },
  'https://opensource.org/licenses/ISC': { type: 'id', value: 'ISC' },

  // --- AGPL-3.0-only / GPL ---
  'https://www.gnu.org/licenses/agpl.html': { type: 'id', value: 'AGPL-3.0-only' },
  'http://www.gnu.org/licenses/agpl.html': { type: 'id', value: 'AGPL-3.0-only' },
  'https://www.gnu.org/licenses/gpl-3.0.html': { type: 'id', value: 'GPL-3.0-only' },
  'http://www.gnu.org/licenses/gpl-3.0.html': { type: 'id', value: 'GPL-3.0-only' },

  // --- Typography / Font ---
  'http://fontawesome.io/license/': { type: 'id', value: 'OFL-1.1' },
  'https://fontawesome.com/license/free': { type: 'id', value: 'OFL-1.1' },

  // --- Microsoft Public License ---
  'http://wpl.codeplex.com/license': { type: 'id', value: 'MS-PL' },
  'https://opensource.org/licenses/MS-PL': { type: 'id', value: 'MS-PL' },

  // --- Microsoft Proprietary / EULA ---
  'http://go.microsoft.com/fwlink/?LinkId=329770': { type: 'name', value: 'Microsoft Software License Terms - Microsoft .NET Library' },
  'http://go.microsoft.com/fwlink/?LinkId=529443': { type: 'name', value: 'Microsoft Software License Terms - Microsoft .NET Library' },
  'http://go.microsoft.com/fwlink/?LinkID=214339': { type: 'name', value: 'Microsoft Software License Terms - Microsoft Web Infrastructure' },
  'http://www.microsoft.com/web/webpi/eula/net_library_eula_ENU.htm': { type: 'name', value: 'Microsoft Software License Terms - Microsoft .NET Library' },
  'http://www.microsoft.com/web/webpi/eula/net_library_eula_enu.htm': { type: 'name', value: 'Microsoft Software License Terms - Microsoft .NET Library' },
  'http://www.microsoft.com/web/webpi/eula/aspnetcomponent_rtw_enu.htm': { type: 'name', value: 'Microsoft Software License Terms - Microsoft ASP.NET Component' },
  'http://www.microsoft.com/web/webpi/eula/aspnetcomponent_rtw_ENU.htm': { type: 'name', value: 'Microsoft Software License Terms - Microsoft ASP.NET Component' },
  'https://webpifeed.blob.core.windows.net/webpifeed/eula/net_library_eula_enu.htm': { type: 'name', value: 'Microsoft Software License Terms - Microsoft .NET Library' },

  // --- Commercial / Third-Party EULAs ---
  'https://company.aspose.com/legal/eula': { type: 'name', value: 'Aspose EULA' },
  'http://www.hiqpdf.com/SoftwareLicenseAgreeement.aspx': { type: 'name', value: 'HiQPdf Software License Agreement' },
  'https://www.oracle.com/downloads/licenses/distribution-license.html': { type: 'name', value: 'Oracle Free Distribution License' },
};

/**
 * Exact Package Name & Version / Package Name rules
 */
export const PACKAGE_RULES: LicenseRule[] = [
  {
    id: 'pkg-owin-jwt-401',
    type: 'package',
    pattern: 'Microsoft.Owin.Security.Jwt',
    version: '4.0.1',
    targetType: 'id',
    targetValue: 'Apache-2.0',
    description: 'Microsoft OWIN Security JWT 4.0.1 Apache 2.0 license',
  },
  {
    id: 'pkg-owin-jwt',
    type: 'package',
    pattern: 'Microsoft.Owin.Security.Jwt',
    targetType: 'id',
    targetValue: 'Apache-2.0',
    description: 'Microsoft OWIN Security JWT Apache 2.0 license',
  },
  {
    id: 'pkg-aspnet-katana',
    type: 'regex',
    pattern: 'aspnet/AspNetKatana',
    targetType: 'id',
    targetValue: 'Apache-2.0',
    description: 'AspNetKatana repository licenses',
  },
];

/**
 * Standard text name to SPDX ID normalizations
 * Resolves verbose names like "Apache License 2.0" to standard "Apache-2.0"
 */
export const NAME_NORMALIZATION_MAP: Record<string, string> = {
  'apache 2.0': 'Apache-2.0',
  'apache-2.0': 'Apache-2.0',
  'apache 2': 'Apache-2.0',
  'apache license 2.0': 'Apache-2.0',
  'apache license, version 2.0': 'Apache-2.0',
  'the apache software license, version 2.0': 'Apache-2.0',
  'apache software license - version 2.0': 'Apache-2.0',
  'mit': 'MIT',
  'the mit license': 'MIT',
  'the mit license (mit)': 'MIT',
  'mit license': 'MIT',
  'bsd 3-clause': 'BSD-3-Clause',
  'bsd-3-clause': 'BSD-3-Clause',
  'bsd 3-clause "new" or "revised" license': 'BSD-3-Clause',
  'bsd 2-clause': 'BSD-2-Clause',
  'bsd-2-clause': 'BSD-2-Clause',
  'bsd 2-clause "simplified" license': 'BSD-2-Clause',
  'isc': 'ISC',
  'isc license': 'ISC',
  'isc license (isc)': 'ISC',
  'gnu general public license v3.0': 'GPL-3.0-only',
  'gpl-3.0': 'GPL-3.0-only',
  'gplv3': 'GPL-3.0-only',
  'mozilla public license 2.0': 'MPL-2.0',
  'mpl-2.0': 'MPL-2.0',
  'microsoft public license': 'MS-PL',
  'ms-pl': 'MS-PL',
  'unlicense': 'Unlicense',
  'the unlicense': 'Unlicense',
};

/**
 * Heuristic URL Pattern Matchers
 */
export function matchUrlHeuristics(url: string): { type: 'id' | 'name'; value: string } | null {
  if (!url) return null;
  const cleanUrl = url.trim();

  // nuget.org direct SPDX url: https://licenses.nuget.org/MIT
  const nugetMatch = cleanUrl.match(/licenses\.nuget\.org\/([A-Za-z0-9\.\-]+)/i);
  if (nugetMatch && nugetMatch[1]) {
    return { type: 'id', value: nugetMatch[1] };
  }

  // spdx.org direct license url: https://spdx.org/licenses/MIT.html
  const spdxMatch = cleanUrl.match(/spdx\.org\/licenses\/([A-Za-z0-9\.\-]+)(\.html)?/i);
  if (spdxMatch && spdxMatch[1]) {
    return { type: 'id', value: spdxMatch[1] };
  }

  // opensource.org/licenses/MIT or /Apache-2.0
  const osiMatch = cleanUrl.match(/opensource\.org\/licenses\/([A-Za-z0-9\.\-]+)(\.php)?/i);
  if (osiMatch && osiMatch[1]) {
    const rawId = osiMatch[1].replace(/\.php$/i, '');
    const normalized = NAME_NORMALIZATION_MAP[rawId.toLowerCase()] || rawId;
    return { type: 'id', value: normalized };
  }

  // AspNetKatana repository
  if (cleanUrl.includes('aspnet/AspNetKatana')) {
    return { type: 'id', value: 'Apache-2.0' };
  }

  // BotDetect CAPTCHA agreement
  if (cleanUrl.includes('botdetect-license.html')) {
    return { type: 'name', value: 'BotDetect CAPTCHA License Agreement' };
  }

  // GitHub LICENSE file endings with specific license names
  if (/github\.com\/.*\/LICENSE-MIT(\.txt|\.md)?$/i.test(cleanUrl) || cleanUrl.endsWith('/LICENSE-MIT')) {
    return { type: 'id', value: 'MIT' };
  }
  if (/github\.com\/.*\/LICENSE-APACHE(\.txt|\.md)?$/i.test(cleanUrl) || cleanUrl.endsWith('/LICENSE-APACHE')) {
    return { type: 'id', value: 'Apache-2.0' };
  }

  // Generic apache.org /licenses/LICENSE-2.0
  if (cleanUrl.includes('apache.org/licenses/LICENSE-2.0')) {
    return { type: 'id', value: 'Apache-2.0' };
  }

  return null;
}
