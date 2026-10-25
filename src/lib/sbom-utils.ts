/**
 * SBOM Parsing Utilities
 * Shared logic for parsing SBOM data from various formats (CycloneDX, SPDX, Trivy JSON)
 */

interface TrivyPackage {
  License?: string;
  Licenses?: string[];
  Name: string;
  Version: string;
}

interface TrivyResult {
  Packages?: TrivyPackage[];
  Type?: string;
}

interface CycloneDXLicense {
  expression?: string;
  license?: {
    id?: string;
    name?: string;
  };
}

interface CycloneDXComponent {
  licenses?: CycloneDXLicense[];
  name: string;
  type?: string;
  version?: string;
}

interface SPDXPackage {
  licenseConcluded?: string;
  name: string;
  versionInfo?: string;
}

interface SBOMData {
  bomFormat?: string;
  components?: CycloneDXComponent[];
  packages?: SPDXPackage[];
  Results?: TrivyResult[];
  SchemaVersion?: string;
  spdxVersion?: string;
}

export interface SBOMPackage {
  license: string;
  name: string;
  risk: string;
  source?: string;
  type?: string;
  version: string;
}

/**
 * Detect the SBOM format from the data structure
 */
export const detectFormat = (data: SBOMData): string => {
  if (data.bomFormat === "CycloneDX") return "CycloneDX";
  if (data.spdxVersion) return "SPDX";
  if (data.SchemaVersion && data.Results) return "Trivy JSON";
  return "Unknown JSON";
};

/**
 * Calculate legal risk based on license type
 * High: Strong copyleft (GPL, AGPL)
 * Medium: Weak copyleft (LGPL, MPL, EPL)
 * Low: Permissive (MIT, Apache, BSD)
 * Unknown: Cannot determine
 */
export const getLegalRisk = (license: string): string => {
  if (!license || license === "N/A" || license === "Unknown") return "Unknown";

  const upper = license.toUpperCase();

  // High Risk (Copyleft)
  if (upper.includes("GPL") || upper.includes("AGPL") || upper.includes("SLEEPYCAT") || upper.includes("WTFPL")) {
    if (upper.includes("LGPL")) return "Medium";
    return "High";
  }

  // Medium Risk (Weak Copyleft)
  if (
    upper.includes("MPL") ||
    upper.includes("LGPL") ||
    upper.includes("EPL") ||
    upper.includes("CDDL") ||
    upper.includes("CPL") ||
    upper.includes("CC-BY-SA") ||
    upper.includes("ODC-BY")
  ) {
    return "Medium";
  }

  // Low Risk (Permissive)
  if (
    upper.includes("MIT") ||
    upper.includes("APACHE") ||
    upper.includes("BSD") ||
    upper.includes("ISC") ||
    upper.includes("UNLICENSE") ||
    upper.includes("CC0") ||
    upper.includes("ZLIB")
  ) {
    return "Low";
  }

  return "Unknown";
};

/**
 * Parse SBOM data from various formats into a unified package list
 * Handles deduplication and normalizes license/risk data
 */
export const parseSBOM = (data: SBOMData): SBOMPackage[] => {
  const packagesMap = new Map<string, SBOMPackage>();

  const addPackage = (pkg: { license?: string } & Omit<SBOMPackage, "risk">) => {
    const key = `${pkg.name}@${pkg.version}`;
    if (!packagesMap.has(key)) {
      let license = pkg.license;
      if (!license || license === "N/A") {
        license = "Unknown";
      }

      packagesMap.set(key, {
        license: license,
        name: pkg.name,
        risk: getLegalRisk(license),
        type: pkg.type,
        version: pkg.version,
      });
    }
  };

  try {
    if (data.Results) {
      data.Results.forEach((result) => {
        const type = result.Type;
        if (result.Packages) {
          result.Packages.forEach((pkg) => {
            addPackage({
              license: pkg.Licenses?.join(", ") ?? pkg.License ?? "",
              name: pkg.Name,
              type: type,
              version: pkg.Version,
            });
          });
        }
      });
    } else if (data.components) {
      data.components.forEach((comp) => {
        if (comp.type === "application" && !comp.version) return;

        let license = "N/A";
        if (comp.licenses && comp.licenses.length > 0) {
          const licenses = comp.licenses.map((l) => {
            if (l.expression) return l.expression;
            return l.license?.id ?? l.license?.name ?? "Unknown";
          });
          license = licenses.join(" OR ");
        }

        addPackage({
          license: license,
          name: comp.name,
          type: comp.type,
          version: comp.version ?? "",
        });
      });
    } else if (data.packages) {
      data.packages.forEach((pkg) => {
        addPackage({
          license: pkg.licenseConcluded ?? "",
          name: pkg.name,
          type: "SPDX Package",
          version: pkg.versionInfo ?? "",
        });
      });
    }
  } catch (error) {
    console.error("Failed to parse SBOM data", error);
  }

  return [...packagesMap.values()].sort((a, b) => a.name.localeCompare(b.name));
};

/**
 * Get risk badge color classes for display (matches severity colors)
 */
export const getRiskBadgeClass = (risk: string): string => {
  switch (risk) {
    case "High":
      return "bg-orange-500/15 text-orange-700 dark:text-orange-400 hover:bg-orange-500/25 border-transparent";
    case "Low":
      return "bg-blue-500/15 text-blue-700 dark:text-blue-400 hover:bg-blue-500/25 border-transparent";
    case "Medium":
      return "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-500/25 border-transparent";
    default:
      return "bg-muted/50 text-muted-foreground border-transparent";
  }
};
