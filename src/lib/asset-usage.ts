import type { OrganizationLimits } from "@/types";

export const DEFAULT_ASSET_LIMIT = 10_000;

export function getAssetLimit(limits?: OrganizationLimits): number {
  if (!limits) return DEFAULT_ASSET_LIMIT;

  for (const key of ["assets", "asset_limit", "assets_limit", "max_assets", "max_asset_count"]) {
    const value = limits[key];
    const limit = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
    if (Number.isFinite(limit) && limit > 0) return limit;
  }

  return DEFAULT_ASSET_LIMIT;
}
