import type { TableSkeletonColumn } from "./table-skeleton";

export const RESOURCE_TABLE_LAYOUT: TableSkeletonColumn[] = [
  { align: "center", id: "type", skeletonVariant: "icon-action", width: "70px" },
  { id: "name", skeletonVariant: "primary-subtext", width: "8fr" },
  { id: "region", skeletonVariant: "mono-chip", width: "1.2fr" },
  { id: "source_type", skeletonVariant: "badge", width: "1.5fr" },
];
