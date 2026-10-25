"use client";

import { usePathname } from "next/navigation";

import {
  GenericPageSkeleton,
  getTableColumns,
  isTablePage,
  PageTableSkeleton,
} from "@/components/page-loading";

export default function Loading() {
  const pathname = usePathname();

  if (isTablePage(pathname)) {
    return (
      <PageTableSkeleton
        tableColumns={getTableColumns(pathname)}
      />
    );
  }

  return <GenericPageSkeleton />;
}
