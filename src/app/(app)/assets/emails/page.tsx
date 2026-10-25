"use client";

import { DataTablePage } from "@/components/ui/data-table";
import { DiscoveryPage } from "@/features/domain-discoveries";

export default function Page() {
  return <DataTablePage padded={false}><DiscoveryPage kind="emails" /></DataTablePage>;
}
