import { DataTablePage } from "@/components/ui/data-table";
import { DashboardContent } from "@/features/dashboard";

export default function Page() {
  return (
    <DataTablePage padded={false}>
      <DashboardContent />
    </DataTablePage>
  );
}
