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
                py-3 text-xs
                ${item.disabled ? "text-stone-400 dark:text-stone-600 cursor-not-allowed opacity-50" : "text-stone-700 dark:text-stone-300 hover:text-orange-400 hover:bg-orange-500/10"}
                data-[active=true]:bg-orange-500
                data-[active=true]:text-stone-900 dark:text-white
              `}
            >
              {item.icon && (
                <item.icon
                  className={`
                    size-6
                    ${item.disabled ? "text-stone-400 dark:text-stone-600" : "text-stone-500 dark:text-stone-400 group-hover:text-orange-100"}
                    data-[active=true]:text-stone-900 dark:text-white
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
