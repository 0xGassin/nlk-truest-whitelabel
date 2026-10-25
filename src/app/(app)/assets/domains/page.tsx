"use client";

import { DataTablePage } from "@/components/ui/data-table";
import { DomainsPage } from "@/features/domains";

export default function Page() {
  return (
    <DataTablePage padded={false}>
      <DomainsPage />
    </DataTablePage>
  );
}
