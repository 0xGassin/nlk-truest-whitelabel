"use client";

import { useSearchParams } from "next/navigation";

import { BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";

export function SettingsBreadcrumb() {
  const searchParams = useSearchParams();
  const activeSection = searchParams.get("tab") ?? "User";

  return (
    <>
      <BreadcrumbItem>
        <BreadcrumbLink href="/settings">Settings</BreadcrumbLink>
      </BreadcrumbItem>
      <BreadcrumbSeparator />
      <BreadcrumbItem>
        <BreadcrumbPage>{activeSection}</BreadcrumbPage>
      </BreadcrumbItem>
    </>
  );
}
