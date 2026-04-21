"use client";

import { useState } from "react";

import {
  User,
  Phone,
  Mail,
  MapPin,
  Plus,
  Check,
  ArrowRight,
  Loader2,
  AlertCircle,
  Users,
  SkipForward,
  ChevronRight,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CustomerFormData {
  name: string;
  code: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
  isDefault: boolean;
}

interface CreateCustomerPageProps {
  onCreateCustomer: (data: CustomerFormData) => Promise<void>;
  onSkip: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function genCode(name: string) {
  const parts = name
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, "")
    .split(/\s+/)
    .filter(Boolean);
  const prefix =
    parts.length >= 2
      ? parts
          .slice(0, 3)
          .map((p) => p[0])
          .join("")
      : (parts[0]?.slice(0, 3) ?? "CST");
  return prefix + Math.floor(Math.random() * 900 + 100);
}

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .map((w) => w[0] ?? "")
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?"
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StepCrumb({ step }: { step: "login" | "customers" | "pos" }) {
  const steps = [
    { key: "login", label: "Login" },
    { key: "customers", label: "Customers" },
    { key: "pos", label: "POS" },
  ] as const;

  return (
    <div className="flex items-center gap-2">
      {steps.map((s, i) => {
        const isDone = s.key === "login";
        const isActive = s.key === step;
        return (
          <div key={s.key} className="flex items-center gap-2">
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                isDone
                  ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                  : isActive
                    ? "bg-cyan-100 text-cyan-700 border border-cyan-200 dark:bg-cyan-950 dark:text-cyan-300 dark:border-cyan-600"
                    : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-800"
              }`}
            >
              {isDone && <Check className="w-3 h-3" />}
              {s.label}
            </div>
            {i < steps.length - 1 && (
              <ChevronRight className="w-3.5 h-3.5 text-slate-700 dark:text-slate-400" />
            )}
          </div>
        );
      })}
    </div>
  );
}

function Label({ text, required }: { text: string; required?: boolean }) {
  return (
    <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
      {text}
      {required && <span className="text-cyan-500 ml-0.5">*</span>}
    </label>
  );
}

function InputField({
  value,
  onChange,
  placeholder,
  type = "text",
  hasError,
  disabled,
  autoFocus,
  onBlur,
  rightSlot,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  hasError?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  onBlur?: () => void;
  rightSlot?: React.ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div
      className={`flex items-center bg-white dark:bg-slate-950 rounded-xl border transition-colors ${
        hasError
          ? "border-red-700"
          : focused
            ? "border-cyan-600"
            : "border-slate-300 dark:border-slate-800"
      }`}
    >
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          onBlur?.();
        }}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        className="flex-1 bg-transparent px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 outline-none disabled:opacity-50"
      />
      {rightSlot && <div className="pr-3">{rightSlot}</div>}
    </div>
  );
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p className="text-[11px] text-red-400 flex items-center gap-1 mt-1">
      <AlertCircle className="w-3 h-3" />
      {msg}
    </p>
  );
}

function Toggle({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <label
      className="flex items-center gap-3 cursor-pointer group"
      onClick={onChange}
    >
      <div
        className={`w-10 h-5 rounded-full relative transition-colors ${on ? "bg-cyan-600" : "bg-slate-100 dark:bg-slate-700"}`}
      >
        <div
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${on ? "translate-x-5" : "translate-x-0.5"}`}
        />
      </div>
      <span className="text-sm text-slate-500 dark:text-slate-400 group-hover:text-slate-700 transition-colors">
        {label}
      </span>
    </label>
  );
}

function CustomerPreview({ form }: { form: CustomerFormData }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 sticky top-4">
      <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4">
        Preview
      </p>

      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full bg-cyan-100 text-cyan-700 border border-cyan-200 dark:bg-cyan-900/20 dark:text-cyan-300 dark:border-cyan-600 flex items-center justify-center text-base font-semibold shrink-0">
          {initials(form.name)}
        </div>
        <div className="min-w-0">
          <p
            className={`font-semibold text-sm truncate ${form.name ? "text-slate-900 dark:text-slate-100" : "text-slate-500 dark:text-slate-400"}`}
          >
            {form.name || "Customer name"}
          </p>
          {form.code && (
            <p className="text-[11px] font-mono text-cyan-500">{form.code}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {[
          { icon: Mail, val: form.email },
          { icon: Phone, val: form.phone },
          { icon: MapPin, val: form.address },
        ].map(({ icon: Icon, val }, i) =>
          val ? (
            <div
              key={i}
              className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400"
            >
              <Icon className="w-3 h-3 text-slate-600 shrink-0" />
              <span className="truncate">{val}</span>
            </div>
          ) : null,
        )}
        {!form.email && !form.phone && !form.address && (
          <p className="text-xs text-slate-700 italic">No contact info</p>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const EMPTY_FORM: CustomerFormData = {
  name: "",
  code: "",
  email: "",
  phone: "",
  address: "",
  notes: "",
  isDefault: true,
};

export default function CreateCustomerPage({
  onCreateCustomer,
  onSkip,
}: CreateCustomerPageProps) {
  const [form, setForm] = useState<CustomerFormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<
    Partial<Record<keyof CustomerFormData, string>>
  >({});
  const [loading, setLoading] = useState(false);
  const [createdCount, setCreatedCount] = useState(0);

  const set = <K extends keyof CustomerFormData>(
    k: K,
    v: CustomerFormData[K],
  ) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const tryAutoCode = () => {
    if (!form.code && form.name.trim()) {
      set("code", genCode(form.name));
    }
  };

  const validate = () => {
    const e: typeof errors = {};
    if (!form.name.trim()) e.name = "Name is required.";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = "Enter a valid email.";
    if (form.phone && !/^[+\d\s\-(]{7,}$/.test(form.phone))
      e.phone = "Enter a valid phone number.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleCreate = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await onCreateCustomer(form);
      setCreatedCount((c) => c + 1);
      setForm({ ...EMPTY_FORM, isDefault: false });
      setErrors({});
    } catch (err: any) {
      setErrors({ name: err?.message ?? "Failed to create customer." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col w-screen">
      {/* Header */}
      <header className="bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-700 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-cyan-400 text-black flex items-center justify-center text-xs font-bold">
            A
          </div>
          <span className="text-sm font-medium">Axis Lite</span>
          <span className="text-slate-500 dark:text-slate-400">/</span>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            Setup · Customers
          </span>
        </div>
        <button
          onClick={onSkip}
          className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-500 dark:text-slate-400 transition-colors"
        >
          Skip for now <SkipForward className="w-3.5 h-3.5" />
        </button>
      </header>

      <div className="flex-1 flex justify-center px-4 py-10 overflow-auto">
        <div className="w-full max-w-3xl">
          {/* Hero */}
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-cyan-100 border border-cyan-200 dark:bg-cyan-900/20 dark:border-cyan-700 mb-5">
              <Users className="w-6 h-6 text-cyan-400" />
            </div>
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <StepCrumb step="customers" />
                <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mt-3 mb-1">
                  Add your first customer
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {createdCount === 0
                    ? "No customers in database. Add one now, or skip to use walk-in sales."
                    : `${createdCount} customer${createdCount > 1 ? "s" : ""} added · add another or continue.`}
                </p>
              </div>
              {createdCount > 0 && (
                <button
                  onClick={onSkip}
                  className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-600 text-slate-900 dark:text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
                >
                  Go to POS <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Two-col layout */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-5">
            {/* Form card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-6">
              {/* Name error banner */}
              {errors.name && (
                <div className="flex items-center gap-2 bg-red-950/50 border border-red-900 rounded-xl px-4 py-3 mb-5 text-sm text-red-400">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {errors.name}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Label text="Full name" required />
                  <InputField
                    value={form.name}
                    onChange={(v) => set("name", v)}
                    onBlur={tryAutoCode}
                    placeholder="e.g. Chukwuemeka Obi"
                    hasError={!!errors.name}
                    autoFocus
                  />
                </div>

                <div>
                  <Label text="Customer code" />
                  <InputField
                    value={form.code}
                    onChange={(v) => set("code", v.toUpperCase())}
                    placeholder="e.g. CEO123"
                    rightSlot={
                      !form.code && form.name ? (
                        <button
                          onClick={tryAutoCode}
                          className="text-[10px] text-cyan-600 hover:text-cyan-400 font-semibold whitespace-nowrap transition-colors"
                        >
                          Generate
                        </button>
                      ) : undefined
                    }
                  />
                </div>

                <div>
                  <Label text="Phone" />
                  <InputField
                    value={form.phone}
                    onChange={(v) => set("phone", v)}
                    placeholder="+234 800 000 0000"
                    type="tel"
                    hasError={!!errors.phone}
                  />
                  <FieldError msg={errors.phone} />
                </div>

                <div className="sm:col-span-2">
                  <Label text="Email" />
                  <InputField
                    value={form.email}
                    onChange={(v) => set("email", v)}
                    placeholder="customer@email.com"
                    type="email"
                    hasError={!!errors.email}
                  />
                  <FieldError msg={errors.email} />
                </div>

                <div className="sm:col-span-2">
                  <Label text="Address" />
                  <InputField
                    value={form.address}
                    onChange={(v) => set("address", v)}
                    placeholder="Street, city…"
                  />
                </div>

                <div className="sm:col-span-2">
                  <Label text="Notes" />
                  <div className="bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl focus-within:border-cyan-600 transition-colors">
                    <textarea
                      value={form.notes}
                      onChange={(e) => set("notes", e.target.value)}
                      placeholder="Additional info or instructions…"
                      rows={2}
                      className="w-full bg-transparent px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-700 outline-none resize-none"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-700 pt-4 mt-4">
                <Toggle
                  on={form.isDefault}
                  onChange={() => set("isDefault", !form.isDefault)}
                  label="Set as default customer"
                />
              </div>

              <div className="flex gap-3 mt-5">
                <button
                  onClick={handleCreate}
                  disabled={loading || !form.name.trim()}
                  className="flex-1 flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed text-slate-900 dark:text-white font-semibold py-3 rounded-xl text-sm transition-all active:scale-[0.98]"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating…
                    </>
                  ) : createdCount > 0 ? (
                    <>
                      <Plus className="w-4 h-4" />
                      Add another
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Create customer
                    </>
                  )}
                </button>
                {createdCount > 0 && (
                  <button
                    onClick={onSkip}
                    className="flex items-center gap-2 bg-emerald-900 hover:bg-emerald-800 border border-emerald-700 text-emerald-400 font-semibold py-3 px-5 rounded-xl text-sm transition-all"
                  >
                    Done <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>

              <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-4">
                Don't need named customers?{" "}
                <button
                  onClick={onSkip}
                  className="text-slate-500 hover:text-slate-700 dark:text-slate-300 underline underline-offset-2 transition-colors"
                >
                  Skip to POS
                </button>
              </p>
            </div>

            {/* Preview + tips */}
            <div className="flex flex-col gap-4">
              <CustomerPreview form={form} />

              {createdCount > 0 ? (
                <div className="bg-emerald-950/40 border border-emerald-900/50 rounded-2xl p-4 text-center">
                  <p className="text-3xl font-semibold text-emerald-400">
                    {createdCount}
                  </p>
                  <p className="text-xs text-emerald-700 mt-1">
                    customer{createdCount > 1 ? "s" : ""} created
                  </p>
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 space-y-3">
                  <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                    What happens next
                  </p>
                  {[
                    {
                      icon: User,
                      text: "Customer appears in the POS customer picker",
                    },
                    { icon: Check, text: "Sales get linked to their account" },
                    { icon: Plus, text: "Add more any time from Settings" },
                  ].map(({ icon: Icon, text }, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <div className="w-6 h-6 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                        <Icon className="w-3 h-3 text-slate-500" />
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        {text}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
