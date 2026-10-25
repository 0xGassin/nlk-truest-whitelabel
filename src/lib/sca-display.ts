/**
 * Strips Trivy's "{pkg}:" prefix from vulnerability titles (e.g. "axios: Axios ..." → "Axios ...").
 */
export function stripPkgPrefix(pkgName: string | undefined, title: string): string {
  if (!title || !pkgName) return title;

  const lowerTitle = title.toLowerCase();
  for (const sep of [": ", ":"]) {
    const prefix = `${pkgName.toLowerCase()}${sep}`;
    if (lowerTitle.startsWith(prefix)) {
      return title.slice(prefix.length).trimStart();
    }
  }
  return title;
}

export function scaPkgName(issue: {
  metadata?: Record<string, unknown>;
  pkg_name?: string;
  title?: string;
}): string | undefined {
  const fromMeta = issue.metadata?.pkg_name;
  if (typeof fromMeta === "string" && fromMeta) return fromMeta;
  if (issue.pkg_name) return issue.pkg_name;
  return issue.title?.split(" ")[0];
}

function hasEmbeddedTrivyTitle(pkgName: string | undefined, text: string): boolean {
  if (!pkgName || !text) return false;
  const lower = text.toLowerCase();
  return lower.startsWith(`${pkgName.toLowerCase()}:`);
}

/** Split a single-line legacy description that concatenated title + OSV body without a newline. */
function splitSingleLineLegacy(desc: string, pkgName: string | undefined): { body: string; title: string } | null {
  if (!desc || desc.includes("\n") || !pkgName) return null;
  if (!hasEmbeddedTrivyTitle(pkgName, desc)) return null;

  const withoutPrefix = stripPkgPrefix(pkgName, desc);
  const match = /^(.+?)\s+([A-Za-z][\w.-]* is (?:a|an) [\s\S]+)$/.exec(withoutPrefix);
  if (match) {
    return { body: match[2].trim(), title: match[1].trim() };
  }
  return null;
}

function extractLegacyTitleFromDescription(pkgName: string | undefined, description?: string): null | string {
  if (!description) return null;

  const firstLine = description.split("\n")[0]?.trim();
  if (!firstLine) return null;

  if (hasEmbeddedTrivyTitle(pkgName, firstLine)) {
    return stripPkgPrefix(pkgName, firstLine);
  }

  const singleLine = splitSingleLineLegacy(description, pkgName);
  if (singleLine) return singleLine.title;

  return null;
}

function resolveVulnTitleField(issue: { metadata?: Record<string, unknown>; vuln_title?: string }): string | undefined {
  if (issue.vuln_title) return issue.vuln_title;
  const fromMeta = issue.metadata?.vuln_title;
  return typeof fromMeta === "string" && fromMeta ? fromMeta : undefined;
}

export function scaVulnTitle(issue: {
  description?: string;
  metadata?: Record<string, unknown>;
  name?: string;
  pkg_name?: string;
  title?: string;
  vuln_title?: string;
}): string {
  const pkgName = scaPkgName(issue);

  const vulnTitle = resolveVulnTitleField(issue);
  if (vulnTitle) {
    return stripPkgPrefix(pkgName, vulnTitle);
  }

  const legacyTitle = extractLegacyTitleFromDescription(pkgName, issue.description);
  if (legacyTitle) {
    return legacyTitle;
  }

  return issue.name ?? "";
}

/** Returns the OSV description without any legacy prepended vulnerability title. */
export function scaVulnDescription(issue: {
  description?: string;
  metadata?: Record<string, unknown>;
  pkg_name?: string;
  title?: string;
  vuln_title?: string;
}): string {
  const desc = issue.description?.trim();
  if (!desc) return "";

  const pkgName = scaPkgName(issue);

  const newlineIdx = desc.indexOf("\n");
  if (newlineIdx > 0) {
    const firstLine = desc.slice(0, newlineIdx).trim();
    if (hasEmbeddedTrivyTitle(pkgName, firstLine)) {
      return desc.slice(newlineIdx + 1).trim();
    }
  }

  const split = splitSingleLineLegacy(desc, pkgName);
  if (split) return split.body;

  return desc;
}

export function isScaIssue(issue: { source?: string; type?: string }): boolean {
  return issue.type?.toLowerCase() === "dependencies" || issue.source === "Dependencies";
}

/** Short manifest label for dependency issues (e.g. `services/api/go.mod`). */
export function formatManifestPath(filePath?: string): string {
  if (!filePath) return "";
  const withoutLine = filePath.split(":")[0];
  const parts = withoutLine.split(/[/\\]/);
  return parts.at(-1) ?? withoutLine;
}

export function packageGroupImpactText(
  issues: {
    description?: string;
    metadata?: Record<string, unknown>;
    name?: string;
    title?: string;
    vuln_title?: string;
  }[],
  fallback = "These vulnerabilities could impact the security and stability of your repository.",
): string {
  const impactTypes = [
    ...new Set(
      issues
        .map((issue) => scaVulnTitle(issue))
        .filter(Boolean)
        .slice(0, 3),
    ),
  ];

  if (impactTypes.length > 0) {
    return `The worst case impact for these vulnerabilities can be "${impactTypes.join('", "')}".`;
  }

  return fallback;
}

export function isPackageIssueGroup(group: { pkg_name?: string; source?: string; type?: string }): boolean {
  return Boolean(group.pkg_name) || group.source === "Dependencies" || group.type === "dependencies";
}
