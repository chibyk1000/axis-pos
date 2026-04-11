import { useState, useRef } from "react";

import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import { Separator } from "@/components/ui/separator";
import {
  HelpCircle,
  Save,
  Plus,
  Trash2,
  RefreshCw,
  Star,
  StarOff,
  GripVertical,
  Upload,
  X,
  Building2,
  Check,
} from "lucide-react";
import { nanoid } from "nanoid";
import {
  useCompanies,
  useCreateCompany,
  useUpdateCompany,
  useDeleteCompany,
  useSetDefaultCompany,
  useCreateVoidReason,
  useUpdateVoidReason,
  useDeleteVoidReason,
} from "@/hooks/controllers/company";
import type {
  CompanyWithRelations,
  VoidReason,
} from "@/hooks/controllers/company";
import { useCountries } from "@/hooks/controllers/countries"; // assumed existing

/* -------------------------------------------------------------------------- */
/*                             FORM ROW                                       */
/* -------------------------------------------------------------------------- */

function FormRow({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <>
      <Label className="text-slate-300 flex items-center gap-1 self-center text-sm">
        {label}
        {required && <span className="text-red-400">*</span>}
      </Label>
      {children}
    </>
  );
}

function StyledInput(
  props: React.InputHTMLAttributes<HTMLInputElement> & { error?: boolean },
) {
  const { error, className = "", ...rest } = props;
  return (
    <input
      {...rest}
      className={`bg-slate-700 border ${error ? "border-red-500" : "border-slate-600"}
        text-slate-100 text-sm rounded px-3 py-1.5 w-full focus:outline-none focus:border-sky-500
        placeholder:text-slate-500 ${className}`}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*                          COMPANY FORM STATE                                */
/* -------------------------------------------------------------------------- */

type FormState = {
  name: string;
  taxNumber: string;
  streetName: string;
  buildingNumber: string;
  additionalStreetName: string;
  plotIdentification: string;
  district: string;
  postalCode: string;
  city: string;
  stateProvince: string;
  countryCode: string;
  phone: string;
  email: string;
  bankAccountNumber: string;
  bankDetails: string;
  isDefault: boolean;
};

// const EMPTY_FORM: FormState = {
//   name: "",
//   taxNumber: "",
//   streetName: "",
//   buildingNumber: "",
//   additionalStreetName: "",
//   plotIdentification: "",
//   district: "",
//   postalCode: "",
//   city: "",
//   stateProvince: "",
//   countryCode: "",
//   phone: "",
//   email: "",
//   bankAccountNumber: "",
//   bankDetails: "",
//   isDefault: false,
// };

function companyToForm(c: CompanyWithRelations): FormState {
  return {
    name: c.name,
    taxNumber: c.taxNumber ?? "",
    streetName: c.streetName ?? "",
    buildingNumber: c.buildingNumber ?? "",
    additionalStreetName: c.additionalStreetName ?? "",
    plotIdentification: c.plotIdentification ?? "",
    district: c.district ?? "",
    postalCode: c.postalCode ?? "",
    city: c.city ?? "",
    stateProvince: c.stateProvince ?? "",
    countryCode: c.countryCode ?? "",
    phone: c.phone ?? "",
    email: c.email ?? "",
    bankAccountNumber: c.bankAccountNumber ?? "",
    bankDetails: c.bankDetails ?? "",
    isDefault: c.isDefault,
  };
}

/* -------------------------------------------------------------------------- */
/*                          VOID REASONS TAB                                  */
/* -------------------------------------------------------------------------- */

function VoidReasonsTab({ company }: { company: CompanyWithRelations }) {
  const createMutation = useCreateVoidReason();
  const updateMutation = useUpdateVoidReason();
  const deleteMutation = useDeleteVoidReason();
  const [newReason, setNewReason] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  function handleAdd() {
    if (!newReason.trim()) return;
    createMutation.mutate(
      {
        id: nanoid(),
        companyId: company.id,
        reason: newReason.trim(),
        position: company.voidReasons.length,
        enabled: true,
        createdAt: new Date(),
      },
      { onSuccess: () => setNewReason("") },
    );
  }

  function handleSaveEdit(r: VoidReason) {
    updateMutation.mutate(
      {
        id: r.id,
        companyId: company.id,
        data: { reason: editValue.trim() },
      },
      { onSuccess: () => setEditingId(null) },
    );
  }

  return (
    <div className="max-w-xl flex flex-col gap-4">
      <p className="text-xs text-slate-400">
        Void reasons appear as options when a cashier voids an order or item.
      </p>

      {/* Existing reasons */}
      <div className="border border-slate-700 rounded overflow-hidden">
        {company.voidReasons.length === 0 ? (
          <p className="text-sm text-slate-500 px-4 py-6 text-center">
            No void reasons yet
          </p>
        ) : (
          company.voidReasons.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-2 px-3 py-2 border-b border-slate-700/50 last:border-0 hover:bg-slate-800/40 group"
            >
              <GripVertical size={14} className="text-slate-600 shrink-0" />

              {editingId === r.id ? (
                <input
                  autoFocus
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveEdit(r);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  className="flex-1 bg-slate-700 border border-sky-500 text-slate-100 text-sm rounded px-2 py-0.5 focus:outline-none"
                />
              ) : (
                <span
                  className="flex-1 text-sm text-slate-200 cursor-pointer"
                  onDoubleClick={() => {
                    setEditingId(r.id);
                    setEditValue(r.reason);
                  }}
                >
                  {r.reason}
                </span>
              )}

              {editingId === r.id ? (
                <button
                  onClick={() => handleSaveEdit(r)}
                  disabled={updateMutation.isPending}
                  className="text-xs text-sky-400 hover:text-sky-300 px-2"
                >
                  <Check size={14} />
                </button>
              ) : (
                <button
                  onClick={() =>
                    deleteMutation.mutate({ id: r.id, companyId: company.id })
                  }
                  className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add new */}
      <div className="flex gap-2">
        <StyledInput
          value={newReason}
          onChange={(e) => setNewReason(e.target.value)}
          placeholder="New void reason…"
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <button
          onClick={handleAdd}
          disabled={!newReason.trim() || createMutation.isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white rounded shrink-0"
        >
          <Plus size={13} /> Add
        </button>
      </div>
      <p className="text-xs text-slate-500">
        Double-click a reason to rename it.
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                              LOGO TAB                                      */
/* -------------------------------------------------------------------------- */

function LogoTab({
  company,
  onUpdate,

}: {
  company: CompanyWithRelations;
  onUpdate: (data: { logoPath: string | null }) => void;
  isSaving: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onUpdate({ logoPath: reader.result as string });
    reader.readAsDataURL(file);
  }

  return (
    <div className="flex flex-col gap-6 max-w-sm">
      <p className="text-xs text-slate-400">
        Your logo appears on receipts and invoices. Recommended: PNG or SVG, at
        least 300×100 px.
      </p>

      {company.logoPath ? (
        <div className="relative border border-slate-700 rounded-lg p-4 bg-slate-800 flex flex-col items-center gap-3">
          <img
            src={company.logoPath}
            alt="Company logo"
            className="max-h-24 max-w-full object-contain"
          />
          <button
            onClick={() => onUpdate({ logoPath: null })}
            className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300"
          >
            <X size={12} /> Remove logo
          </button>
        </div>
      ) : (
        <button
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-slate-600 hover:border-sky-500 rounded-lg p-8 flex flex-col items-center gap-2 text-slate-400 hover:text-sky-400 transition-colors"
        >
          <Upload size={24} />
          <span className="text-sm">Click to upload logo</span>
          <span className="text-xs">PNG, JPG or SVG</span>
        </button>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />

      {company.logoPath && (
        <button
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-2 text-xs text-slate-400 hover:text-white border border-slate-600 rounded px-3 py-1.5 w-fit"
        >
          <Upload size={12} /> Replace logo
        </button>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                           RESET DATABASE TAB                               */
/* -------------------------------------------------------------------------- */

function ResetTab() {
  const [confirmed, setConfirmed] = useState(false);
  const [typed, setTyped] = useState("");

  return (
    <div className="max-w-md flex flex-col gap-4">
      <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4">
        <p className="text-sm font-medium text-red-300 mb-1">⚠ Danger zone</p>
        <p className="text-xs text-slate-400">
          Resetting the database will permanently delete all transactions,
          documents, and stock data for this company. Company settings are
          preserved. This action cannot be undone.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs text-slate-400">
          Type <span className="font-mono text-red-400">RESET</span> to confirm
        </label>
        <StyledInput
          value={typed}
          onChange={(e) => {
            setTyped(e.target.value);
            setConfirmed(false);
          }}
          placeholder="RESET"
        />
      </div>

      <button
        disabled={typed !== "RESET"}
        onClick={() => {
          // TODO: wire actual db reset logic here
          setConfirmed(true);
          setTyped("");
        }}
        className="flex items-center gap-2 px-4 py-2 text-sm bg-red-600 hover:bg-red-500 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded w-fit"
      >
        <RefreshCw size={14} /> Reset database
      </button>

      {confirmed && (
        <p className="text-xs text-emerald-400 flex items-center gap-1">
          <Check size={12} /> Reset completed.
        </p>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                          COMPANY FORM TAB                                  */
/* -------------------------------------------------------------------------- */

function CompanyFormTab({
  company,
  onSave,
  isSaving,
}: {
  company: CompanyWithRelations;
  onSave: (data: Partial<CompanyWithRelations>) => void;
  isSaving: boolean;
}) {
  const { data: countries = [] } = useCountries();
  const [form, setForm] = useState<FormState>(() => companyToForm(company));
  const [errors, setErrors] = useState<
    Partial<Record<keyof FormState, string>>
  >({});
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const justSaved = savedAt !== null && Date.now() - savedAt < 2000;

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  }

  function validate() {
    const e: typeof errors = {};
    if (!form.name.trim()) e.name = "Required";
    if (!form.countryCode) e.countryCode = "Required";
    return e;
  }

  function handleSave() {
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }
    onSave(form);
    setSavedAt(Date.now());
    setTimeout(() => setSavedAt(null), 2000);
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Actions */}
      <div className="flex items-center gap-2 mb-5 shrink-0">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded transition-colors disabled:opacity-40 ${
            justSaved
              ? "bg-emerald-600/20 text-emerald-400"
              : "text-slate-300 hover:text-white hover:bg-slate-700"
          }`}
        >
          {justSaved ? <Check size={14} /> : <Save size={14} />}
          {justSaved ? "Saved" : "Save"}
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-slate-700 rounded">
          <HelpCircle size={14} /> Help
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-2">
        <h2 className="text-sm font-medium text-slate-200 mb-4">
          Company details
        </h2>

        <div className="grid grid-cols-[200px_1fr] gap-x-6 gap-y-2.5 max-w-2xl">
          <FormRow label="Name" required>
            <StyledInput
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              error={!!errors.name}
              placeholder="Acme Ltd."
            />
          </FormRow>
          <FormRow label="Tax number">
            <StyledInput
              value={form.taxNumber}
              onChange={(e) => set("taxNumber", e.target.value)}
              className="max-w-xs"
            />
          </FormRow>
          <FormRow label="Street name">
            <StyledInput
              value={form.streetName}
              onChange={(e) => set("streetName", e.target.value)}
            />
          </FormRow>
          <FormRow label="Building number">
            <StyledInput
              value={form.buildingNumber}
              onChange={(e) => set("buildingNumber", e.target.value)}
              className="max-w-[140px]"
            />
          </FormRow>
          <FormRow label="Additional street">
            <StyledInput
              value={form.additionalStreetName}
              onChange={(e) => set("additionalStreetName", e.target.value)}
            />
          </FormRow>
          <FormRow label="Plot identification">
            <StyledInput
              value={form.plotIdentification}
              onChange={(e) => set("plotIdentification", e.target.value)}
              className="max-w-xs"
            />
          </FormRow>
          <FormRow label="District">
            <StyledInput
              value={form.district}
              onChange={(e) => set("district", e.target.value)}
            />
          </FormRow>
          <FormRow label="Postal code">
            <StyledInput
              value={form.postalCode}
              onChange={(e) => set("postalCode", e.target.value)}
              className="max-w-[140px]"
            />
          </FormRow>
          <FormRow label="City">
            <StyledInput
              value={form.city}
              onChange={(e) => set("city", e.target.value)}
            />
          </FormRow>
          <FormRow label="State / Province">
            <StyledInput
              value={form.stateProvince}
              onChange={(e) => set("stateProvince", e.target.value)}
            />
          </FormRow>
          <FormRow label="Country" required>
            <select
              value={form.countryCode}
              onChange={(e) => set("countryCode", e.target.value)}
              className={`bg-slate-700 border ${errors.countryCode ? "border-red-500" : "border-slate-600"} text-slate-100 text-sm rounded px-3 py-1.5 w-full focus:outline-none focus:border-sky-500`}
            >
              <option value="">Select country…</option>
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </FormRow>
          <FormRow label="Phone">
            <StyledInput
              type="tel"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
            />
          </FormRow>
          <FormRow label="Email">
            <StyledInput
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </FormRow>
        </div>

        <Separator className="my-5 bg-slate-700" />

        <h3 className="text-sm font-medium text-slate-200 mb-4">
          Bank account
        </h3>

        <div className="grid grid-cols-[200px_1fr] gap-x-6 gap-y-2.5 max-w-2xl">
          <FormRow label="Account number">
            <StyledInput
              value={form.bankAccountNumber}
              onChange={(e) => set("bankAccountNumber", e.target.value)}
              className="max-w-md"
            />
          </FormRow>
          <FormRow label="Bank details">
            <textarea
              value={form.bankDetails}
              onChange={(e) => set("bankDetails", e.target.value)}
              rows={3}
              className="bg-slate-700 border border-slate-600 text-slate-100 text-sm rounded px-3 py-1.5 w-full focus:outline-none focus:border-sky-500 resize-none placeholder:text-slate-500"
              placeholder="Bank name, branch, SWIFT…"
            />
          </FormRow>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                             MAIN PAGE                                      */
/* -------------------------------------------------------------------------- */

export default function CompanyDataPage() {
  const { data: companies = [], isLoading } = useCompanies();
  const createMutation = useCreateCompany();
  const updateMutation = useUpdateCompany();
  const deleteMutation = useDeleteCompany();
  const setDefaultMutation = useSetDefaultCompany();

  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Auto-select first or default on load
  const selected =
    companies.find((c) => c.id === selectedId) ??
    companies.find((c) => c.isDefault) ??
    companies[0] ??
    null;

  function handleAddCompany() {
    createMutation.mutate(
      {
        id: nanoid(),
        name: "New company",
        isDefault: companies.length === 0,
        createdAt: new Date(),
      },
      { onSuccess: (c) => setSelectedId(c.id) },
    );
  }

  function handleSaveCompany(data: Partial<CompanyWithRelations>) {
    if (!selected) return;
    updateMutation.mutate({ id: selected.id, data });
  }

  function handleDeleteCompany() {
    if (!selected) return;
    deleteMutation.mutate(selected.id, {
      onSuccess: () => setSelectedId(null),
    });
  }

  return (
    <div className="h-screen bg-slate-900 text-slate-100 flex overflow-hidden">
      {/* ── Company sidebar ─────────────────────────────────────────── */}
      <div className="w-56 border-r border-slate-700 bg-slate-800 flex flex-col shrink-0">
        <div className="flex items-center justify-between px-3 py-3 border-b border-slate-700">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Locations
          </span>
          <button
            onClick={handleAddCompany}
            disabled={createMutation.isPending}
            className="text-slate-400 hover:text-sky-400 transition-colors disabled:opacity-40"
            title="Add company"
          >
            <Plus size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-1">
          {isLoading ? (
            <p className="text-xs text-slate-500 px-3 py-4">Loading…</p>
          ) : companies.length === 0 ? (
            <button
              onClick={handleAddCompany}
              className="w-full text-left px-3 py-6 text-xs text-slate-500 hover:text-slate-300 text-center"
            >
              + Add first company
            </button>
          ) : (
            companies.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={`w-full text-left px-3 py-2.5 flex items-center gap-2 transition-colors ${
                  selected?.id === c.id
                    ? "bg-sky-600/20 text-sky-300"
                    : "text-slate-300 hover:bg-slate-700/50"
                }`}
              >
                <Building2 size={13} className="shrink-0 opacity-60" />
                <span className="text-sm truncate flex-1">{c.name}</span>
                {c.isDefault && (
                  <Star size={11} className="text-amber-400 shrink-0" />
                )}
              </button>
            ))
          )}
        </div>

        {/* Sidebar actions */}
        {selected && (
          <div className="border-t border-slate-700 p-2 flex gap-1">
            <button
              onClick={() => setDefaultMutation.mutate(selected.id)}
              disabled={selected.isDefault || setDefaultMutation.isPending}
              title={selected.isDefault ? "Default location" : "Set as default"}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs text-slate-400 hover:text-amber-400 hover:bg-slate-700 rounded disabled:opacity-30 transition-colors"
            >
              {selected.isDefault ? (
                <Star size={13} className="text-amber-400" />
              ) : (
                <StarOff size={13} />
              )}
              Default
            </button>
            <button
              onClick={handleDeleteCompany}
              disabled={deleteMutation.isPending}
              title="Delete company"
              className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded disabled:opacity-30 transition-colors"
            >
              <Trash2 size={13} /> Delete
            </button>
          </div>
        )}
      </div>

      {/* ── Main content ─────────────────────────────────────────────── */}
      {!selected ? (
        <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
          Select or create a company to get started
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Company name header */}
          <div className="px-6 py-3 border-b border-slate-700 bg-slate-800/50 flex items-center gap-2 shrink-0">
            <Building2 size={15} className="text-slate-400" />
            <span className="text-sm font-medium">{selected.name}</span>
            {selected.isDefault && (
              <span className="text-xs text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded">
                Default
              </span>
            )}
          </div>

          {/* Tabs */}
          <Tabs
            defaultValue="company"
            className="flex-1 flex flex-col overflow-hidden"
          >
            <TabsList className="w-full justify-start rounded-none border-b border-slate-700 bg-slate-800 px-4 shrink-0 h-auto">
              {["company", "void", "logo", "reset"].map((tab) => (
                <TabsTrigger
                  key={tab}
                  value={tab}
                  className="text-xs py-2.5 px-3 data-[state=active]:border-b-2 data-[state=active]:border-sky-500 data-[state=active]:text-sky-400 rounded-none bg-transparent"
                >
                  {
                    {
                      company: "Company data",
                      void: "Void reasons",
                      logo: "My logo",
                      reset: "Reset database",
                    }[tab]
                  }
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="company" className="flex-1 overflow-hidden p-6">
              <CompanyFormTab
                key={selected.id}
                company={selected}
                onSave={handleSaveCompany}
                isSaving={updateMutation.isPending}
              />
            </TabsContent>

            <TabsContent value="void" className="flex-1 overflow-y-auto p-6">
              <VoidReasonsTab key={selected.id} company={selected} />
            </TabsContent>

            <TabsContent value="logo" className="flex-1 overflow-y-auto p-6">
              <LogoTab
                key={selected.id}
                company={selected}
                onUpdate={(data) => handleSaveCompany(data)}
                isSaving={updateMutation.isPending}
              />
            </TabsContent>

            <TabsContent value="reset" className="flex-1 overflow-y-auto p-6">
              <ResetTab />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
