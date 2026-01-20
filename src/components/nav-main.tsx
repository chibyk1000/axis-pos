import {  type LucideIcon } from "lucide-react"

import {
  SidebarGroup,

  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
 
} from "@/components/ui/sidebar"
import { Link, useLocation } from "react-router";

export function NavMain({
  items,
}: {
  items: {
    title: string;
    url: string;
    icon?: LucideIcon;
    isActive?: boolean;
  }[];
  }) {
    const location = useLocation();

  
  return (
    <SidebarGroup>
      <SidebarMenu>
        {items.map((item) => {
          const active = location.pathname === item.url
         return (
            <SidebarMenuItem key={item.title}>
              <Link to={item.url}>
                <SidebarMenuButton
              
                  tooltip={item.title}
                  data-active={active}
                  className={`
                py-5 text-base
                text-slate-300
                hover:text-indigo-400
                hover:bg-indigo-500/10

                data-[active=true]:bg-indigo-500
                data-[active=true]:text-white
              `}
                >
                  {item.icon && (
                    <item.icon
                      className={`
                    size-10
                    text-slate-400
                    group-hover:text-indigo-100
                    data-[active=true]:text-white
                  `}
                    />
                  )}
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}

