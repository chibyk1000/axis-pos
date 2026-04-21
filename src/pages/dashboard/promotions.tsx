import { useState, useMemo } from "react";
import { nanoid } from "nanoid";
import {
  usePromotions,
  useCreatePromotion,
  useUpdatePromotion,
  useDeletePromotion,
  useTogglePromotion,
  type CreatePromotionPayload,
} from "@/hooks/controllers/promotions";
import type { PromotionWithRelations, Promotion } from "@/db/schema";

/* -------------------------------------------------------------------------- */
/*                                   UTILS                                    */
/* -------------------------------------------------------------------------- */

const TYPE_LABELS: Record<Promotion["type"], string> = {
  percent: "% Discount",
  fixed: "Fixed amount",
  bogo: "Buy X Get Y",
  spend_discount: "Spend & Save",
};

const TYPE_COLORS: Record<Promotion["type"], string> = {
  percent: "bg-sky-600/20 text-sky-300 border-sky-600/30",
  fixed: "bg-emerald-600/20 text-emerald-300 border-emerald-600/30",
  bogo: "bg-violet-600/20 text-violet-300 border-violet-600/30",
  spend_discount: "bg-amber-600/20 text-amber-300 border-amber-600/30",
};

function formatDate(d: Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function isActive(promo: PromotionWithRelations) {
  if (!promo.enabled) return false;
  const now = Date.now();
  if (promo.startsAt && new Date(promo.startsAt).getTime() > now) return false;
  if (promo.endsAt && new Date(promo.endsAt).getTime() < now) return false;
  return true;
}

/* -------------------------------------------------------------------------- */
/*                              FORM (create/edit)                            */
/* -------------------------------------------------------------------------- */

type FormState = {
  name: string;
  description: string;
  type: Promotion["type"];
  scope: "product" | "node" | "cart";
  value: string;
  minOrderValue: string;
  minQuantity: string;
  maxUses: string;
  startsAt: string;
  endsAt: string;
  enabled: boolean;
};

const EMPTY_FORM: FormState = {
  name: "",
  description: "",
  type: "percent",
  scope: "cart",
  value: "",
  minOrderValue: "",
  minQuantity: "",
  maxUses: "",
  startsAt: "",
  endsAt: "",
  enabled: true,
};

function promoToForm(p: PromotionWithRelations): FormState {
  return {
    name: p.name,
    description: p.description ?? "",
    type: p.type,
    scope: p.scope as FormState["scope"],
    value: p.value?.toString() ?? "",
    minOrderValue: p.minOrderValue?.toString() ?? "",
    minQuantity: p.minQuantity?.toString() ?? "",
    maxUses: p.maxUses?.toString() ?? "",
    startsAt: p.startsAt ? new Date(p.startsAt).toISOString().slice(0, 10) : "",
    endsAt: p.endsAt ? new Date(p.endsAt).toISOString().slice(0, 10) : "",
    enabled: p.enabled,
  };
}

function Input({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-slate-500 dark:text-slate-400">{label}</label>
      <input
        {...props}
        className="bg-slate-100 dark:bg-slate-700 border border-slate-600 text-slate-900 dark:text-slate-100 text-sm rounded px-3 py-1.5 focus:outline-none focus:border-sky-500 placeholder:text-slate-500"
      />
    </div>
  );
}

function Select({
  label,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-slate-500 dark:text-slate-400">{label}</label>
      <select
        {...props}
        className="bg-slate-100 dark:bg-slate-700 border border-slate-600 text-slate-900 dark:text-slate-100 text-sm rounded px-3 py-1.5 focus:outline-none focus:border-sky-500"
      >
        {children}
      </select>
    </div>
  );
}

interface PromotionFormProps {
  initial?: PromotionWithRelations;
  onSave: (payload: CreatePromotionPayload) => void;
  onCancel: () => void;
  isSaving: boolean;
}

function PromotionForm({
  initial,
  onSave,
  onCancel,
  isSaving,
}: PromotionFormProps) {
  const [form, setForm] = useState<FormState>(
    initial ? promoToForm(initial) : EMPTY_FORM,
  );

  function set<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function handleSubmit() {
    if (!form.name.trim()) return;

    const payload: CreatePromotionPayload = {
      id: initial?.id ?? nanoid(),
      name: form.name.trim(),
      description: form.description.trim() || null,
      type: form.type,
      scope: form.scope,
      value: form.value ? parseFloat(form.value) : null,
      minOrderValue: form.minOrderValue ? parseFloat(form.minOrderValue) : null,
      minQuantity: form.minQuantity ? parseInt(form.minQuantity) : null,
      maxUses: form.maxUses ? parseInt(form.maxUses) : null,
      usedCount: initial?.usedCount ?? 0,
      startsAt: form.startsAt ? new Date(form.startsAt) : null,
      endsAt: form.endsAt ? new Date(form.endsAt) : null,
      enabled: form.enabled,
      createdAt: initial?.createdAt ?? new Date(),
      // Junction rows — pass through existing if editing, empty for now
      // (extend later with product/node/customer pickers)
      productIds: initial?.products.map((p) => p.productId) ?? [],
      nodeIds: initial?.nodes.map((n) => n.nodeId) ?? [],
      customerIds: initial?.customers.map((c) => c.customerId) ?? [],
      bogo: initial?.bogo
        ? {
            buyProductId: initial.bogo.buyProductId,
            buyQuantity: initial.bogo.buyQuantity,
            getProductId: initial.bogo.getProductId,
            getQuantity: initial.bogo.getQuantity,
          }
        : undefined,
    };

    onSave(payload);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
        <h2 className="text-sm font-medium">
          {initial ? "Edit promotion" : "New promotion"}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:text-white border border-slate-600 rounded"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!form.name.trim() || isSaving}
            className="px-3 py-1.5 text-xs bg-sky-600 hover:bg-sky-500 text-slate-900 dark:text-white rounded disabled:opacity-40"
          >
            {isSaving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {/* Basic */}
        <section className="flex flex-col gap-3">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Details
          </p>
          <Input
            label="Name *"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Summer sale 10%"
          />
          <Input
            label="Description"
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Optional internal note"
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Type"
              value={form.type}
              onChange={(e) => set("type", e.target.value as Promotion["type"])}
            >
              <option value="percent">% Discount</option>
              <option value="fixed">Fixed amount off</option>
              <option value="bogo">Buy X Get Y free</option>
              <option value="spend_discount">Spend $X get discount</option>
            </Select>
            <Select
              label="Scope"
              value={form.scope}
              onChange={(e) =>
                set("scope", e.target.value as FormState["scope"])
              }
            >
              <option value="cart">Entire cart</option>
              <option value="product">Specific products</option>
              <option value="node">Category / node</option>
            </Select>
          </div>

          {form.type !== "bogo" && (
            <Input
              label={form.type === "percent" ? "Discount %" : "Discount amount"}
              type="number"
              min={0}
              value={form.value}
              onChange={(e) => set("value", e.target.value)}
              placeholder={form.type === "percent" ? "e.g. 10" : "e.g. 500"}
            />
          )}
        </section>

        {/* Conditions */}
        <section className="flex flex-col gap-3">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Conditions
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Min order value"
              type="number"
              min={0}
              value={form.minOrderValue}
              onChange={(e) => set("minOrderValue", e.target.value)}
              placeholder="e.g. 5000"
            />
            <Input
              label="Min quantity"
              type="number"
              min={0}
              value={form.minQuantity}
              onChange={(e) => set("minQuantity", e.target.value)}
              placeholder="e.g. 2"
            />
          </div>
          <Input
            label="Max uses (blank = unlimited)"
            type="number"
            min={1}
            value={form.maxUses}
            onChange={(e) => set("maxUses", e.target.value)}
            placeholder="e.g. 100"
          />
        </section>

        {/* Scheduling */}
        <section className="flex flex-col gap-3">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Schedule
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Starts"
              type="date"
              value={form.startsAt}
              onChange={(e) => set("startsAt", e.target.value)}
            />
            <Input
              label="Ends"
              type="date"
              value={form.endsAt}
              onChange={(e) => set("endsAt", e.target.value)}
            />
          </div>
        </section>

        {/* Enabled toggle */}
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <div className="relative">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => set("enabled", e.target.checked)}
              className="sr-only"
            />
            <div
              className={`w-9 h-5 rounded-full transition-colors ${form.enabled ? "bg-sky-600" : "bg-slate-600"}`}
            />
            <div
              className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.enabled ? "translate-x-4" : ""}`}
            />
          </div>
          <span className="text-sm text-slate-700 dark:text-slate-300">Enabled</span>
        </label>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                              DELETE CONFIRM                                */
/* -------------------------------------------------------------------------- */

function DeleteConfirm({
  name,
  onConfirm,
  onCancel,
}: {
  name: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="p-4 flex flex-col gap-4">
      <p className="text-sm text-slate-700 dark:text-slate-300">
        Delete <span className="text-slate-900 dark:text-white font-medium">"{name}"</span>? This
        cannot be undone.
      </p>
      <div className="flex gap-2 justify-end">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:text-white border border-slate-600 rounded"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="px-3 py-1.5 text-xs bg-red-600 hover:bg-red-500 text-slate-900 dark:text-white rounded"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                               MAIN SCREEN                                  */
/* -------------------------------------------------------------------------- */

type PanelMode = "idle" | "create" | "edit" | "delete";

export default function PromotionsScreen() {
  const { data: promotionList = [], isLoading } = usePromotions();
  const createMutation = useCreatePromotion();
  const updateMutation = useUpdatePromotion();
  const deleteMutation = useDeletePromotion();
  const toggleMutation = useTogglePromotion();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>("idle");
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<Promotion["type"] | "all">(
    "all",
  );

  const selected = useMemo(
    () => promotionList.find((p) => p.id === selectedId) ?? null,
    [promotionList, selectedId],
  );

  const filtered = useMemo(() => {
    return promotionList.filter((p) => {
      if (filterType !== "all" && p.type !== filterType) return false;
      if (search && !p.name.toLowerCase().includes(search.toLowerCase()))
        return false;
      return true;
    });
  }, [promotionList, filterType, search]);

  function handleCreate(payload: CreatePromotionPayload) {
    createMutation.mutate(payload, {
      onSuccess: (created) => {
        setSelectedId(created.id);
        setPanelMode("idle");
      },
    });
  }

  function handleEdit(payload: CreatePromotionPayload) {
    if (!selected) return;
    const { productIds, nodeIds, customerIds, bogo, ...data } = payload;
    updateMutation.mutate(
      {
        id: selected.id,
        data,
        productIds,
        nodeIds,
        customerIds,
        bogo: bogo ?? null,
      },
      {
        onSuccess: () => setPanelMode("idle"),
      },
    );
  }

  function handleDelete() {
    if (!selected) return;
    deleteMutation.mutate(selected.id, {
      onSuccess: () => {
        setSelectedId(null);
        setPanelMode("idle");
      },
    });
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm shrink-0">
        {[
          {
            icon: "＋",
            label: "New",
            onClick: () => {
              setSelectedId(null);
              setPanelMode("create");
            },
          },
          {
            icon: "✎",
            label: "Edit",
            onClick: () => selected && setPanelMode("edit"),
            disabled: !selected,
          },
          {
            icon: "🗑",
            label: "Delete",
            onClick: () => selected && setPanelMode("delete"),
            disabled: !selected,
          },
        ].map(({ icon, label, onClick, disabled }) => (
          <button
            key={label}
            onClick={onClick}
            disabled={disabled}
            className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:text-white hover:bg-slate-100 dark:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <span className="text-base leading-none">{icon}</span>
            <span className="text-xs">{label}</span>
          </button>
        ))}

        <div className="mx-2 h-8 w-px bg-slate-100 dark:bg-slate-700" />

        {/* Search */}
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs">
            🔍
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search promotions…"
            className="bg-slate-100 dark:bg-slate-700 border border-slate-600 text-slate-900 dark:text-slate-100 text-xs rounded pl-7 pr-3 py-1.5 w-52 focus:outline-none focus:border-sky-500 placeholder:text-slate-500"
          />
        </div>

        {/* Type filter */}
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as typeof filterType)}
          className="bg-slate-100 dark:bg-slate-700 border border-slate-600 text-slate-900 dark:text-slate-100 text-xs rounded px-2 py-1.5 focus:outline-none focus:border-sky-500"
        >
          <option value="all">All types</option>
          <option value="percent">% Discount</option>
          <option value="fixed">Fixed amount</option>
          <option value="bogo">Buy X Get Y</option>
          <option value="spend_discount">Spend & Save</option>
        </select>

        <span className="ml-auto text-xs text-slate-500">
          {filtered.length} promotion{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Table */}
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-slate-500 text-sm">
              Loading…
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-500">
              <span className="text-4xl">%</span>
              <p className="text-sm">No promotions yet</p>
              <button
                onClick={() => setPanelMode("create")}
                className="text-xs text-sky-400 hover:text-sky-300 underline"
              >
                Create your first promotion
              </button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
                <tr className="text-left text-xs text-slate-500 dark:text-slate-400">
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 font-medium">Scope</th>
                  <th className="px-3 py-2 font-medium text-right">Value</th>
                  <th className="px-3 py-2 font-medium">Conditions</th>
                  <th className="px-3 py-2 font-medium">Schedule</th>
                  <th className="px-3 py-2 font-medium text-center">Uses</th>
                  <th className="px-3 py-2 font-medium text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((promo) => {
                  const active = isActive(promo);
                  return (
                    <tr
                      key={promo.id}
                      onClick={() => {
                        setSelectedId(promo.id);
                        setPanelMode("idle");
                      }}
                      className={`border-b border-slate-200 dark:border-slate-700/50 cursor-pointer ${
                        selectedId === promo.id
                          ? "bg-sky-600/20"
                          : "hover:bg-white dark:bg-slate-800"
                      }`}
                    >
                      {/* Name */}
                      <td className="px-3 py-2">
                        <p className="font-medium text-slate-900 dark:text-slate-100">
                          {promo.name}
                        </p>
                        {promo.description && (
                          <p className="text-xs text-slate-500 truncate max-w-[240px]">
                            {promo.description}
                          </p>
                        )}
                      </td>

                      {/* Type badge */}
                      <td className="px-3 py-2">
                        <span
                          className={`text-xs px-2 py-0.5 rounded border ${TYPE_COLORS[promo.type]}`}
                        >
                          {TYPE_LABELS[promo.type]}
                        </span>
                      </td>

                      {/* Scope */}
                      <td className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400 capitalize">
                        {promo.scope}
                      </td>

                      {/* Value */}
                      <td className="px-3 py-2 text-right font-mono text-slate-800 dark:text-slate-200">
                        {promo.type === "percent" && promo.value != null
                          ? `${promo.value}%`
                          : promo.type === "fixed" && promo.value != null
                            ? promo.value.toFixed(2)
                            : promo.type === "spend_discount" &&
                                promo.value != null
                              ? promo.value.toFixed(2)
                              : promo.type === "bogo"
                                ? `B${promo.bogo?.buyQuantity ?? 1}G${promo.bogo?.getQuantity ?? 1}`
                                : "—"}
                      </td>

                      {/* Conditions */}
                      <td className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">
                        <div className="flex flex-col gap-0.5">
                          {promo.minOrderValue != null && (
                            <span>
                              Min order: {promo.minOrderValue.toFixed(2)}
                            </span>
                          )}
                          {promo.minQuantity != null && (
                            <span>Min qty: {promo.minQuantity}</span>
                          )}
                          {promo.customers.length > 0 && (
                            <span>{promo.customers.length} customer(s)</span>
                          )}
                          {!promo.minOrderValue &&
                            !promo.minQuantity &&
                            promo.customers.length === 0 &&
                            "—"}
                        </div>
                      </td>

                      {/* Schedule */}
                      <td className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">
                        <div className="flex flex-col gap-0.5">
                          <span>{formatDate(promo.startsAt)} →</span>
                          <span>{formatDate(promo.endsAt)}</span>
                        </div>
                      </td>

                      {/* Uses */}
                      <td className="px-3 py-2 text-center text-xs text-slate-500 dark:text-slate-400">
                        {promo.maxUses != null
                          ? `${promo.usedCount} / ${promo.maxUses}`
                          : promo.usedCount > 0
                            ? promo.usedCount
                            : "—"}
                      </td>

                      {/* Status toggle */}
                      <td
                        className="px-3 py-2 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() =>
                            toggleMutation.mutate({
                              id: promo.id,
                              enabled: !promo.enabled,
                            })
                          }
                          className="relative inline-flex items-center"
                          title={
                            promo.enabled
                              ? "Click to disable"
                              : "Click to enable"
                          }
                        >
                          <div
                            className={`w-8 h-4 rounded-full transition-colors ${active ? "bg-sky-600" : "bg-slate-600"}`}
                          />
                          <div
                            className={`absolute left-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${promo.enabled ? "translate-x-4" : ""}`}
                          />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Right panel */}
        {panelMode !== "idle" && (
          <div className="w-80 border-l border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col shrink-0">
            {panelMode === "create" && (
              <PromotionForm
                onSave={handleCreate}
                onCancel={() => setPanelMode("idle")}
                isSaving={isSaving}
              />
            )}
            {panelMode === "edit" && selected && (
              <PromotionForm
                initial={selected}
                onSave={handleEdit}
                onCancel={() => setPanelMode("idle")}
                isSaving={isSaving}
              />
            )}
            {panelMode === "delete" && selected && (
              <DeleteConfirm
                name={selected.name}
                onConfirm={handleDelete}
                onCancel={() => setPanelMode("idle")}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
