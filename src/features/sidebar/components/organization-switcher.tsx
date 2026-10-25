"use client";

import { ChevronsUpDown } from "lucide-react";
import Image from "next/image";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { useTheme } from "@/features/settings";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

import { getSidebarPopupClasses } from "./sidebar-popup";

function NulinkLogo() {
  return (
    <span className="relative flex h-[30px] shrink-0 items-center">
      <Image alt="" className="h-[30px] w-auto dark:invert" height={151} src="/icons/Vector.svg" width={146} />
    </span>
  );
}

export function NulinkBrand() {
  return (
    <div className="flex h-[30px] items-center px-1.5">
      <NulinkLogo />
    </div>
  );
}

export function OrganizationSwitcher({ compact = false }: { compact?: boolean }) {
  const { isMobile } = useSidebar();
  const { user } = useAuth();
  const { highContrastPopups } = useTheme();
  const popup = getSidebarPopupClasses(highContrastPopups);

  const organization = user?.organization;

  if (!organization) {
    return (
      <SidebarMenu className={compact ? "min-w-0 flex-1" : undefined}>
        <SidebarMenuItem>
          <SidebarMenuButton
            className={cn(
              compact ? "min-w-0 px-1.5" : "pl-2",
              "data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground",
            )}
            size="lg"
          >
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">No Organization</span>
              <span className="truncate text-xs text-muted-foreground">Awaiting access</span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return (
    <SidebarMenu className={compact ? "min-w-0 flex-1" : undefined}>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              aria-label={`Organization: ${organization.name}`}
              className={cn(
                compact ? "min-w-0 px-1.5" : "pl-2",
                "data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground",
              )}
              size="lg"
            >
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{organization.name}</span>
              </div>
              <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground capitalize">
                {organization.subscription}
              </span>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className={cn("w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg", popup.content)}
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className={cn("px-2 py-1.5 text-xs font-medium", popup.labelMuted)}>
              Organization
            </DropdownMenuLabel>
            <div className="px-2 py-1.5">
              <div className="text-sm font-medium">{organization.name}</div>
              <div className="mt-0.5 text-xs capitalize text-muted-foreground">{organization.subscription}</div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
