import dynamic from "next/dynamic";

import { PageLoading } from "@/components/page-loading";

const SettingsPage = dynamic(
  async () => {
    const mod = await import("@/features/settings/components/settings-page");
    return { default: mod.SettingsPage };
  },
  {
    loading: () => <PageLoading message="Loading settings..." />,
  },
);

export default function Page() {
  return <SettingsPage />;
}
