"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { PageTransition } from "@/components/page-transition";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { SettingsBreadcrumb } from "@/features/settings";
import { AppSidebar } from "@/features/sidebar";
import { AuthGuard } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { useBreadcrumbStore } from "@/stores/breadcrumb-store";

const pathToBreadcrumb: Record<string, { category: string; page: string }> = {
  "/assets/domains": { category: "Assets", page: "Domains" },
  "/assets/crawler": { category: "Assets", page: "Crawler" },
  "/assets/subdomains": { category: "Assets", page: "Subdomains" },
  "/assets/services": { category: "Assets", page: "Services" },
  "/assets/lookalikes": { category: "Assets", page: "Lookalikes" },
  "/assets/emails": { category: "Assets", page: "Emails" },
  "/assets/ct-logs": { category: "Assets", page: "CT Logs" },
  "/dashboard": { category: "Overview", page: "Dashboard" },
  "/graph": { category: "Overview", page: "Graph" },
  "/findings": { category: "Overview", page: "Findings" },
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);

  // Normalize dynamic paths for breadcrumb matching
  const breadcrumbKey = (() => {
    return pathname;
  })();

  const isDomainDetailPage = pathname.startsWith("/assets/domains/");

  useEffect(() => {
    const updateScrollState = () => {
      setIsScrolled(window.scrollY > 0);
    };

    updateScrollState();
    window.addEventListener("scroll", updateScrollState, { passive: true });

    return () => {
      window.removeEventListener("scroll", updateScrollState);
    };
  }, []);

  const { clearDetailsPage, detailsPage } = useBreadcrumbStore();

  // Clear details page when navigating away from pages that use it
  useEffect(() => {
    if (!isDomainDetailPage && detailsPage) {
      clearDetailsPage();
    }
  }, [clearDetailsPage, detailsPage, isDomainDetailPage, pathname]);

  const breadcrumb = pathToBreadcrumb[breadcrumbKey];
  const domainBreadcrumbParts = detailsPage?.split(" / ") ?? [];

  return (
    <AuthGuard>
      <AppSidebar />
      <SidebarInset className="min-h-0 min-w-0 overflow-hidden">
        <header
          className={cn(
            "sticky top-0 z-20 flex h-14 shrink-0 items-center transition-colors duration-200",
            isScrolled ? "bg-background" : "bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/70",
            !isDomainDetailPage && "border-b border-sidebar-border/40",
          )}
        >
          <SidebarTrigger className="absolute left-4 size-8 md:left-6" />
          <div className="flex w-full items-center justify-center px-4 md:px-6">
            <div className="min-w-0 overflow-x-auto">
              <Breadcrumb>
                <BreadcrumbList className="flex-nowrap gap-1.5 text-sm whitespace-nowrap">
                  {pathname === "/settings" ? (
                    <SettingsBreadcrumb />
                  ) : isDomainDetailPage ? (
                    <>
                      <BreadcrumbItem>
                        <BreadcrumbLink asChild>
                          <Link href="/assets/domains">Domains</Link>
                        </BreadcrumbLink>
                      </BreadcrumbItem>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        <BreadcrumbPage
                          className={cn(
                            "inline-block max-w-[240px] truncate",
                            domainBreadcrumbParts[1] && "text-muted-foreground",
                          )}
                        >
                          {domainBreadcrumbParts[0] ?? <Skeleton className="h-4 w-24" />}
                        </BreadcrumbPage>
                      </BreadcrumbItem>
                      {domainBreadcrumbParts[1] ? (
                        <>
                          <BreadcrumbSeparator className="px-0" />
                          <BreadcrumbItem>
                            <BreadcrumbPage>{domainBreadcrumbParts[1]}</BreadcrumbPage>
                          </BreadcrumbItem>
                        </>
                      ) : null}
                    </>
                  ) : // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                  breadcrumb ? (
                    detailsPage ? (
                      <>
                        <BreadcrumbItem>
                          <BreadcrumbLink asChild>
                            <Link href="#">{breadcrumb.category}</Link>
                          </BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                          <BreadcrumbLink
                            className="cursor-pointer"
                            onClick={() => {
                              clearDetailsPage();
                            }}
                          >
                            {breadcrumb.page}
                          </BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                          <BreadcrumbPage className="max-w-[260px] truncate">{detailsPage}</BreadcrumbPage>
                        </BreadcrumbItem>
                      </>
                    ) : (
                      <>
                        <BreadcrumbItem>
                          <BreadcrumbLink asChild>
                            <Link href="#">{breadcrumb.category}</Link>
                          </BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                          <BreadcrumbPage>{breadcrumb.page}</BreadcrumbPage>
                        </BreadcrumbItem>
                      </>
                    )
                  ) : (
                    <BreadcrumbItem>
                      <BreadcrumbPage>Page</BreadcrumbPage>
                    </BreadcrumbItem>
                  )}
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </div>
        </header>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col pt-1 pl-2 pr-2">
          <PageTransition>{children}</PageTransition>
        </div>
      </SidebarInset>
    </AuthGuard>
  );
}
