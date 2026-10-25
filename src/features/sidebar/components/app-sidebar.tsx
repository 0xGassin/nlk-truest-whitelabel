"use client";

import type { LucideIcon } from "lucide-react";

import { motion, useReducedMotion } from "framer-motion";
import {
  ChevronLeft,
  Cog,
  Globe,
  GraphStar,
  Inbox,
  MoreHorizontal,
  Pyramid,
  SmilePlus,
  Telescope,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import * as React from "react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { SETTINGS_NAV_ITEMS } from "@/features/settings/components/settings-nav";
import { cn } from "@/lib/utils";

import { NavMain } from "./nav-main";
import { NavProjects } from "./nav-projects";
import { NavUser } from "./nav-user";
import { OrganizationSwitcher, TruestBrand } from "./organization-switcher";

const isPathActive = (pathname: null | string, targetPath: string) => {
  if (targetPath === "#" || !pathname) return false;
  return pathname === targetPath || pathname.startsWith(`${targetPath}/`);
};

interface SidebarSubItem {
  icon?: LucideIcon;
  title: string;
  url: string;
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab") ?? "User";
  const data = {
    assets: {
      icon: Pyramid,
      items: [
        {
          icon: Globe,
          title: "Domains",
          url: "/assets/domains",
        },
        {
          title: "Crawler",
          url: "/assets/crawler",
        },
        {
          title: "Subdomains",
          url: "/assets/subdomains",
        },
        {
          title: "Services",
          url: "/assets/services",
        },
        {
          title: "Lookalikes",
          url: "/assets/lookalikes",
        },
        {
          title: "Emails",
          url: "/assets/emails",
        },
        {
          title: "CT Logs",
          url: "/assets/ct-logs",
        },
      ],
      title: "Assets",
    },
    findings: {
      icon: Telescope,
      title: "Findings",
      url: "/findings",
    },
    projects: [
      {
        icon: MoreHorizontal,
        items: [
          {
            icon: SmilePlus,
            isFeedback: true,
            name: "Feedback",
            url: "#",
          },
        ],
        name: "More",
        url: "#",
      },
    ],
    settings: {
      icon: Cog,
      items: SETTINGS_NAV_ITEMS.map((item) => ({
        title: item.title,
        url: `/settings?tab=${encodeURIComponent(item.tab)}`,
      })) as SidebarSubItem[],
      title: "Settings",
    },
  };

  const isSettingsActive = isPathActive(pathname, "/settings");
  const [settingsOpen, setSettingsOpen] = React.useState(() => isSettingsActive);

  React.useEffect(() => {
    if (isSettingsActive) {
      setSettingsOpen(true);
    } else {
      setSettingsOpen(false);
    }
  }, [isSettingsActive]);

  const navMainItems = [
    {
      icon: GraphStar,
      title: "Surface",
      url: "/graph",
    },
    {
      icon: Inbox,
      title: "Dashboard",
      url: "/dashboard",
    },
    {
      icon: Pyramid,
      defaultOpen: true,
      title: "Assets",
      url: "#",
      items: data.assets.items.map((item) => ({
        icon: item.icon,
        title: item.title,
        url: item.url,
      })),
    },
    {
      icon: Cog,
      title: "Settings",
      url: "#",
      isActive: isSettingsActive,
      onClick: () => {
        setSettingsOpen(true);
      },
    },
  ];

  const prefersReducedMotion = useReducedMotion();

  const transition = prefersReducedMotion
    ? { duration: 0.16, ease: "easeOut" as const }
    : { duration: 0.24, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] };

  const FindingsIcon = data.findings.icon;

  const sidebarContents = (
    <>
      <SidebarHeader className="h-14 justify-center">
        <div className="flex min-w-0 items-center gap-1">
          <TruestBrand />
          <span aria-hidden className="shrink-0 text-[13px] text-muted-foreground/60">
            /
          </span>
          <OrganizationSwitcher compact />
        </div>
      </SidebarHeader>
      <SidebarContent className="relative h-full !overflow-hidden">
        <motion.div
          animate={settingsOpen ? { opacity: 0, x: "-8%" } : { opacity: 1, x: 0 }}
          className="absolute inset-0 size-full overflow-hidden"
          initial={false}
          style={{ pointerEvents: settingsOpen ? "none" : "auto", willChange: "transform, opacity" }}
          transition={transition}
        >
          <div className="flex size-full flex-col overflow-y-auto">
            <SidebarGroup className="mb-0 !pt-3">
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    className="text-sidebar-foreground/85"
                    isActive={pathname === data.findings.url}
                  >
                    <Link href={data.findings.url}>
                      <FindingsIcon />
                      <span>{data.findings.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>
            <NavMain items={navMainItems} label="Platform" />
            <NavProjects label="Others" projects={data.projects} />
          </div>
        </motion.div>

        <motion.div
          animate={settingsOpen ? { opacity: 1, x: 0 } : { opacity: 0, x: "100%" }}
          className="absolute inset-0 z-10 size-full overflow-hidden"
          initial={false}
          style={{ pointerEvents: settingsOpen ? "auto" : "none", willChange: "transform, opacity" }}
          transition={transition}
        >
          <div className="flex size-full flex-col overflow-y-auto">
            <SidebarGroup>
              <SidebarMenu>
                <SidebarMenuItem className="mb-1">
                  <SidebarMenuButton
                    className="relative text-sidebar-foreground/85"
                    onClick={() => {
                      setSettingsOpen(false);
                    }}
                  >
                    <ChevronLeft className="absolute left-1" />
                    <span className="w-full text-center">Settings</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {data.settings.items.map((item) => {
                  const isActive = currentTab === new URLSearchParams(item.url.split("?")[1] || "").get("tab");

                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        className={cn(
                          "font-mono text-sidebar-foreground/85",
                          isActive && "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
                        )}
                        isActive={isActive}
                        tooltip={item.title}
                      >
                        <Link href={item.url}>
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroup>
          </div>
        </motion.div>
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </>
  );

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      {sidebarContents}
    </Sidebar>
  );
}
