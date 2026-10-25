"use client";

import type { LucideIcon } from "lucide-react";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";

const isPathActive = (pathname: null | string, targetPath: string) => {
  if (targetPath === "#" || !pathname) return false;
  return pathname === targetPath || pathname.startsWith(`${targetPath}/`);
};

export function NavMain({
  items,
  label,
}: {
  items: {
    defaultOpen?: boolean;
    icon?: LucideIcon;
    isActive?: boolean;
    items?: {
      title: string;
      url: string;
    }[];
    onClick?: () => void;
    title: string;
    url: string;
  }[];
  label?: string;
}) {
  const pathname = usePathname();

  const isItemActive = (itemUrl: string, subItems?: { url: string }[]) => {
    if (subItems) {
      // Check if any sub-item matches the current path
      return subItems.some((subItem) => {
        return isPathActive(pathname, subItem.url);
      });
    }
    return false;
  };

  const isSubItemActive = (subItemUrl: string) => {
    return isPathActive(pathname, subItemUrl);
  };

  return (
    <SidebarGroup>
      {label ? <SidebarGroupLabel>{label}</SidebarGroupLabel> : null}
      <SidebarMenu>
        {items.map((item) => {
          const hasActiveChild = isItemActive(item.url, item.items);

          return item.items ? (
            <Collapsible
              asChild
              className="group/collapsible"
              defaultOpen={item.defaultOpen ?? hasActiveChild}
              key={item.title}
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    className="group/drilldown text-sidebar-foreground/85 hover:[&_.drilldown-chevron]:bg-sidebar-foreground/8 hover:[&_.drilldown-chevron]:text-sidebar-foreground hover:[&_.drilldown-chevron]:shadow-[0_0_0_1px_hsl(var(--sidebar-border))]"
                    tooltip={item.title}
                  >
                    {item.icon ? <item.icon /> : null}
                    <span>{item.title}</span>
                    <span className="drilldown-chevron mr-0 ml-auto flex size-[24px] items-center justify-center rounded-md bg-transparent">
                      <ChevronRight className="!size-[12.2px] shrink-0 !stroke-[2.15] transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </span>
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.items.map((subItem) => {
                      const isActive = isSubItemActive(subItem.url);
                      return (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton
                            asChild
                            className="font-mono text-sidebar-foreground/85"
                            isActive={isActive}
                          >
                            <Link href={subItem.url}>
                              <span>{subItem.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      );
                    })}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          ) : (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild={!item.onClick}
                className="group/drilldown text-sidebar-foreground/85 hover:[&_.drilldown-chevron]:bg-sidebar-foreground/8 hover:[&_.drilldown-chevron]:text-sidebar-foreground hover:[&_.drilldown-chevron]:shadow-[0_0_0_1px_hsl(var(--sidebar-border))]"
                isActive={item.isActive ?? (item.url !== "#" && pathname === item.url)}
                onClick={item.onClick}
              >
                {item.onClick ? (
                  <>
                    {item.icon ? <item.icon /> : null}
                    <span>{item.title}</span>
                    <span className="drilldown-chevron mr-0 ml-auto flex size-[24px] items-center justify-center rounded-md bg-transparent">
                      <ChevronRight className="!size-[12.2px] shrink-0 !stroke-[2.15]" />
                    </span>
                  </>
                ) : (
                  <Link href={item.url}>
                    {item.icon ? <item.icon /> : null}
                    <span>{item.title}</span>
                  </Link>
                )}
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
