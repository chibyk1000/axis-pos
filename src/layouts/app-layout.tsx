import { AppSidebar } from "@/components/app-sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

import { Outlet, useLocation } from "react-router";
import { SyncStatusWidget } from "@/components/SyncStatusWidget";

const Applayout = () => {
  const location = useLocation();

  // h-svh + overflow-hidden clamp the app shell to the viewport — the
  // provider's own class is only min-h-svh (no max), so a tall table would
  // otherwise grow the whole page and scroll the window instead of the
  // table body.
  return (
    <SidebarProvider className="bg-stone-950 w-screen h-svh overflow-hidden">
      <AppSidebar />
      <SidebarInset className="bg-white dark:bg-stone-900 flex-1 min-h-0 overflow-hidden">
        <header className="flex h-16 shrink-0 pr-4 items-center justify-between transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1 text-stone-900 dark:text-white" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4 bg-black"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="#">Dashboard</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem className="text-stone-900 dark:text-white">
                  <BreadcrumbPage className="text-stone-900 dark:text-white">
                    {location.pathname !== "/dashboard" &&
                      location.pathname.split("/").slice(2)}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="flex items-center gap-4">
            <SyncStatusWidget />
          </div>
        </header>
        <div className="flex flex-1 min-h-0 overflow-hidden flex-col">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default Applayout;
