import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";

export function PageSkeleton() {
  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-svh w-full bg-background">
        {/* Sidebar Skeleton */}
        <Sidebar className="border-r">
          <SidebarHeader>
            <div className="flex items-center gap-2 p-2">
              <Skeleton className="size-8 rounded-md" />
              <div className="flex flex-col gap-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent className="p-2">
            <div className="flex flex-col gap-4">
              {/* Nav Main Skeleton */}
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-20 px-2" />
                <Skeleton className="h-8 w-full rounded-md" key="nav-main-0" />
                <Skeleton className="h-8 w-full rounded-md" key="nav-main-1" />
                <Skeleton className="h-8 w-full rounded-md" key="nav-main-2" />
                <Skeleton className="h-8 w-full rounded-md" key="nav-main-3" />
              </div>
              {/* Nav Projects Skeleton */}
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-20 px-2" />
                <Skeleton className="h-8 w-full rounded-md" key="nav-projects-0" />
                <Skeleton className="h-8 w-full rounded-md" key="nav-projects-1" />
                <Skeleton className="h-8 w-full rounded-md" key="nav-projects-2" />
              </div>
            </div>
          </SidebarContent>
          <SidebarFooter className="p-2">
            <div className="flex items-center gap-2 rounded-md border p-2">
              <Skeleton className="size-8 rounded-md" />
              <div className="flex flex-col gap-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          </SidebarFooter>
          <SidebarRail />
        </Sidebar>

        {/* Main Content Skeleton */}
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <Skeleton className="size-8 rounded-md" /> {/* Trigger */}
            <div className="mx-2 h-4 w-px bg-border" />
            <Skeleton className="h-4 w-32" /> {/* Breadcrumb */}
          </header>
          <div className="flex flex-1 flex-col gap-4 p-4">
            <div className="grid auto-rows-min gap-4 md:grid-cols-3">
              <Skeleton className="aspect-video rounded-xl" />
              <Skeleton className="aspect-video rounded-xl" />
              <Skeleton className="aspect-video rounded-xl" />
            </div>
            <Skeleton className="min-h-[100vh] flex-1 rounded-xl md:min-h-min" />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
