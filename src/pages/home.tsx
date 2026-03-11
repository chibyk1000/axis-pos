"use client";

import { useMemo, useState } from "react";
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
import Select from "react-select";
import { Group, Panel, Separator } from "react-resizable-panels";
import { SidebarDrawer } from "@/components/sidebar-drawer";
import { ResponsiveIcon } from "@/components/responsive-icon";
import { useProducts } from "@/hooks/controllers/products";

export default function AroniumLite() {
 
  const [drawerOpen, setDrawerOpen] = useState(false);
  const products = useProducts()
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
const [selectedProduct, setSelectedProduct] = useState<any>(null);
const [qtyModalOpen, setQtyModalOpen] = useState(false);
const [quantity, setQuantity] = useState("1");
const [items, setItems] = useState<any[]>([]);

  const productOptions =
    products?.data?.map((p) => ({
      value: p.id,
      label: `${p.title} - #${p.cost}`,
      product: p,
    })) || [];
const addItem = () => {
  if (!selectedProduct) return;

  const qty = Number(quantity);

  setItems((prev) => {
    const existing = prev.find((i) => i.id === selectedProduct.id);

    if (existing) {
      return prev.map((i) => (i.id === selectedProduct.id ? { ...i, qty } : i));
    }

    return [
      ...prev,
      {
        ...selectedProduct,
        qty,
      },
    ];
  });

  setQtyModalOpen(false);
  setSelectedProduct(null);
};
  
  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => {
      return sum + item.qty * item.cost;
    }, 0);
  }, [items]);

  const taxRate = 0; // change if you want tax (e.g. 0.075 for 7.5%)

  const tax = useMemo(() => {
    return subtotal * taxRate;
  }, [subtotal]);

  const total = useMemo(() => {
    return subtotal + tax;
  }, [subtotal, tax]);
  const deleteSelectedItem = () => {
    if (!selectedItemId) return;

    setItems((prev) => prev.filter((i) => i.id !== selectedItemId));
    setSelectedItemId(null);
  };

  const editSelectedQty = () => {
    if (!selectedItemId) return;

    const item = items.find((i) => i.id === selectedItemId);
    if (!item) return;

    setSelectedProduct(item);
    setQuantity(String(item.qty));
    setQtyModalOpen(true);
  };
  return (
    <div className="h-dvh w-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden">
      {/* Drawer */}

      {qtyModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-lg w-80 p-6">
            <h2 className="text-lg font-semibold mb-4">
              {selectedProduct?.title}
            </h2>

            <input
              autoFocus
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addItem();
              }}
              className="w-full text-center text-3xl bg-slate-950 border border-slate-700 rounded p-3 outline-none"
            />

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setQtyModalOpen(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 p-2 rounded"
              >
                Cancel
              </button>

              <button
                onClick={addItem}
                className="flex-1 bg-green-600 hover:bg-green-500 p-2 rounded"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
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
            <Select
              options={productOptions}
              placeholder="Search product..."
              isSearchable
              onChange={(option: any) => {
                if (!option) return;

                setSelectedProduct(option.product);
                setQuantity("1");
                setQtyModalOpen(true);
              }}
              className="text-sm"
              styles={{
                control: (base) => ({
                  ...base,
                  backgroundColor: "#020617",
                  borderColor: "#334155",
                  minHeight: "36px",
                }),
                menu: (base) => ({
                  ...base,
                  backgroundColor: "#020617",
                }),
                option: (base, state) => ({
                  ...base,
                  backgroundColor: state.isFocused ? "#1e293b" : "#020617",
                  color: "#e2e8f0",
                  cursor: "pointer",
                }),
                singleValue: (base) => ({
                  ...base,
                  color: "#e2e8f0",
                }),
                input: (base) => ({
                  ...base,
                  color: "#e2e8f0",
                }),
              }}
            />
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
              <div className="flex-1 overflow-auto">
                {items.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-slate-400">
                    <div className="text-center">
                      <p className="text-2xl font-semibold mb-2">No items</p>
                      <p className="text-sm text-slate-500">
                        Scan barcode or press F3 to search
                      </p>
                    </div>
                  </div>
                ) : (
                  items.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setSelectedItemId(item.id)}
                      className={`grid grid-cols-4 px-6 py-3 border-b border-slate-800 cursor-pointer
      ${selectedItemId === item.id ? "bg-green-800" : ""}
    `}
                    >
                      <div>{item.title}</div>
                      <div className="text-right">{item.qty}</div>
                      <div className="text-right">{item.cost}</div>
                      <div className="text-right">
                        {(item.qty * item.cost).toFixed(2)}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Totals */}
              <div className="border-t border-slate-800 bg-slate-900 px-6 py-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>{subtotal.toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-sm">
                  <span>Tax</span>
                  <span>{tax.toFixed(2)}</span>
                </div>

                <div className="pt-2 border-t border-slate-800 flex justify-between font-bold">
                  <span>Total</span>
                  <span className="text-lg">{total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </Panel>

          {/* RESIZER */}
          <Separator className="w-0.5 bg-slate-700 hover:bg-slate-500 transition" />

          {/* RIGHT PANEL */}
          <Panel defaultSize={25} minSize={280}>
            <div className="h-full flex flex-col gap-3">
              {/* Top Buttons */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { icon: X, label: "Delete", action: deleteSelectedItem },
                  { icon: Search, label: "Search", key: "F4" },
                  {
                    icon: TbBasketPlus,
                    label: "Qty",
                    key: "F8",
                    action: editSelectedQty,
                  },
                  { icon: Plus, label: "New" },
                ].map(({ icon, label, key, action }) => (
                  <button
                    key={label}
                    onClick={action}
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
                 min-h-18"
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
