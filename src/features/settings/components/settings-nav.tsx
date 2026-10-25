"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";

export const SETTINGS_NAV_ITEMS = [
  { tab: "User", title: "General" },
  { tab: "Usage", title: "Usage" },
  { tab: "Appearance", title: "Appearance" },
  { tab: "Advanced", title: "Advanced" },
] as const;

export function SettingsNav() {
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") ?? "User";

  return (
    <nav aria-label="Settings" className="hidden w-52 shrink-0 lg:block">
      <ul className="sticky top-6 flex flex-col gap-0.5">
        {SETTINGS_NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.tab;

          return (
            <li key={item.tab}>
              <Link
                className={cn(
                  "block rounded-md px-3 py-1.5 text-sm transition-colors",
                  isActive
                    ? "bg-accent font-medium text-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                )}
                href={`/settings?tab=${encodeURIComponent(item.tab)}`}
              >
                {item.title}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
