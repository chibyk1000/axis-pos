"use client";

import * as React from "react";
import {
  Archive,
  ArrowLeft,
  AudioWaveform,
  BadgeDollarSign,
  BookText,
  Building2,
  ChartBar,
  CirclePercent,
  Command,
  Contact,
  CreditCard,
  GalleryVerticalEnd,
  Gift,
  Globe,
  LayoutDashboard,
  Shield,
  Tags,
} from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { useAuth } from "@/providers/auth-provider";
import { hasPermission, permissionForUrl } from "@/lib/security";

// import { NavUser } from "@/components/nav-user"

import {
  Sidebar,
  SidebarContent,
  // SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { useNavigate } from "react-router";
import { Button } from "./ui/button";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const navigate = useNavigate();
  const auth = useAuth();
  const canAccess = (url: string) =>
    hasPermission(auth.user?.accessLevel ?? 0, permissionForUrl(url));

  // This is sample data.
  const data = {
    user: {
      name: auth.user?.username ?? "—",
      email: "",
      avatar: "/avatars/shadcn.jpg",
    },
    teams: [
      {
        name: "Acme Inc",
        logo: GalleryVerticalEnd,
        plan: "Enterprise",
      },
      {
        name: "Acme Corp.",
        logo: AudioWaveform,
        plan: "Startup",
      },
      {
        name: "Evil Corp.",
        logo: Command,
        plan: "Free",
      },
    ],
    navMain: [
      {
        title: "Dashboard",
        url: "/dashboard",
        icon: LayoutDashboard,
        isActive: true,
        disabled: !canAccess("/dashboard"),
      },
      {
        title: "Documents",
        url: "/dashboard/documents",
        icon: BookText,
        disabled: !canAccess("/dashboard/documents"),
      },
      {
        title: "Products",
        icon: Tags,
        url: "/dashboard/products",
        disabled: !canAccess("/dashboard/products"),
      },
      {
        title: "Price lists",
        url: "/dashboard/price-lists",
        icon: BadgeDollarSign,
        disabled: !canAccess("/dashboard/price-lists"),
      },
      {
        title: "Stock",
        url: "/dashboard/stocks",
        icon: Archive,
        disabled: !canAccess("/dashboard/stocks"),
      },
      {
        title: "Reporting",
        url: "/dashboard/reporting",
        icon: ChartBar,
        disabled: !canAccess("/dashboard/reporting"),
      },
      {
        title: "Customer & Suppliers",
        url: "/dashboard/customer-supplies",
        icon: Contact,
        disabled: !canAccess("/dashboard/customer-supplies"),
      },
      {
        title: "Promotions",
        url: "/dashboard/promotions",
        icon: Gift,
        disabled: !canAccess("/dashboard/promotions"),
      },
      {
        title: "Users & Security",
        url: "/dashboard/users-security",
        icon: Shield,
        disabled: !canAccess("/dashboard/users-security"),
      },
      {
        title: "Payment types",
        url: "/dashboard/payments",
        icon: CreditCard,
        disabled: !canAccess("/dashboard/payments"),
      },
      {
        title: "Countries",
        url: "/dashboard/countries",
        icon: Globe,
        disabled: !canAccess("/dashboard/countries"),
      },
      {
        title: "Tax rates",
        url: "/dashboard/tax-rates",
        icon: CirclePercent,
        disabled: !canAccess("/dashboard/tax-rates"),
      },
      {
        title: "My company",
        url: "/dashboard/company",
        icon: Building2,
        disabled: !canAccess("/dashboard/company"),
      },
    ],
  };
  return (
    <Sidebar collapsible="icon" {...props} className="bg-black">
      <SidebarHeader className="bg-white dark:bg-slate-950">
        <Button
          size={"icon"}
          variant={"secondary"}
          className="rounded-2xl"
          onClick={() => {
            navigate("/");
          }}
        >
          <ArrowLeft />
        </Button>
      </SidebarHeader>
      <SidebarContent className="bg-white dark:bg-slate-950">
        <NavMain items={data.navMain} />
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}
