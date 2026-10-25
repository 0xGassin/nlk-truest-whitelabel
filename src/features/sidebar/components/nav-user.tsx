"use client";

import { ChevronsUpDown, Cog, LogOut } from "lucide-react";
import Link from "next/link";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { NotificationsMenu } from "@/features/notifications";
import { useTheme } from "@/features/settings";
import { useAuth, useAuthActions } from "@/lib/auth";
import { cn, getDiceBearIdenticonUrl } from "@/lib/utils";

import { getSidebarPopupClasses } from "./sidebar-popup";

function isValidName(name: string | undefined): name is string {
  if (!name) return false;
  const trimmed = name.trim();
  if (trimmed.length === 0) return false;
  if (trimmed.includes("@") || (trimmed.includes(".") && trimmed.length < 3)) return false;
  return true;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function NavUser() {
  const { isMobile } = useSidebar();
  const { user } = useAuth();
  const { returnToNulink } = useAuthActions();
  const { highContrastPopups } = useTheme();
  const popup = getSidebarPopupClasses(highContrastPopups);

  if (!user) return null;

  // Generate full name or fallback to email
  // Always prioritize first_name and last_name if they exist and are valid
  const getDisplayName = () => {
    const firstName = user.first_name?.trim();
    const lastName = user.last_name?.trim();

    if (isValidName(firstName) && isValidName(lastName)) {
      return `${capitalize(firstName)} ${capitalize(lastName)}`;
    } else if (isValidName(firstName)) {
      return capitalize(firstName);
    } else if (isValidName(lastName)) {
      return capitalize(lastName);
    }
    return user.email.split("@")[0];
  };

  // Generate initials from name or email
  const getInitials = () => {
    const firstName = user.first_name?.trim();
    const lastName = user.last_name?.trim();

    if (isValidName(firstName) && isValidName(lastName)) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    } else if (isValidName(firstName)) {
      return firstName.slice(0, 2).toUpperCase();
    }
    return user.email
      .split("@")[0]
      .split(".")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const displayName = getDisplayName();
  const initials = getInitials();
  const avatarUrl = getDiceBearIdenticonUrl(user.email);

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                className="overflow-visible data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                size="lg"
              >
                <Avatar className="relative size-8 shrink-0 overflow-visible rounded-lg">
                  {avatarUrl ? <AvatarImage alt={displayName} className="rounded-lg" src={avatarUrl} /> : null}
                  <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{displayName}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
                <ChevronsUpDown className="ml-auto size-4" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className={cn("w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg", popup.content)}
              side={isMobile ? "bottom" : "right"}
              sideOffset={4}
            >
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="size-8 rounded-lg">
                    {avatarUrl ? <AvatarImage alt={displayName} src={avatarUrl} /> : null}
                    <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{displayName}</span>
                    <span className="truncate text-xs">{user.email}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className={popup.separator} />
              <DropdownMenuGroup>
                <NotificationsMenu />
                <DropdownMenuItem asChild className={cn(popup.item)}>
                  <Link href="/settings?tab=User">
                    <Cog />
                    Settings
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator className={popup.separator} />
              <DropdownMenuItem
                className={cn(popup.item)}
                onClick={() => {
                  void returnToNulink();
                }}
              >
                <LogOut />
                Back to Home
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    </>
  );
}
