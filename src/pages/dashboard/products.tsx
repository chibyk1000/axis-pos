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
import { useState } from "react";
import { useNavigate } from "react-router";
import {
  useCreateProduct,
  useDeleteProduct,
  useProduct,
  useUpdateProduct,
} from "@/hooks/controllers/products";
import { cn } from "@/lib/utils";
import { useAddProductTax } from "@/hooks/controllers/productTaxes";
import { useAddComment, useDeleteComment } from "@/hooks/controllers/comments";
import { format } from "date-fns";
import { confirm } from "@tauri-apps/plugin-dialog";
import {
 
 
  useCreateBarcode,
  useDeleteBarcode,
} from "@/hooks/controllers/barcodes";
import { UploadedImage } from "@/helpers/image";
import { Product } from "@/db/schema";
import { useDeleteTax } from "@/hooks/controllers/taxes";

export function ProductsView() {
  const [searchQuery, setSearchQuery] = useState("");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product>();
  const [addProductDrawerOpen, setAddProductDrawerOpen] = useState(false);
  const { mutateAsync: createProduct } = useCreateProduct();
  const navigate = useNavigate();

  const [editingGroup, setEditingGroup] = useState<any | null>(null);

  const deleteNodeMutation = useDeleteNode();

  const { data: products } = useProduct(selectedId);

  const { data: roots } = useRootWithoutChildren();

  const createBarcode = useCreateBarcode();
  // const { data: barcodes } = useBarcodes(selectedProductId);

  const deleteProductMutation = useDeleteProduct();
  const updateProduct = useUpdateProduct();

  const deleteBarcodes = useDeleteBarcode();
  const deleteComments = useDeleteComment();

  // -------- TanStack Queries --------
  const { data: rootGroups = [] } = useRootNodes();
  const createNodeMutation = useCreateNode();
  const updateNodeMutation = useUpdateNode();
  const addProductTaxes = useAddProductTax();

  const addComments = useAddComment();

  const deleteProductTaxes = useDeleteTax();

  const mapGroupsToTree = (groups: any[]): TreeViewElement[] =>
    groups.map((group) => ({
      id: group.id,
      name: group.name,
      isSelectable: true,
      children: group.children ? mapGroupsToTree(group.children) : [],
    }));

  const treeElements = mapGroupsToTree(rootGroups);
  function RenderTree({ elements }: { elements: TreeViewElement[] }) {
    return (
      <>
        {elements.map((el) => {
          const isFolder = el.children && el.children.length > 0;
          const isRoot = el.id === "root";
          const Node = (
            <div
              className={cn(
                "px-2 rounded-md transition-colors cursor-pointer",
                selectedId === el.id ? "bg-white/10" : "hover:bg-white/5",
              )}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedId(el.id);
              }}
            >
              {isFolder ? (
                <Folder value={el.id} element={el.name}>
                  <RenderTree elements={el.children!} />
                </Folder>
              ) : (
                <File value={el.id}>{el.name}</File>
              )}
            </div>
          );

          return (
            <ContextMenu key={el.id}>
              <ContextMenuTrigger>{Node}</ContextMenuTrigger>

              <ContextMenuContent className="w-48 bg-slate-900 border border-slate-700">
                <ContextMenuItem
                  onClick={() => {
                    setSelectedId(el.id);
                    setDrawerOpen(true); // new group under this
                  }}
                >
                  ➕ New group
                </ContextMenuItem>

                <ContextMenuItem
                  disabled={isRoot}
                  onClick={() => {
                    setSelectedId(el.id);
                    // open edit drawer
                    // setEditGroupOpen(true);

                    const group = flattenGroups(rootGroups ?? []).find(
                      (g) => g.id === el.id,
                    );

                    if (!group) return;

                    setEditingGroup({
                      id: group.id,
                      name: group.name,
                      displayName: group.displayName,
                      parentId: group.parentId,
                      color: group.color,
                    });

                    setDrawerOpen(true);
                  }}
                >
                  ✏️ Edit group
                </ContextMenuItem>

                <ContextMenuSeparator />

                <ContextMenuItem
                  className="text-red-400 focus:text-red-400"
                  disabled={isRoot}
                  onClick={async () => {
                    const ok = await confirm(
                      "Delete this group? This cannot be undone.",
                      { kind: "warning" },
                    );
                    if (!ok) return;

                    await deleteNodeMutation.mutateAsync(el.id);
                  }}
                >
                  🗑 Delete group
                </ContextMenuItem>

                <ContextMenuSeparator />

                <ContextMenuItem
                  onClick={() => {
                    // queryClient.invalidateQueries({
                    //   queryKey: ["nodes"],
                    // });
                  }}
                >
                  🔄 Refresh
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          );
        })}
      </>
    );
  }

  const handleAddGroup = async (
    name: string,
    image: UploadedImage | null,
    displayName: string,
    parentId?: string,
    color?: string,
    id?: string, // 👈 comes from drawer when editing
  ) => {
    if (id) {
      // ✅ UPDATE
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
      // ✅ CREATE
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
  };


  function flattenGroups(groups: any[]): any[] {
    return groups.flatMap((g) => [
      g,
      ...(g.children ? flattenGroups(g.children) : []),
    ]);
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-900 text-slate-200 ">
      {/* Header */}

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
        onSave={async (
          data,
          groupId,
          supplier,
          comments,
          selectedTaxes,
          barcodes,
        ) => {
          const isEditing = Boolean(selectedProduct?.id);
          const productId = isEditing
            ? selectedProduct!.id
            : crypto.randomUUID();

          // ---------------- PRODUCT ----------------
          if (isEditing) {
            await updateProduct.mutateAsync({
              id: productId,
              data: {
                ...data,
                nodeId: groupId as string,
                supplierId: supplier,
              },
            });
            for (const tax of selectedTaxes) {
              await deleteProductTaxes.mutateAsync(tax.id);
            }
            // 🔥 HARD RESET RELATIONS
            await Promise.all([
              deleteComments.mutateAsync({ id: productId }),
              deleteBarcodes.mutateAsync(productId),
            ]);
          } else {
            await createProduct({
              ...data,
              nodeId: groupId as string,
              supplierId: supplier,
              id: productId,
            });
          }

          // ---------------- TAXES ----------------
          for (const taxes of selectedTaxes) {
            await addProductTaxes.mutateAsync({
              productId,
              taxId: taxes.id,
            });
          }

          // ---------------- COMMENTS ----------------
          for (const comment of comments) {
            await addComments.mutateAsync({
              id: comment.id,
              productId,
              content: comment.text,
            });
          }

          // ---------------- BARCODES ----------------
          for (const barcode of barcodes) {
            await createBarcode.mutateAsync({
              id: barcode.id,
              productId,
              type: "EAN13",
              value: barcode.text,
            });
          }

          // ---------------- UI CLEANUP ----------------
          setSelectedProduct(undefined);
          setSelectedProductId("");
          setAddProductDrawerOpen(false);
        }}
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
          <ToolbarButton
            icon="✎"
            label="Edit group"
            disabled={!selectedId || selectedId === "root"}
            onClick={() => {
              const group = flattenGroups(rootGroups ?? []).find(
                (g) => g.id === selectedId,
              );

              if (!group) return;

              setEditingGroup({
                id: group.id,
                name: group.name,
                displayName: group.displayName,
                parentId: group.parentId,
                color: group.color,
              });

              setDrawerOpen(true);
            }}
          />

          <ToolbarButton
            icon="🗑"
            label="Delete group"
            danger
            disabled={!selectedId || selectedId === "root"}
            onClick={async () => {
              if (!selectedId) return;

              const ok = confirm(
                `Do you want to Delete group? This cannot be undone.`,
                {
                  kind: "warning",
                },
              );
              if (!ok) return;

              await deleteNodeMutation.mutateAsync(selectedId);
              setSelectedId("root");
            }}
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
            onClick={async () => {
              setAddProductDrawerOpen(true);
            }}
          />
          <ToolbarButton
            icon="🗑"
            label="Delete product"
            onClick={async () => {
              if (!selectedProduct?.id) return;

              const ok = confirm(
                `Do you want to Delete ${selectedProduct?.title} This cannot be undone.`,
                {
                  kind: "warning",
                },
              );
              if (!ok) return;

              await deleteProductMutation.mutateAsync(selectedProduct.id);
              setSelectedProduct(undefined);
            }}
            danger
            disabled={!selectedProductId}
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
          <div className="w-56 bg-slate-900 border-r border-slate-800 pt-3">
            <Tree
              elements={treeElements}
              initialExpandedItems={rootGroups.map((g: any) => g.id)}
              className="h-full"
            >
              <RenderTree elements={treeElements} />
            </Tree>
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
              Products count: {products?.length}
            </div>
          </div>

          {/* Products Table */}
          <div className="flex-1 overflow-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-slate-800 border-b border-slate-700 sticky top-0">
                  <th className="p-3 text-left text-indigo-400">Code</th>
                  <th className="p-3 text-left">Name</th>
                  <th className="p-3 text-left">Group</th>
                  <th className="p-3 text-left">Barcode</th>
                  <th className="p-3 text-left">Cost</th>
                  <th className="p-3 text-left">Sale price…</th>
                  <th className="p-3 text-left">Taxes</th>
                  <th className="p-3 text-left">Sale price</th>
                  <th className="p-3 text-left">Active</th>
                  <th className="p-3 text-left">Unit</th>
                  <th className="p-3 text-left">Created</th>
                  <th className="p-3 text-left">Updated</th>
                </tr>
              </thead>
              <tbody>
                {products && (
                  <>
                    {products.map((product) => (
                      <tr
                        key={product.id}
                        onClick={() => {
                          setSelectedProductId(product.id);
                          setSelectedProduct(product as any);
                        }}
                        className={cn(
                          "border-b border-slate-800 transition cursor-pointer",
                          "hover:bg-indigo-500/5",
                          selectedProductId === product.id &&
                            "bg-indigo-500/10 ring-1 ring-inset ring-indigo-500/40",
                        )}
                      >
                        <td className="p-3">{product.code}</td>
                        <td className="p-3">{product.title}</td>
                        <td className="p-3">
                          {roots?.find((r) => r.id === product.nodeId)?.name}
                        </td>
                        <td className="p-3 text-slate-400">
                          {product.barcodes.map((b) => b.value).join(", ")}
                        </td>
                        <td className="p-3">{product.cost.toFixed(2)}</td>
                        <td className="p-3">{product.salePrice.toFixed(2)}</td>
                        <td className="p-3">
                          {product?.taxes.map((t) => `${t.tax.name}(${t.tax.rate})% `).join(", ")}
                        </td>
                        <td className="p-3">{product.salePrice.toFixed(2)}</td>
                        <td className="p-3 text-slate-400">{product.active}</td>
                        <td className="p-3 text-slate-400">{product.unit}</td>
                        <td className="p-3 text-slate-400">
                          {format(product.createdAt, "dd/MM/yy")}
                        </td>
                        <td className="p-3 text-slate-400">
                          {format(product?.updatedAt as Date, "dd/MM/yy")}
                        </td>
                      </tr>
                    ))}
                  </>
                )}
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
  disabled,
}: {
  icon: string;
  label: string;
  danger?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const base =
    "flex flex-col items-center gap-1 px-3 py-2 rounded text-xs transition";

  const enabledStyle = danger
    ? "text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
    : "text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10";

  const disabledStyle =
    "text-slate-500 opacity-50 cursor-not-allowed pointer-events-none";

  return (
    <button
      title={label}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`${base} ${disabled ? disabledStyle : enabledStyle}`}
    >
      <span className="text-base">{icon}</span>
      <span>{label}</span>
    </button>
  );
}
