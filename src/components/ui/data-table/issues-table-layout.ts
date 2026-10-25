import type { TableSkeletonColumn } from "./table-skeleton";

export const ISSUES_TABLE_LAYOUT: TableSkeletonColumn[] = [
  { id: "name", skeletonVariant: "primary-subtext", width: "5fr" },
  { id: "count", width: "2.5fr" },
  { id: "severity", skeletonVariant: "badge", width: "2.5fr" },
  { align: "right", id: "actions", skeletonVariant: "icon-action", width: "72px" },
];
