import { type LucideIcon } from "lucide-react";

import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Link, useLocation } from "react-router";

export function NavMain({
  items,
}: {
  items: {
    title: string;
    url: string;
    icon?: LucideIcon;
    isActive?: boolean;
    disabled?: boolean;
  }[];
}) {
  const location = useLocation();

  return (
    <SidebarGroup>
      <SidebarMenu>
        {items.map((item) => {
          const active = location.pathname === item.url;
          const buttonContent = (
            <SidebarMenuButton
              tooltip={item.title}
              data-active={active}
              className={`
                py-5 text-base
                ${item.disabled ? "text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-50" : "text-slate-700 dark:text-slate-300 hover:text-indigo-400 hover:bg-indigo-500/10"}
                data-[active=true]:bg-indigo-500
                data-[active=true]:text-slate-900 dark:text-white
              `}
            >
              {item.icon && (
                <item.icon
                  className={`
                    size-10
                    ${item.disabled ? "text-slate-400 dark:text-slate-600" : "text-slate-500 dark:text-slate-400 group-hover:text-indigo-100"}
                    data-[active=true]:text-slate-900 dark:text-white
                  `}
                />
              )}
              <span>{item.title}</span>
            </SidebarMenuButton>
          );

          return (
            <SidebarMenuItem key={item.title}>
              {item.disabled ? (
                buttonContent
              ) : (
                <Link to={item.url}>{buttonContent}</Link>
              )}
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
