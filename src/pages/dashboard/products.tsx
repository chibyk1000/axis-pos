"use client";

import { AddGroupDrawer } from "@/components/products/add-group-drawer";
import AddProductDrawer from "@/components/products/add-product-drawer";
import {
  useCreateNode,
  useDeleteNode,
  useRootNodes,
  useRootWithoutChildren,
  useUpdateNode,
} from "@/hooks/controllers/nodes";
import {
  Tree,
  Folder,
  File,
  type TreeViewElement,
} from "@/components/ui/file-tree";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { ChevronDownIcon } from "lucide-react";
import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router";
import {
  useCreateProduct,
  useDeleteProduct,
  useProduct,
  useUpdateProduct,
} from "@/hooks/controllers/products";
import { cn } from "@/lib/utils";
import {
  useAddProductTax,
  useDeleteProductTax,
} from "@/hooks/controllers/productTaxes";
import { useAddComment, useDeleteComment } from "@/hooks/controllers/comments";
import { format } from "date-fns";
import { confirm } from "@tauri-apps/plugin-dialog";
import {
  useCreateBarcode,
  useDeleteBarcode,
} from "@/hooks/controllers/barcodes";
import { UploadedImage } from "@/helpers/image";
import { Product } from "@/db/schema";
import { FaRegFileAlt } from "react-icons/fa";
import { nanoid } from "nanoid";
import { useAddStockEntry } from "@/hooks/controllers/stocks";
// Added missing import
import { useUpsertProductPrice } from "@/hooks/controllers/priceLists";
import type { DrawerPriceEntry } from "@/components/products/add-product-drawer";
import { useQueryClient } from "@tanstack/react-query";

/* ─────────────────────────────────────────────────────────────────────────── */
/*                         RESIZABLE COLUMNS                                  */
/* ─────────────────────────────────────────────────────────────────────────── */

type ColDef = {
  key: string;
  label: string;
  defaultWidth: number;
  minWidth: number;
};

const COLUMNS: ColDef[] = [
  { key: "code", label: "Code", defaultWidth: 80, minWidth: 48 },
  { key: "name", label: "Name", defaultWidth: 200, minWidth: 80 },
  { key: "group", label: "Group", defaultWidth: 120, minWidth: 60 },
  { key: "barcode", label: "Barcode", defaultWidth: 130, minWidth: 60 },
  { key: "cost", label: "Cost", defaultWidth: 90, minWidth: 60 },
  { key: "salePrice", label: "Sale price", defaultWidth: 100, minWidth: 60 },
  { key: "taxes", label: "Taxes", defaultWidth: 130, minWidth: 60 },
  { key: "stock", label: "Stock", defaultWidth: 70, minWidth: 48 },
  { key: "active", label: "Active", defaultWidth: 70, minWidth: 48 },
  { key: "unit", label: "Unit", defaultWidth: 70, minWidth: 48 },
  { key: "created", label: "Created", defaultWidth: 90, minWidth: 60 },
  { key: "updated", label: "Updated", defaultWidth: 90, minWidth: 60 },
];

function ResizeHandle({ onResize }: { onResize: (delta: number) => void }) {
  const startX = useRef<number>(0);
  const dragging = useRef(false);
  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      startX.current = e.clientX;
      dragging.current = true;
      const onMove = (ev: MouseEvent) => {
        if (!dragging.current) return;
        onResize(ev.clientX - startX.current);
        startX.current = ev.clientX;
      };
      const onUp = () => {
        dragging.current = false;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [onResize],
  );
  return (
    <span
      onMouseDown={onMouseDown}
      className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize select-none
        opacity-0 hover:opacity-100 bg-indigo-500/60 transition-opacity z-10"
    />
  );
}

