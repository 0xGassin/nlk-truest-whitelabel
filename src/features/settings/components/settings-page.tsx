"use client";

import { useSearchParams } from "next/navigation";
import * as React from "react";

import { AdvancedSettings } from "./advanced-settings";
import { AppearanceSettings } from "./appearance-settings";
import { SettingsPageLayout } from "./settings-section";
import { UsageSettings } from "./usage-settings";
import { UserSettings } from "./user-settings";

export function SettingsPage() {
  const searchParams = useSearchParams();
  const activeSection = searchParams.get("tab") ?? "User";

  return (
    <SettingsPageLayout>
      {activeSection === "User" ? <UserSettings /> : null}
      {activeSection === "Usage" ? <UsageSettings /> : null}
      {activeSection === "Appearance" ? <AppearanceSettings /> : null}
      {activeSection === "Advanced" ? <AdvancedSettings /> : null}
      {activeSection !== "User" &&
      activeSection !== "Usage" &&
      activeSection !== "Appearance" &&
      activeSection !== "Advanced" ? (
        <div className="flex h-full min-h-100 items-center justify-center text-muted-foreground">
          <p>{activeSection} settings coming soon...</p>
        </div>
      ) : null}
    </SettingsPageLayout>
  );
}
