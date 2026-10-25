"use client";

import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast/toast";
import { cn } from "@/lib/utils";

import { useTheme } from "../context/theme-context";
import { SettingsSection } from "./settings-section";

const footerClassName = "border-t border-[#eaeaea] bg-[#fafafa] dark:border-border dark:bg-card";

type ThemeOptionValue = "dark" | "soft" | "system";

const themeOptions: { label: string; value: ThemeOptionValue }[] = [
  { label: "Soft", value: "soft" },
  { label: "Dark", value: "dark" },
  { label: "System", value: "system" },
];

function PreviewShell({ dark, embedded, soft }: { dark?: boolean; embedded?: boolean; soft?: boolean }) {
  const shellBg = dark ? "bg-zinc-900" : soft ? "bg-[#f5f5f5]" : "bg-white";
  const canvasBg = dark ? "bg-zinc-950" : soft ? "bg-[#fcfcfc]" : "bg-[#f7f7f7]";
  const railBg = dark ? "bg-zinc-900" : soft ? "bg-[#f8f8f8]" : "bg-white";
  const lineTone = dark ? "bg-white/10" : "bg-zinc-900/10";
  const cardTone = dark ? "bg-white/5" : "bg-zinc-900/5";
  const edgeTone = dark ? "border-zinc-800" : "border-black/5";

  return (
    <div
      className={cn(
        "relative flex h-full overflow-hidden",
        embedded ? "rounded-none border-0 shadow-none" : cn("rounded-[0.5rem] border", edgeTone, shellBg),
      )}
    >
      <div className={cn("flex w-[24%] flex-col gap-1 border-r p-1.5", railBg, edgeTone)}>
        <div className={cn("h-1.5 w-8 rounded-full", lineTone)} />
        <div className={cn("h-3 w-full rounded-md", lineTone)} />
        <div className={cn("h-1.5 w-5 rounded-full", lineTone)} />
        <div className={cn("h-1.5 w-7 rounded-full", lineTone)} />
        <div className="mt-1 flex-1 rounded-md bg-transparent" />
      </div>

      <div className={cn("flex flex-1 flex-col p-1.5", canvasBg)}>
        <div className={cn("mb-1 h-1.5 w-10 rounded-full", lineTone)} />
        <div className="grid flex-1 grid-cols-2 gap-1">
          <div className={cn("rounded-md", cardTone)} />
          <div className={cn("rounded-md", cardTone)} />
        </div>
        <div className={cn("mx-auto mt-1.5 h-1 w-8 rounded-full", lineTone)} />
      </div>

      <div className={cn("flex w-[24%] flex-col gap-1 border-l p-1.5", railBg, edgeTone)}>
        <div className={cn("h-1.5 w-7 rounded-full", lineTone)} />
        <div className={cn("h-1.5 w-9 rounded-full", lineTone)} />
        <div className="flex-1" />
        <div className={cn("h-5 rounded-md", cardTone)} />
      </div>
    </div>
  );
}

function ThemePreview({ value }: { value: ThemeOptionValue }) {
  const dark = value === "dark";
  const soft = value === "soft";

  if (value === "system") {
    return (
      <div className="relative h-full overflow-hidden rounded-[0.5rem] border border-black/5 bg-[#f4f4f4] dark:border-white/10 dark:bg-zinc-900">
        <div className="absolute inset-y-0 left-0 w-1/2 pr-px">
          <PreviewShell embedded soft />
        </div>
        <div className="absolute inset-y-0 right-0 w-1/2 pl-px">
          <PreviewShell dark embedded />
        </div>
        <div className="absolute inset-y-0 left-1/2 w-px -translate-x-px bg-black/10 dark:bg-white/10" />
      </div>
    );
  }

  return <PreviewShell dark={dark} soft={soft} />;
}

export function AppearanceSettings() {
  const { highContrastPopups, setHighContrastPopups, setTheme, theme } = useTheme();

  const [localContrastOn, setLocalContrastOn] = useState(highContrastPopups === "sidebar");
  const contrastChanged = localContrastOn !== (highContrastPopups === "sidebar");

  const handleContrastSave = useCallback(() => {
    setHighContrastPopups(localContrastOn ? "sidebar" : "off");
    toast.success("High contrast updated", {
      description: localContrastOn ? "Only sidebar menus use the darker surface." : "No high contrast applied.",
    });
  }, [localContrastOn, setHighContrastPopups]);

  return (
    <div className="space-y-4">
      <SettingsSection description="Select the theme for the dashboard." title="Theme">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {themeOptions.map((option) => (
            <button
              aria-pressed={theme === option.value}
              className={cn(
                "group flex h-full flex-col gap-3 rounded-[0.5rem] border border-black/10 bg-white/75 p-3 text-left transition-[transform,border-color,background-color] duration-150 hover:-translate-y-0.5 hover:border-black/20 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:border-white/20 dark:hover:bg-white/10",
                theme === option.value &&
                  "border-[#2454ff] bg-white ring-[1.5px] ring-[#2454ff] dark:border-[#2454ff] dark:bg-white/10",
              )}
              key={option.value}
              onClick={() => {
                setTheme(option.value);
              }}
            >
              <div className="h-16 w-full overflow-hidden rounded-[0.5rem]">
                <ThemePreview value={option.value} />
              </div>
              <div className="flex items-center justify-between px-0.5">
                <span className="text-sm font-medium tracking-tight text-foreground/90">{option.label}</span>
                {theme === option.value ? (
                  <span className="size-2 rounded-full bg-[#2454ff]" />
                ) : (
                  <span className="size-2 rounded-full bg-muted-foreground/25 transition-colors group-hover:bg-muted-foreground/40" />
                )}
              </div>
            </button>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection
        description="Use a darker popup surface for menus."
        footer={
          <Button
            className="h-8 rounded-md bg-[#1a1a1a] px-4 text-sm font-medium text-white hover:bg-[#333] disabled:bg-zinc-300 dark:disabled:bg-zinc-700"
            disabled={!contrastChanged}
            onClick={handleContrastSave}
            size="sm"
          >
            Save
          </Button>
        }
        footerClassName={footerClassName}
        footerHint={localContrastOn ? "Only sidebar menus use the darker surface." : "No high contrast applied."}
        title="High contrast popups"
      >
        <div className="flex items-center gap-3">
          <Switch
            checked={localContrastOn}
            id="high-contrast"
            onCheckedChange={setLocalContrastOn}
            className="h-6 w-11 data-[state=unchecked]:bg-zinc-200 duration-200 ease-in-out dark:data-[state=unchecked]:bg-zinc-700"
            thumbClassName="size-5 data-[state=checked]:translate-x-[21px] data-[state=unchecked]:translate-x-[1px] duration-200 ease-out"
          />
          <label
            className="cursor-pointer text-sm font-medium leading-tight text-foreground/90"
            htmlFor="high-contrast"
          >
            High contrast popups
          </label>
        </div>
      </SettingsSection>
    </div>
  );
}
