"use client";

import {
  ChevronRight,
  Settings,
  Maximize2,
  Power,

  CheckCheck,
  Layers,
  Notebook,
  Settings2,
} from "lucide-react";

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";

import { FaDownload, FaRunning } from "react-icons/fa";
import { Link, useNavigate } from "react-router";
import { useAuth } from "@/providers/auth-provider";


interface SidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SidebarDrawer({ isOpen, onClose }: SidebarDrawerProps) {
  const today = new Date().toLocaleDateString("en-GB");
  const navigate = useNavigate();
  const { logout,user } = useAuth();
  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent
        data-vaul-drawer-direction="right"
        className="h-screen w-72 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 p-0"
      >
        {/* Header */}
        <DrawerHeader className="border-b border-slate-200 dark:border-slate-700 px-4 py-4 flex flex-row items-center justify-between">
          <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
            POS – {user?.username}
          </span>

          <DrawerClose asChild>
            <button className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white p-1">
              <ChevronRight className="w-5 h-5" />
            </button>
          </DrawerClose>
        </DrawerHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto flex flex-col">
          {/* Management */}
          <div className="border-b border-slate-200 dark:border-slate-700">
            <Link
              to="/dashboard"
              className="px-4 py-4 flex items-center gap-3 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:bg-slate-700/60"
            >
              <Settings2 className="w-5 h-5" />
              <span className="text-sm font-medium">Management</span>
            </Link>

            <div className="space-y-1">
              {[
                { icon: <CheckCheck />, label: "View sales history", link:"/sales-history" },
                { icon: <Layers />, label: "View open sales", link:"/open-sales" },
                { icon: <FaDownload />, label: "Cash in / Out", link:"/cash-in-out" },
                { icon: <Notebook />, label: "Credit payments", link:"/credit-payments" },
                { icon: <FaRunning />, label: "End of day", link:"/end-of-day" },
              ].map((item) => (
                <button
                  onClick={()=>{
                    navigate(item.link)
                  }}
                  key={item.label}
                  className="w-full px-4 py-3 flex items-center gap-3 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:bg-slate-700/60 text-sm"
                >
                  <span className="w-5 flex justify-center">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* User */}
          <div className="border-b border-slate-200 dark:border-slate-700">
            <div className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              User
            </div>

            {[
              { icon: "📄", label: "Documents", action: () => { navigate("/"); onClose(); } },
              { icon: "🛒", label: "POS", action: () => { navigate("/pos"); onClose(); } },
              { icon: "👤", label: "User info", action: () => { navigate("/user-info"); onClose(); } },
              { icon: "🚪", label: "Sign out", action: () => { logout(); onClose(); } },
            ].map((item) => (
              <div
                key={item.label}
                onClick={item.action}
                className="px-4 py-3 flex items-center gap-3 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:bg-slate-700/60 cursor-pointer text-sm"
              >
                <span className="w-5 text-center">{item.icon}</span>
                <span>{item.label}</span>
              </div>
            ))}
          </div>

          {/* Feedback */}
       
        </div>

        {/* Footer */}
        <DrawerFooter className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-0">
          <div className="px-4 py-3 text-center text-xs text-slate-500 dark:text-slate-400">
            {today}
          </div>

          <div className="flex items-center justify-center gap-4 pb-4">
            <Link
              to="/settings"
              onClick={() => onClose()}
              className="p-2 rounded text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white hover:bg-slate-100 dark:bg-slate-700"
            >
              <Settings className="w-5 h-5" />
            </Link>
            <button
              onClick={() => {
                if (!document.fullscreenElement) {
                  document.documentElement.requestFullscreen().catch(console.error);
                } else {
                  document.exitFullscreen();
                }
              }}
              className="p-2 rounded text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white hover:bg-slate-100 dark:bg-slate-700"
            >
              <Maximize2 className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                logout();
                onClose();
              }}
              className="p-2 rounded text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              title="Logout"
            >
              <Power className="w-5 h-5" />
            </button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
