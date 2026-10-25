function normalizeRemediation(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .join("\n")
      .trim();
  }
  return "";
}

export function getFindingRemediation(details?: Record<string, unknown> | null, remediation?: string | null): string {
  const direct = normalizeRemediation(remediation);
  if (direct) return direct;

  return normalizeRemediation(details?.remediation);
}
