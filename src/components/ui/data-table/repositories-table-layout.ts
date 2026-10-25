import type { TableSkeletonColumn } from "./table-skeleton";

export const REPOSITORIES_TABLE_LAYOUT: TableSkeletonColumn[] = [
  { id: "full_name", skeletonVariant: "primary-subtext", width: "3fr" },
  { id: "last_scan", width: "2fr" },
  { id: "issues", skeletonVariant: "badge", width: "2fr" },
  { align: "right", id: "actions", skeletonVariant: "icon-action", width: "72px" },
];
