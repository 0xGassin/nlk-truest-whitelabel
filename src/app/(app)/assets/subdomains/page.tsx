import { DataTablePage } from "@/components/ui/data-table";
import { GlobalAssetsPage } from "@/features/global-assets";

export default function Page() {
  return (
    <DataTablePage padded={false}>
      <GlobalAssetsPage kind="subdomains" />
    </DataTablePage>
  );
}
