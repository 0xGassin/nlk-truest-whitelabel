export function normalizeConnectionName(value?: string) {
  return (value ?? "")
    .toLowerCase()
    .replaceAll(/[\s_]+/g, "-")
    .replaceAll(/[^a-z0-9-]/g, "")
    .replaceAll(/-+/g, "-");
}
