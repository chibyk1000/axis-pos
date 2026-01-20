"use client"

import * as React from "react"
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
} from "lucide-react"

import { NavMain } from "@/components/nav-main"

import { NavUser } from "@/components/nav-user"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { useNavigate } from "react-router"
import { Button } from "./ui/button"


export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
const navigate = useNavigate()
  // This is sample data.
  const data = {
    user: {
      name: "shadcn",
      email: "m@example.com",
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
      },
      {
        title: "Documents",
        url: "/dashboard/documents",
        icon: BookText,
      },
      {
        title: "Products",
  
        icon: Tags,
        url: "/dashboard/products",
      },
  
      {
        title: "Price lists",
        url: "/dashboard/price-lists",
        icon: BadgeDollarSign,
      },
      {
        title: "Stock",
        url: "/dashboard/stocks",
        icon: Archive,
      },
      {
        title: "Reporting",
        url: "/dashboard/reporting",
        icon: ChartBar,
      },
      {
        title: "Customer & Suppliers",
        url: "/dashboard/customer-supplies",
        icon: Contact,
      },
      {
        title: "Promotions",
        url: "/dashboard/promotions",
        icon: Gift,
      },
  
      {
        title: "Users & Security",
        url: "/dashboard/users-security",
        icon: Shield,
      },
      {
        title: "Payment types",
        url: "/dashboard/payments",
        icon: CreditCard,
      },
      {
        title: "Countries",
        url: "/dashboard/countries",
        icon: Globe,
      },
  
      {
        title: "Tax rates",
        url: "/dashboard/tax-rates",
        icon: CirclePercent,
      },
      {
        title: "My company",
        url: "/dashboard/company",
        icon: Building2,
      },
    ],
  };
  return (
    <Sidebar collapsible="icon" {...props} className="bg-black">
      <SidebarHeader className="bg-slate-950">
        <Button size={"icon"} variant={"secondary"} className="rounded-2xl" onClick={() => {
          navigate("/")
        }}>
          <ArrowLeft />
        </Button>
      </SidebarHeader>
      <SidebarContent className="bg-slate-950">
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter className="bg-transparent">
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
