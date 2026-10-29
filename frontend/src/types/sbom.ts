export interface LicenseRule {
  id: string;
  type: 'url' | 'package' | 'regex';
  pattern: string; // URL string, Package name, or Regex pattern
  version?: string; // Optional package version constraint
  targetType: 'id' | 'name';
  targetValue: string; // e.g. "MIT", "Apache-2.0", or "Microsoft Software License Terms"
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
  id: string; // Unique row key (name@version or bom-ref)
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
  resolutionRate: number; // percentage 0-100
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
