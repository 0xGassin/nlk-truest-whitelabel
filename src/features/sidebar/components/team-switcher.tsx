"use client";

import { ChevronsUpDown, Plus } from "lucide-react";
import * as React from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { useTheme } from "@/features/settings";
import { cn } from "@/lib/utils";

import { getSidebarPopupClasses } from "./sidebar-popup";

export function TeamSwitcher({
  teams,
}: {
  teams: {
    logo: React.ElementType;
    name: string;
    plan: string;
  }[];
}) {
  const { isMobile } = useSidebar();
  const [activeTeam, setActiveTeam] = React.useState(teams[0]);
  const { highContrastPopups } = useTheme();
  const popup = getSidebarPopupClasses(highContrastPopups);

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!activeTeam) {
    return null;
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              size="lg"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                {React.createElement(activeTeam.logo, { className: "size-4" })}
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{activeTeam.name}</span>
                <span className="truncate text-xs">{activeTeam.plan}</span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className={cn("w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg", popup.content)}
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className={cn("text-xs", popup.labelMuted)}>Teams</DropdownMenuLabel>
            {teams.map((team, index) => (
              <DropdownMenuItem
                className={cn("gap-2 p-2", popup.item)}
                key={team.name}
                onClick={() => {
                  setActiveTeam(team);
                }}
              >
                <div className="flex size-6 items-center justify-center rounded-md border">
                  {React.createElement(team.logo, { className: "size-3.5 shrink-0" })}
                </div>
                {team.name}
                <DropdownMenuShortcut className={popup.shortcut}>Ctrl+{index + 1}</DropdownMenuShortcut>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator className={popup.separator} />
            <DropdownMenuItem className={cn("gap-2 p-2", popup.item)}>
              <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                <Plus className="size-4" />
              </div>
              <div className="font-medium text-white">Add team</div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