function Td({
  children,
  width,
  className = "",
}: {
  children: React.ReactNode;
  width: number;
  className?: string;
}) {
  return (
    <td
      className={cn(
        "px-3 py-2.5 border-r border-slate-800/60 last:border-r-0 overflow-hidden",
        className,
      )}
      style={{ width, maxWidth: width }}
    >
      <div className="truncate">{children}</div>
    </td>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*                      CONTEXT MENUS                                         */
/* ─────────────────────────────────────────────────────────────────────────── */

function GroupContextContent({
  isRoot,
  onNewGroup,
  onEditGroup,
  onDeleteGroup,
  onRefresh,
}: {
  isRoot: boolean;
  onNewGroup: () => void;
  onEditGroup: () => void;
  onDeleteGroup: () => void;
  onRefresh: () => void;
}) {
  return (
    <ContextMenuContent className="w-52 bg-slate-900 border border-slate-700 shadow-2xl rounded-lg p-1">
      <div className="px-2 py-1 mb-1">
        <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-widest">
          Group actions
        </span>
      </div>
      <ContextMenuItem
        onClick={onNewGroup}
        className="flex items-center gap-2.5 px-2 py-2 text-sm rounded-md text-slate-200
          hover:bg-indigo-500/15 hover:text-indigo-300 cursor-pointer"
      >
        <span>📁</span> New group
      </ContextMenuItem>
      <ContextMenuItem
        disabled={isRoot}
        onClick={onEditGroup}
        className="flex items-center gap-2.5 px-2 py-2 text-sm rounded-md text-slate-200
          hover:bg-indigo-500/15 hover:text-indigo-300 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <span>✏️</span> Edit group
      </ContextMenuItem>
      <ContextMenuSeparator className="my-1 bg-slate-700/60" />
      <ContextMenuItem
        disabled={isRoot}
        onClick={onDeleteGroup}
        className="flex items-center gap-2.5 px-2 py-2 text-sm rounded-md
          text-red-400 hover:bg-red-500/10 hover:text-red-300 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <span>🗑</span> Delete group
      </ContextMenuItem>
      <ContextMenuSeparator className="my-1 bg-slate-700/60" />
      <ContextMenuItem
        onClick={onRefresh}
        className="flex items-center gap-2.5 px-2 py-2 text-sm rounded-md text-slate-400
          hover:bg-slate-700 hover:text-slate-200 cursor-pointer"
      >
        <span>🔄</span> Refresh
      </ContextMenuItem>
    </ContextMenuContent>
  );
}

function ProductContextContent({
  onEdit,
  onDelete,
  onDuplicate,
}: {
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  return (
    <ContextMenuContent className="w-52 bg-slate-900 border border-slate-600 shadow-2xl rounded-lg p-1">
      <div className="px-2 py-1 mb-1">
        <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-widest">
          Product actions
        </span>
      </div>
      <ContextMenuItem
        onClick={onEdit}
        className="flex items-center gap-2.5 px-2 py-2 text-sm rounded-md text-slate-200
          hover:bg-emerald-500/15 hover:text-emerald-300 cursor-pointer"
      >
        <span>✏️</span> Edit product
      </ContextMenuItem>
      <ContextMenuItem
        onClick={onDuplicate}
        className="flex items-center gap-2.5 px-2 py-2 text-sm rounded-md text-slate-200
          hover:bg-emerald-500/15 hover:text-emerald-300 cursor-pointer"
      >
        <span>📋</span> Duplicate
      </ContextMenuItem>
      <ContextMenuSeparator className="my-1 bg-slate-700/60" />
      <ContextMenuItem
        onClick={onDelete}
        className="flex items-center gap-2.5 px-2 py-2 text-sm rounded-md
          text-red-400 hover:bg-red-500/10 hover:text-red-300 cursor-pointer"
      >
        <span>🗑</span> Delete product
      </ContextMenuItem>
    </ContextMenuContent>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*                             MAIN VIEW                                      */
/* ─────────────────────────────────────────────────────────────────────────── */

export function ProductsView() {
  const [searchQuery, setSearchQuery] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedId, setSelectedId] = useState("root");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedSingleProductId, setSelectedSingleProductId] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product>();
  const [addProductDrawerOpen, setAddProductDrawerOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<any | null>(null);

  const [colWidths, setColWidths] = useState<Record<string, number>>(
    Object.fromEntries(COLUMNS.map((c) => [c.key, c.defaultWidth])),
  );
  const resizeCol = useCallback((key: string, delta: number) => {
    setColWidths((prev) => {
      const col = COLUMNS.find((c) => c.key === key)!;
      return {
        ...prev,
        [key]: Math.max(col.minWidth, (prev[key] ?? col.defaultWidth) + delta),
      };
    });
  }, []);

  const navigate = useNavigate();

  // ── hooks ────────────────────────────────────────────────────────────────
  const deleteNodeMutation = useDeleteNode();
  const { data: products, refetch: refetchProducts } = useProduct(selectedId);
  const { data: roots } = useRootWithoutChildren();
  const createBarcode = useCreateBarcode();
  const deleteProductMut = useDeleteProduct();
  const updateProduct = useUpdateProduct();
  const deleteBarcodes = useDeleteBarcode();
  const queryClient = useQueryClient();
  const deleteComments = useDeleteComment();
  const { data: rootGroups = [], refetch: refetchRootGroups } = useRootNodes();
  const createNodeMutation = useCreateNode();
  const updateNodeMutation = useUpdateNode();
  const addProductTaxes = useAddProductTax();
  const deleteProductTaxes = useDeleteProductTax(); // fixed: was useDeleteTax (from taxes.ts)
  const addComments = useAddComment();
  const { mutateAsync: createProduct } = useCreateProduct();
  const addStockEntry = useAddStockEntry();
  // price hooks
  const upsertProductPrice = useUpsertProductPrice();

  // ── helpers ──────────────────────────────────────────────────────────────

  function flattenGroups(groups: any[]): any[] {
    return groups.flatMap((g) => [
      g,
      ...(g.children ? flattenGroups(g.children) : []),
    ]);
  }

  const mapGroupsToTree = (groups: any[]): TreeViewElement[] =>
    groups.map((group) => ({
      id: group.id,
      name: group.name,
      type: "group" as const,
      isSelectable: true,
      children: [
        ...(group.children ? mapGroupsToTree(group.children) : []),
        ...(group.products ?? []).map((p: any) => ({
          id: p.id,
          name: p.title,
          type: "product" as const,
          isSelectable: true,
        })),
      ],
    }));

  const treeElements = mapGroupsToTree(rootGroups);

  function openEditGroup(nodeId: string) {
    const group = flattenGroups(rootGroups ?? []).find((g) => g.id === nodeId);
    if (!group) return;
    setEditingGroup({
      id: group.id,
      name: group.name,
      displayName: group.displayName,
      parentId: group.parentId,
      color: group.color,
    });
    setDrawerOpen(true);
  }

  async function deleteGroup(nodeId: string) {
    const ok = await confirm("Delete this group? This cannot be undone.", {
      kind: "warning",
    });
    if (!ok) return;
    await deleteNodeMutation.mutateAsync(nodeId);
    if (selectedId === nodeId) setSelectedId("root");
    refetchRootGroups();
    refetchProducts();
    queryClient.invalidateQueries();
  }

  async function deleteSelectedProduct(product: Product) {
    const ok = await confirm(
      `Delete "${product.title}"? This cannot be undone.`,
      { kind: "warning" },
    );
    if (!ok) return;
    await deleteProductMut.mutateAsync(product.id);
    setSelectedProduct(undefined);
    setSelectedProductId("");
    queryClient.invalidateQueries();
  }

  // ── tree ─────────────────────────────────────────────────────────────────

  function RenderTree({ elements }: { elements: TreeViewElement[] }) {
    return (
      <>
        {elements.map((el) => {
          const isFolder = el.type === "group";
          const isRoot = el.id === "root";
          if (isFolder) {
            return (
              <ContextMenu key={el.id}>
                <ContextMenuTrigger>
                  <div
                    className={cn(
                      "px-2 rounded-md transition-colors cursor-pointer",
                    )}
                  >
                    <Folder
                      value={el.id}
                      element={el.name}
                      isSelect={selectedId === el.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSingleProductId("");
                        setSelectedId(el.id);
                      }}
                    >
                      <RenderTree elements={el.children!} />
                    </Folder>
                  </div>
                </ContextMenuTrigger>
                <GroupContextContent
                  isRoot={isRoot}
                  onNewGroup={() => {
                    setSelectedId(el.id);
                    setDrawerOpen(true);
                  }}
                  onEditGroup={() => {
                    setSelectedId(el.id);
                    openEditGroup(el.id);
                  }}
                  onDeleteGroup={() => deleteGroup(el.id)}
                  onRefresh={() => {}}
                />
              </ContextMenu>
            );
          }
          return (
            <ContextMenu key={el.id}>
              <ContextMenuTrigger>
                <div
                  className={cn(
                    "px-2 rounded-md transition-colors cursor-pointer",
                  )}
                >
                  <File
                    value={el.id}
                    isSelect={selectedSingleProductId === el.id}
                    fileIcon={<FaRegFileAlt />}
                    onClick={() => setSelectedSingleProductId(el.id)}
                  >
                    {el.name}
                  </File>
                </div>
              </ContextMenuTrigger>
              <ProductContextContent
                onEdit={() => {
                  setSelectedSingleProductId(el.id);
                  setSelectedProductId(el.id);
                  const prod = products?.find((p) => p.id === el.id);
                  if (prod) setSelectedProduct(prod as any);
                  setAddProductDrawerOpen(true);
                }}
                onDelete={async () => {
                  const prod = products?.find((p) => p.id === el.id);
                  if (prod) await deleteSelectedProduct(prod as any);
                }}
                onDuplicate={() => {}}
              />
            </ContextMenu>
          );
        })}
      </>
    );
  }

  // ── group save ────────────────────────────────────────────────────────────

  const handleAddGroup = async (
    name: string,
    image: UploadedImage | null,
    displayName: string,
    parentId?: string,
    color?: string,
    id?: string,
  ) => {
    if (id) {
      await updateNodeMutation.mutateAsync({
        id,
        data: {
          name,
          parentId: parentId || null,
          color,
          displayName,
          image: image?.path,
        },
      });
    } else {
      await createNodeMutation.mutateAsync({
        id: crypto.randomUUID(),
        name,
        type: "group",
        parentId: parentId || null,
        color,
        displayName,
      });
    }
    setEditingGroup(null);
    setDrawerOpen(false);
    queryClient.invalidateQueries();
  };

  // ── product save — routes fields to correct tables ────────────────────────
  //
  //   products table   → title, code, unit, active, service, …
  //   productPrices    → one row per DrawerPriceEntry (cost, markup, salePrice…)
  //   stockEntries     → reorderPoint, preferredQuantity, lowStockWarning, …

  const handleProductSave = async (
    data: any,
    groupId: string | null,
    supplier: string | null,
    comments: { id: string; text: string }[],
    selectedTaxes: any[],
    barcodes: { id: string; text: string }[],
    prices: DrawerPriceEntry[],
  ) => {
    const isEditing = Boolean(selectedProduct?.id);
    const productId = isEditing ? selectedProduct!.id : crypto.randomUUID();

    const productData = {
      title: data.title,
      code: data.code,
      unit: data.unit,
      nodeId: groupId ?? data.nodeId,
      supplierId: supplier ?? null,
      active: data.active,
      service: data.service,
      defaultQuantity: data.defaultQuantity,
      ageRestriction: data.ageRestriction,
      description: data.description,
      image: data.image,
      color: data.color,
    };

    if (isEditing) {
      await updateProduct.mutateAsync({ id: productId, data: productData });
      // Cleanup relations for overwrite
      await deleteProductTaxes.mutateAsync({ productId });
      await deleteComments.mutateAsync({ id: productId });
      await deleteBarcodes.mutateAsync(productId);
    } else {
      await createProduct({ ...productData, id: productId });
    }

    // Save Prices with new Label-based system
    for (const entry of prices) {
      await upsertProductPrice.mutateAsync({
        productId,
        id: crypto.randomUUID(),
        label: entry.label,
        cost: entry.cost,
        markup: entry.markup,
        salePrice: entry.salePrice,
        priceAfterTax: entry.priceAfterTax,
        priceChangeAllowed: entry.priceChangeAllowed,
        isDefault: entry.isDefault,
      });
    }

    // Save Stock Control Settings
    if (data.reorderPoint !== undefined || data.lowStockWarning) {
      await addStockEntry.mutateAsync({
        id: nanoid(),
        productId,
        type: "adjustment",
        quantity: 0,
        note: "Stock-control settings",
        reorderPoint: data.reorderPoint ?? null,
        preferredQuantity: data.preferredQuantity ?? null,
        lowStockWarning: data.lowStockWarning ?? false,
        lowStockWarningQuantity: data.lowStockWarningQuantity ?? 0,
      });
    }

    // Save other metadata (Taxes, Comments, Barcodes)
    for (const tax of selectedTaxes)
      await addProductTaxes.mutateAsync({ productId, taxId: tax.id });
    for (const comment of comments)
      await addComments.mutateAsync({
        id: comment.id,
        productId,
        content: comment.text,
      });
    for (const bc of barcodes)
      await createBarcode.mutateAsync({
        id: bc.id,
        productId,
        value: bc.text,
        type: "EAN13",
      });
    refetchRootGroups();
    setAddProductDrawerOpen(false);
    setSelectedProduct(undefined);
    queryClient.invalidateQueries();
  };

  // ── derived ───────────────────────────────────────────────────────────────

  function getStockLevel(product: any): number {
    const entries: any[] = product.stockEntries ?? [];
    let level = 0;
    for (const e of entries) {
      if (e.type === "in") level += e.quantity;
      else if (e.type === "out") level -= e.quantity;
      else level = e.quantity;
    }
    return level;
  }

  const visibleProducts = (products ?? []).filter((p) =>
    selectedSingleProductId
      ? p.id === selectedSingleProductId
      : !searchQuery ||
        p.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );
  function getPriceInfo(product: any) {
    const prices = product.productPrices || [];
    // Prioritize default label, otherwise take the first one
    return prices.find((p: any) => p.isDefault) || prices[0] || null;
  }
  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 w-full overflow-hidden flex flex-col bg-slate-900 text-slate-200 h-full">
      <AddGroupDrawer
        open={drawerOpen}
        onOpenChange={() => {
          setDrawerOpen(false);
          setEditingGroup(null);
        }}
        initialData={editingGroup}
        onSave={handleAddGroup}
      />
      <AddProductDrawer
        initialData={selectedProduct}
        onOpenChange={() => setAddProductDrawerOpen(false)}
        nodeId={selectedId}
        open={addProductDrawerOpen}
        onSave={handleProductSave}
      />

      {/* Page header */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex items-center justify-between">
        <span className="text-sm text-slate-300">Management • Products</span>
        <button className="text-slate-400 hover:text-indigo-400 transition">
          <ChevronDownIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Toolbar */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-4">
        <div className="flex flex-wrap gap-3">
          <ToolbarButton icon="↻" label="Refresh" />
          <ToolbarButton
            icon="📁"
            label="New group"
            onClick={() => setDrawerOpen(true)}
          />
          <ToolbarButton
            icon="✎"
            label="Edit group"
            disabled={!selectedId || selectedId === "root"}
            onClick={() => openEditGroup(selectedId)}
          />
          <ToolbarButton
            icon="🗑"
            label="Delete group"
            danger
            disabled={!selectedId || selectedId === "root"}
            onClick={() => deleteGroup(selectedId)}
          />
          <ToolbarButton
            icon="+"
            label="New product"
            onClick={() => setAddProductDrawerOpen(true)}
          />
          <ToolbarButton
            icon="✏️"
            label="Edit product"
            disabled={!selectedProductId}
            onClick={() => setAddProductDrawerOpen(true)}
          />
          <ToolbarButton
            icon="🗑"
            label="Delete product"
            danger
            disabled={!selectedProduct?.id}
            onClick={() =>
              selectedProduct && deleteSelectedProduct(selectedProduct)
            }
          />
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
          <ToolbarButton
            icon="⬇"
            label="Import"
            onClick={() => navigate("/import")}
          />
          <ToolbarButton icon="⬆" label="Export" />
          <ToolbarButton icon="?" label="Help" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-56 bg-slate-900 border-r border-slate-800 overflow-y-auto shrink-0">
          <div className="pt-3">
            <Tree
              elements={treeElements}
              initialExpandedItems={rootGroups.map((g: any) => g.id)}
              className="h-full hover:bg-transparent!"
            >
              <RenderTree elements={treeElements} />
            </Tree>
          </div>
        </div>

        {/* Table area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1 max-w-md">
              <span className="text-slate-500">🔍</span>
              <input
                type="text"
                placeholder="Product name"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-800 text-slate-200 px-3 py-2 rounded text-sm w-full placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex gap-4 text-xs text-slate-500">
              <span>Products: {visibleProducts.length}</span>
              <span className="text-slate-700">
                Drag column edges to resize
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-x-auto overflow-y-hidden">
            <table
              className="border-collapse text-sm"
              style={{ width: "max-content", minWidth: "100%" }}
            >
              <thead className="sticky top-0 z-10 bg-slate-800 border-b border-slate-700">
                <tr>
                  {COLUMNS.map((col) => (
                    <th
                      key={col.key}
                      className="relative p-0 text-left font-medium border-r border-slate-700/50 last:border-r-0"
                      style={{
                        width: colWidths[col.key],
                        minWidth: col.minWidth,
                      }}
                    >
                      <div className="px-3 py-2.5 text-xs uppercase tracking-wider text-indigo-400 select-none truncate">
                        {col.label}
                      </div>
                      <ResizeHandle
                        onResize={(delta) => resizeCol(col.key, delta)}
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleProducts.length === 0 ? (
                  <tr>
                    <td
                      colSpan={COLUMNS.length}
                      className="px-6 py-12 text-center text-slate-600 text-sm"
                    >
                      No products in this group
                    </td>
                  </tr>
                ) : (
                  visibleProducts.map((product) => {
                    const priceInfo = getPriceInfo(product);
                    const stock = getStockLevel(product);
                    return (
                      <ContextMenu key={product.id}>
                        <ContextMenuTrigger asChild>
                          <tr
                            onClick={() => {
                              setSelectedProductId(product.id);
                              setSelectedProduct(product as any);
                            }}
                            onDoubleClick={() => setAddProductDrawerOpen(true)}
                            className={cn(
                              "border-b border-slate-800 transition cursor-pointer hover:bg-indigo-500/5",
                              selectedProductId === product.id &&
                                "bg-indigo-500/10 ring-1 ring-inset ring-indigo-500/40",
                            )}
                          >
                            <Td width={colWidths.code}>{product.code}</Td>
                            <Td
                              width={colWidths.name}
                              className="text-slate-100 font-medium"
                            >
                              {product.title}
                            </Td>
                            <Td
                              width={colWidths.group}
                              className="text-slate-400"
                            >
                              {roots?.find((r) => r.id === product.nodeId)
                                ?.name ?? "—"}
                            </Td>
                            <Td
                              width={colWidths.barcode}
                              className="text-slate-400 font-mono text-xs"
                            >
                              {(product as any).barcodes
                                ?.map((b: any) => b.value)
                                .join(", ") || "—"}
                            </Td>
                            <Td width={colWidths.cost} className="tabular-nums">
                              {priceInfo ? priceInfo.cost.toFixed(2) : "—"}
                            </Td>
                            <Td
                              width={colWidths.salePrice}
                              className="tabular-nums font-medium"
                            >
                              {priceInfo ? priceInfo.salePrice.toFixed(2) : "—"}
                            </Td>
                            <Td
                              width={colWidths.taxes}
                              className="text-slate-400 text-xs"
                            >
                              {(product as any).taxes
                                ?.map(
                                  (t: any) => `${t.tax.name}(${t.tax.rate}%)`,
                                )
                                .join(", ") || "—"}
                            </Td>
                            <Td
                              width={colWidths.stock}
                              className={`tabular-nums font-medium ${stock < 0 ? "text-red-400" : stock === 0 ? "text-slate-500" : "text-emerald-400"}`}
                            >
                              {stock}
                            </Td>
                            <Td
                              width={colWidths.active}
                              className="text-center"
                            >
                              {product.active ? "✓" : "—"}
                            </Td>
                            <Td
                              width={colWidths.unit}
                              className="text-slate-400"
                            >
                              {product.unit}
                            </Td>
                            <Td
                              width={colWidths.created}
                              className="text-slate-500 text-xs"
                            >
                              {format(product.createdAt, "dd/MM/yy")}
                            </Td>
                            <Td
                              width={colWidths.updated}
                              className="text-slate-500 text-xs"
                            >
                              {product.updatedAt
                                ? format(product.updatedAt as Date, "dd/MM/yy")
                                : "—"}
                            </Td>
                          </tr>
                        </ContextMenuTrigger>
                        <ProductContextContent
                          onEdit={() => {
                            setSelectedProductId(product.id);
                            setSelectedProduct(product as any);
                            setAddProductDrawerOpen(true);
                          }}
                          onDelete={() => deleteSelectedProduct(product as any)}
                          onDuplicate={() => {}}
                        />
                      </ContextMenu>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */

function ToolbarButton({
  icon,
  label,
  danger,
  onClick,
  disabled,
}: {
  icon: string;
  label: string;
  danger?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      title={label}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={cn(
        "flex flex-col items-center gap-1 px-3 py-2 rounded text-xs transition",
        disabled
          ? "text-slate-600 opacity-50 cursor-not-allowed pointer-events-none"
          : danger
            ? "text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
            : "text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10",
      )}
    >
      <span className="text-base">{icon}</span>
      <span>{label}</span>
    </button>
  );
}
