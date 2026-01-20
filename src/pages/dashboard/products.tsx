"use client";

import { AddGroupDrawer } from "@/components/products/add-group-drawer";
import AddProductDrawer from "@/components/products/add-product-drawer";
import PriceTagsPage from "@/components/products/price-tag";
import { ChevronDownIcon } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";

export function ProductsView() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedGroups, setExpandedGroups] = useState(["group-1"]);
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [addProductDrawerOpen, setAddProductDrawerOpen] = useState(false);
  const navigate = useNavigate()
  const productGroups = [
    {
      id: "group-1",
      name: "Products",
      children: [{ id: "subgroup-1", name: "group one" }],
    },
  ];

  const products = [
    {
      id: 1,
      code: "1",
      name: "makers",
      group: "Products",
      barcode: "2512291239222",
      cost: 399.0,
      salePrice: 418.95,
      taxes: 0,
      salePrice2: 418.95,
      action: "-",
    },
  ];

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) =>
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId],
    );
  };

  const toggleProductSelection = (productId: number) => {
    setSelectedProducts((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId],
    );
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-900 text-slate-200 ">
      {/* Header */}

      <AddGroupDrawer
        open={drawerOpen}
        onOpenChange={() => setDrawerOpen(false)}
        groups={productGroups}
        onSave={(name, parentId) => {
          console.log("New group:", name, "Parent:", parentId);
          // Add to productGroups state or API call
        }}
      />

      <AddProductDrawer
        groups={productGroups}
        onOpenChange={() => setAddProductDrawerOpen(false)}
        open={addProductDrawerOpen}
        onSave={(data) => {}}
      />
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex items-center justify-between">
        <span className="text-sm text-slate-300">Management • Products</span>
        <button className="text-slate-400 hover:text-indigo-400 transition">
          <ChevronDownIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Toolbar */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-4">
        <div className="flex flex-wrap gap-3 mb-3">
          <ToolbarButton icon="↻" label="Refresh" />
          <ToolbarButton
            icon="📁"
            label="New group"
            onClick={() => setDrawerOpen(true)}
          />
          <ToolbarButton icon="✎" label="Edit group" />
          <ToolbarButton icon="🗑" label="Delete group" danger />
          <ToolbarButton
            icon="+"
            label="New product"
            onClick={() => setAddProductDrawerOpen(true)}
          />
          <ToolbarButton icon="✏️" label="Edit product" />
          <ToolbarButton icon="🗑" label="Delete product" danger />
          <ToolbarButton icon="🖨" label="Print" />
          <ToolbarButton icon="📄" label="Save as PDF" />
          <ToolbarButton
            icon="#️⃣"
            label="Price tags"
            onClick={() => navigate("/price-tags")}
          />
          <ToolbarButton
            icon="↕"
            label="Sorting"
            onClick={() => navigate("/sorting")}
          />
          <ToolbarButton
            icon="📊"
            label="Mov. avg. price"
            onClick={() => navigate("/moving-average-price")}
          />
        </div>
        <div className="flex gap-3">
          <ToolbarButton
            icon="⬇"
            label="Import"
            onClick={() => navigate("/import")}
          />
          <ToolbarButton icon="⬆" label="Export" />
          <ToolbarButton icon="?" label="Help" />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-56 bg-slate-900 border-r border-slate-800 overflow-y-auto">
          <div className="p-4">
            {productGroups.map((group) => (
              <div key={group.id}>
                <div
                  className="flex items-center gap-2 cursor-pointer py-2 px-3 rounded
                    text-slate-300 hover:text-indigo-400 hover:bg-indigo-500/10 transition"
                  onClick={() => toggleGroup(group.id)}
                >
                  <ChevronDownIcon
                    className={`w-4 h-4 transition-transform ${
                      expandedGroups.includes(group.id)
                        ? "rotate-0"
                        : "-rotate-90"
                    }`}
                  />
                  <span className="font-semibold text-sm">📁 {group.name}</span>
                </div>

                {expandedGroups.includes(group.id) && (
                  <div className="ml-6 space-y-1">
                    {group.children.map((child) => (
                      <div
                        key={child.id}
                        className="py-2 px-3 text-sm rounded cursor-pointer
                          text-slate-300 hover:text-indigo-400 hover:bg-indigo-500/10 transition"
                      >
                        📁 {child.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search Bar */}
          <div className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1 max-w-md">
              <span className="text-slate-500">🔍</span>
              <input
                type="text"
                placeholder="Product name"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-800 text-slate-200 px-3 py-2 rounded text-sm w-full
                  placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="text-sm text-slate-400">
              Products count: {products.length}
            </div>
          </div>

          {/* Products Table */}
          <div className="flex-1 overflow-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-slate-800 border-b border-slate-700 sticky top-0">
                  <th className="p-3 text-left">
                    <input type="checkbox" />
                  </th>
                  <th className="p-3 text-left text-indigo-400">Code</th>
                  <th className="p-3 text-left">Name</th>
                  <th className="p-3 text-left">Group</th>
                  <th className="p-3 text-left">Barcode</th>
                  <th className="p-3 text-left">Cost</th>
                  <th className="p-3 text-left">Sale price…</th>
                  <th className="p-3 text-left">Taxes</th>
                  <th className="p-3 text-left">Sale price</th>
                  <th className="p-3 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr
                    key={product.id}
                    className="border-b border-slate-800
                      hover:bg-indigo-500/5 transition"
                  >
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={selectedProducts.includes(product.id)}
                        onChange={() => toggleProductSelection(product.id)}
                      />
                    </td>
                    <td className="p-3">{product.code}</td>
                    <td className="p-3">{product.name}</td>
                    <td className="p-3">{product.group}</td>
                    <td className="p-3 text-slate-400">{product.barcode}</td>
                    <td className="p-3">{product.cost.toFixed(2)}</td>
                    <td className="p-3">{product.salePrice.toFixed(2)}</td>
                    <td className="p-3">{product.taxes}</td>
                    <td className="p-3">{product.salePrice2.toFixed(2)}</td>
                    <td className="p-3 text-slate-400">{product.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Toolbar Button ---------- */

function ToolbarButton({
  icon,
  label,
  danger,
  onClick,
}: {
  icon: string;
  label: string;
  danger?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      title={label}
      onClick={onClick}
      className={`
        flex flex-col items-center gap-1 px-3 py-2 rounded text-xs transition
        ${
          danger
            ? "text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
            : "text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10"
        }
      `}
    >
      <span className="text-base">{icon}</span>
      <span>{label}</span>
    </button>
  );
}
