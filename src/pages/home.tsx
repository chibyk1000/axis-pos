"use client";

import { useState } from "react";
import {
  X,
  Search,
  Plus,
  Percent,
  MessageSquare,
  Save,
  RefreshCw,
  Lock,
  Copy,
  Trash2,
  Menu,
  Hash,
  Accessibility,
  User,
  UserCheck,
} from "lucide-react";
import { BsThreeDots } from "react-icons/bs";
import { TbBasketPlus } from "react-icons/tb";
import { ImDrawer } from "react-icons/im";

import { Group, Panel, Separator } from "react-resizable-panels";
import { SidebarDrawer } from "@/components/sidebar-drawer";
import { ResponsiveIcon } from "@/components/responsive-icon";

export default function AroniumLite() {
  const [searchInput, setSearchInput] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="h-dvh w-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden">
      {/* Drawer */}
      <SidebarDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-cyan-400 text-black flex items-center justify-center text-xs font-bold">
              A
            </div>
            <span className="text-sm font-medium">Aronium Lite</span>
          </div>

          <div className="flex-1 max-w-md">
            <div className="flex items-center bg-slate-950 border border-slate-700 rounded px-3 py-2">
              <Search className="w-4 h-4 text-slate-400 mr-2" />
              <input
                placeholder="Search products by code"
                className="bg-transparent outline-none w-full text-sm"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 text-slate-300">
            <Menu className="w-5 h-5 cursor-pointer" />
            <Hash className="w-5 h-5 cursor-pointer" />
            <Search className="w-5 h-5 cursor-pointer" />
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 p-4 overflow-hidden">
        <Group orientation="horizontal" className="h-full gap-3">
          {/* LEFT PANEL */}
          <Panel defaultSize={75} minSize={50}>
            <div className="h-full flex flex-col rounded border border-slate-800 bg-slate-900">
              {/* Table Header */}
              <div className="grid grid-cols-4 px-6 py-4 text-sm font-semibold border-b border-slate-800 bg-slate-900">
                <div>Product</div>
                <div className="text-right">Qty</div>
                <div className="text-right">Price</div>
                <div className="text-right">Amount</div>
              </div>

              {/* Empty State */}
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-slate-400">
                  <p className="text-2xl font-semibold mb-2">No items</p>
                  <p className="text-sm text-slate-500">
                    Scan barcode or press F3 to search
                  </p>
                </div>
              </div>

              {/* Totals */}
              <div className="border-t border-slate-800 bg-slate-900 px-6 py-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>0.00</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Tax</span>
                  <span>0.00</span>
                </div>
                <div className="pt-2 border-t border-slate-800 flex justify-between font-bold">
                  <span>Total</span>
                  <span className="text-lg">0.00</span>
                </div>
              </div>
            </div>
          </Panel>

          {/* RESIZER */}
          <Separator className="w-[2px] bg-slate-700 hover:bg-slate-500 transition" />

          {/* RIGHT PANEL */}
          <Panel defaultSize={25} minSize={280}>
            <div className="h-full flex flex-col gap-3">
              {/* Top Buttons */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { icon: X, label: "Delete" },
                  { icon: Search, label: "Search", key: "F4" },
                  { icon: TbBasketPlus, label: "Qty", key: "F8" },
                  { icon: Plus, label: "New" },
                ].map(({ icon, label, key }) => (
                  <button
                    key={label}
                    className="relative bg-slate-900 border border-slate-800 rounded hover:bg-slate-800 flex flex-col items-center justify-center aspect-square"
                  >
                    {key && (
                      <span className="absolute top-1 left-1 text-[10px]">
                        {key}
                      </span>
                    )}
                    <ResponsiveIcon icon={icon} className="size-7" />
                    <span className="text-xs">{label}</span>
                  </button>
                ))}
              </div>
              {/* Payments */}
              <div className="grid grid-cols-2 gap-2">
                <button className="bg-slate-900 border-b-2 border-emerald-500 rounded h-14 hover:bg-slate-800">
                  F12 Cash
                </button>
                <button className="bg-slate-900 border-b-2 border-blue-500 rounded h-14 hover:bg-slate-800">
                  Card
                </button>
              </div>
              {/* Secondary Actions */}
              <div className="grid grid-cols-4 gap-2 mt-auto">
                {[
                  { icon: ImDrawer, label: "Cash drawer" },
                  { icon: Accessibility, label: "Dine-in" },
                ].map(({ icon, label }) => (
                  <button
                    key={label}
                    className="bg-slate-900 border border-slate-800 hover:bg-slate-800
                 rounded flex flex-col items-center justify-center
                 min-h-[72px]"
                  >
                    <ResponsiveIcon
                      icon={icon}
                      className="size-[clamp(20px,3vw,32px)]"
                    />
                    <span className="text-[clamp(10px,1vw,12px)]">{label}</span>
                  </button>
                ))}
              </div>
              {/* Middle Row */}{" "}
              <div className="grid grid-cols-4 gap-2">
                {" "}
                <button className="bg-slate-900 border border-slate-800 hover:bg-slate-800p-4 rounded flex flex-col items-center justify-center gap-2 h-24 relative">
                  {" "}
                  <ResponsiveIcon icon={Percent} className="size-10" />{" "}
                  <div className="text-xs font-semibold absolute top-2 left-2">
                    {" "}
                    F2{" "}
                  </div>{" "}
                  <div className="text-xs">Discount</div>{" "}
                </button>{" "}
                <button className="bg-slate-900 border border-slate-800 hover:bg-slate-800p-4 rounded flex flex-col items-center justify-center gap-2 h-24">
                  {" "}
                  <ResponsiveIcon
                    icon={MessageSquare}
                    className="size-10"
                  />{" "}
                  <div className="text-xs">Comment</div>{" "}
                </button>{" "}
                <button className="bg-slate-900 border border-slate-800 hover:bg-slate-800p-4 rounded flex flex-col items-center justify-center gap-2 h-24">
                  {" "}
                  <ResponsiveIcon icon={UserCheck} className="size-10" />{" "}
                  <div className="text-xs">Customer</div>{" "}
                </button>{" "}
                <button className="bg-slate-900 border border-slate-800 hover:bg-slate-800p-4 rounded flex flex-col items-center justify-center gap-2 h-24">
                  {" "}
                  <ResponsiveIcon icon={User} className="size-10" />{" "}
                  <div className="text-xs">chibuike</div>{" "}
                </button>{" "}
              </div>{" "}
              {/* Bottom Row */}{" "}
              <div className="grid grid-cols-2 gap-2 ">
                {" "}
                <div className="grid grid-cols-2 gap-2">
                  {" "}
                  <button className="bg-slate-900 border border-slate-800 hover:bg-slate-800p-4 rounded flex flex-col items-center justify-center gap-2 h-32">
                    {" "}
                    <ResponsiveIcon icon={Save} className="size-8" />{" "}
                    <div className="text-xs font-semibold">F9</div>{" "}
                    <div className="text-xs">Save sale</div>{" "}
                  </button>{" "}
                  <button className="bg-slate-900 border border-slate-800 hover:bg-slate-800p-4 rounded flex flex-col items-center justify-center gap-2 h-32">
                    {" "}
                    <ResponsiveIcon icon={RefreshCw} className="size-8" />{" "}
                    <div className="text-xs">Refund</div>{" "}
                  </button>{" "}
                </div>{" "}
                <button className="bg-[#4caf50] hover:bg-[#45a049] p-4 rounded flex flex-col items-center justify-center gap-2 col-span-1 text-black font-semibold">
                  {" "}
                  <div className="text-2xl">F10</div> <div>Payment</div>{" "}
                </button>{" "}
              </div>{" "}
              {/* Lock and Transfer */}{" "}
              <div className="grid grid-cols-4 gap-2 ">
                {" "}
                <button className="bg-slate-900 border border-slate-800 hover:bg-slate-800p-4 rounded flex flex-col items-center justify-center gap-2 h-30">
                  {" "}
                  <ResponsiveIcon icon={Lock} className="size-10" />{" "}
                  <div className="text-xs">Lock</div>{" "}
                </button>{" "}
                <button className="bg-slate-900 border border-slate-800 hover:bg-slate-800p-4 rounded flex flex-col items-center justify-center gap-2 h-30">
                  {" "}
                  <ResponsiveIcon icon={Copy} className="size-10" />{" "}
                  <div className="text-xs font-semibold">F7</div>{" "}
                  <div className="text-xs">Transfer</div>{" "}
                </button>{" "}
                <button className="bg-[#d32f2f] hover:bg-[#b71c1c] p-4 rounded flex flex-col items-center justify-center gap-2 h-30 text-white">
                  {" "}
                  <ResponsiveIcon icon={Trash2} className="size-10" />{" "}
                  <div className="text-xs font-semibold">Void order</div>{" "}
                </button>{" "}
                <button
                  className="bg-slate-900 border border-slate-800 hover:bg-slate-800p-4 rounded flex flex-col items-center justify-center gap-2 h-30 text-white"
                  onClick={() => setDrawerOpen(true)}
                >
                  {" "}
                  <ResponsiveIcon icon={BsThreeDots} className="size-10" />{" "}
                  {/* <div className="text-xs font-semibold">Void order</div> */}{" "}
                </button>{" "}
              </div>
            </div>
          </Panel>
        </Group>
      </main>
    </div>
  );
}
