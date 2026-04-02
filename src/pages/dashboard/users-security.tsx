import { useState } from "react";
import {
  RotateCcw,
  Plus,
  Pen,
  Trash2,
  KeyRound,
  Eye,
  HelpCircle,
  X,
  Check,
} from "lucide-react";
import AccessLevelSettings from "@/components/securityTab";
import {
  useUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
} from "@/hooks/controllers/users";
import type { User, NewUser } from "@/hooks/controllers/users";

/* -------------------------------------------------------------------------- */
/*                              CONSTANTS                                     */
/* -------------------------------------------------------------------------- */

const ACCESS_LEVEL_LABELS: Record<number, { label: string; color: string }> = {
  0: { label: "No access", color: "text-slate-500" },
  1: { label: "Level 1", color: "text-slate-400" },
  2: { label: "Level 2", color: "text-slate-400" },
  3: { label: "Cashier", color: "text-emerald-400" },
  4: { label: "Level 4", color: "text-emerald-400" },
  5: { label: "Level 5", color: "text-sky-400" },
  6: { label: "Level 6", color: "text-sky-400" },
  7: { label: "Manager", color: "text-sky-400" },
  8: { label: "Level 8", color: "text-violet-400" },
  9: { label: "Admin", color: "text-violet-400" },
};

function isActive(u: User) {
  return u.deleted_at === "NULL" || !u.deleted_at;
}

/* -------------------------------------------------------------------------- */
/*                           PRIMITIVES                                       */
/* -------------------------------------------------------------------------- */

function FieldInput({
  label,
  error,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-slate-400">{label}</label>
      <input
        {...props}
        className="bg-slate-700 border border-slate-600 text-slate-100 text-sm rounded px-3 py-1.5 focus:outline-none focus:border-sky-500 placeholder:text-slate-500 disabled:opacity-40"
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                           USER FORM PANEL                                  */
/* -------------------------------------------------------------------------- */

type FormState = {
  name: string;
  email: string;
  accessLevel: number;
  city: string;
  age: number | "";
  password: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  email: "",
  accessLevel: 1,
  city: "",
  age: "",
  password: "",
};

function userToForm(u: User): FormState {
  return {
    name: u.name ?? "",
    email: u.email ?? "",
    accessLevel: u.accessLevel ?? 1,
    city: u.city === "NULL" ? "" : (u.city ?? ""),
    age: u.age ?? "",
    password: "",
  };
}

function UserFormPanel({
  initial,
  onSave,
  onCancel,
  isSaving,
}: {
  initial?: User;
  onSave: (data: Partial<NewUser> & { password?: string }) => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const [form, setForm] = useState<FormState>(
    initial ? userToForm(initial) : EMPTY_FORM,
  );
  const [errors, setErrors] = useState<
    Partial<Record<keyof FormState, string>>
  >({});

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  }

  function validate() {
    const e: typeof errors = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = "Invalid email";
    if (!initial && !form.password.trim())
      e.password = "Password is required for new users";
    return e;
  }

  function handleSubmit() {
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }

    const payload: Partial<NewUser> & { password?: string } = {
      name: form.name.trim(),
      email: form.email.trim(),
      accessLevel: form.accessLevel,
      city: form.city.trim() || "NULL",
      age: form.age === "" ? 18 : Number(form.age),
    };

    // Only pass password when it has a value — caller hashes it
    if (form.password.trim()) payload.password = form.password;

    onSave(payload);
  }

  return (
    <div className="w-72 border-l border-slate-700 bg-slate-800 flex flex-col shrink-0">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <h3 className="text-sm font-medium">
          {initial ? "Edit user" : "Add user"}
        </h3>
        <button onClick={onCancel} className="text-slate-400 hover:text-white">
          <X size={15} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        <FieldInput
          label="Full name *"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="John Doe"
          error={errors.name}
        />
        <FieldInput
          label="Email *"
          type="email"
          value={form.email}
          onChange={(e) => set("email", e.target.value)}
          placeholder="john@example.com"
          error={errors.email}
        />
        <FieldInput
          label={initial ? "New password (leave blank to keep)" : "Password *"}
          type="password"
          value={form.password}
          onChange={(e) => set("password", e.target.value)}
          placeholder="••••••••"
          error={errors.password}
        />

        {/* Access level stepper */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400">Access level</label>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-700 border border-slate-600 rounded overflow-hidden">
              <button
                onClick={() =>
                  set("accessLevel", Math.max(0, form.accessLevel - 1))
                }
                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-600 border-r border-slate-600 transition-colors"
              >
                −
              </button>
              <span className="w-8 h-8 flex items-center justify-center text-sm font-mono font-medium text-slate-100 select-none">
                {form.accessLevel}
              </span>
              <button
                onClick={() =>
                  set("accessLevel", Math.min(9, form.accessLevel + 1))
                }
                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-600 border-l border-slate-600 transition-colors"
              >
                +
              </button>
            </div>
            <span
              className={`text-xs font-medium ${ACCESS_LEVEL_LABELS[form.accessLevel]?.color}`}
            >
              {ACCESS_LEVEL_LABELS[form.accessLevel]?.label}
            </span>
          </div>
          {/* Visual bar */}
          <div className="flex gap-0.5 mt-1">
            {Array.from({ length: 10 }, (_, i) => (
              <button
                key={i}
                onClick={() => set("accessLevel", i)}
                className={`h-1.5 flex-1 rounded-sm transition-colors ${
                  i <= form.accessLevel
                    ? i <= 4
                      ? "bg-emerald-500"
                      : i <= 7
                        ? "bg-sky-500"
                        : "bg-violet-500"
                    : "bg-slate-600"
                }`}
              />
            ))}
          </div>
        </div>

        <FieldInput
          label="City"
          value={form.city}
          onChange={(e) => set("city", e.target.value)}
          placeholder="Lagos"
        />
        <FieldInput
          label="Age"
          type="number"
          min={0}
          max={120}
          value={form.age}
          onChange={(e) =>
            set("age", e.target.value === "" ? "" : Number(e.target.value))
          }
          placeholder="18"
        />
      </div>

      <div className="px-4 py-3 border-t border-slate-700 flex gap-2 justify-end">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-xs text-slate-300 hover:text-white border border-slate-600 rounded"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSaving}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white rounded"
        >
          <Check size={12} />
          {isSaving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                           DELETE CONFIRM                                   */
/* -------------------------------------------------------------------------- */

function DeleteConfirm({
  user,
  onConfirm,
  onCancel,
  isDeleting,
}: {
  user: User;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}) {
  return (
    <div className="w-72 border-l border-slate-700 bg-slate-800 flex flex-col shrink-0">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <h3 className="text-sm font-medium text-red-400">Delete user</h3>
        <button onClick={onCancel} className="text-slate-400 hover:text-white">
          <X size={15} />
        </button>
      </div>
      <div className="p-4 flex flex-col gap-4">
        <p className="text-sm text-slate-300">
          Deactivate{" "}
          <span className="text-white font-medium">"{user.name}"</span>? The
          account will be hidden but not permanently removed.
        </p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-xs text-slate-300 hover:text-white border border-slate-600 rounded"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-3 py-1.5 text-xs bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white rounded"
          >
            {isDeleting ? "Removing…" : "Deactivate"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                            USERS TAB                                       */
/* -------------------------------------------------------------------------- */

type PanelMode = "idle" | "add" | "edit" | "delete";

function UsersTab() {
  const { data: allUsers = [], isLoading, refetch } = useUsers();
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const deleteMutation = useDeleteUser();

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>("idle");
  const [showInactive, setShowInactive] = useState(false);

  const selected = allUsers.find((u) => u.id === selectedId) ?? null;
  const displayed = showInactive ? allUsers : allUsers.filter(isActive);

  // ── NOTE ON PASSWORDS ───────────────────────────────────────────────────────
  // This is a Tauri desktop app with a local SQLite DB, so we're not doing
  // server-side auth. Hash passwords client-side before storing.
  // Recommended: use the `bcryptjs` npm package (pure JS, works in Tauri).
  //
  //   import bcrypt from "bcryptjs";
  //   const passwordHash = await bcrypt.hash(password, 10);
  //
  // Then store passwordHash in the users table. Never store plaintext.
  // ────────────────────────────────────────────────────────────────────────────

  async function hashPassword(plain: string): Promise<string> {
    // Replace with bcryptjs in production — this is a placeholder
    // import bcrypt from "bcryptjs"; return bcrypt.hash(plain, 10);
    return plain; // ← swap this line
  }

  async function handleAdd(payload: Partial<NewUser> & { password?: string }) {
    const { password, ...data } = payload;
    const passwordHash = password ? await hashPassword(password) : undefined;
    createMutation.mutate(
      {
        ...data,
        passwordHash,
        created_at: "CURRENT_TIMESTAMP",
        updated_at: "CURRENT_TIMESTAMP",
        deleted_at: "NULL",
      } as NewUser,
      {
        onSuccess: (created) => {
          setSelectedId(created.id ?? null);
          setPanelMode("idle");
        },
      },
    );
  }

  async function handleEdit(payload: Partial<NewUser> & { password?: string }) {
    if (!selected?.id) return;
    const { password, ...data } = payload;
    const passwordHash = password ? await hashPassword(password) : undefined;
    updateMutation.mutate(
      {
        id: selected.id,
        data: { ...data, ...(passwordHash ? { passwordHash } : {}) },
      },
      { onSuccess: () => setPanelMode("idle") },
    );
  }

  function handleDelete() {
    if (!selected?.id) return;
    deleteMutation.mutate(selected.id, {
      onSuccess: () => {
        setSelectedId(null);
        setPanelMode("idle");
      },
    });
  }

  const toolbarItems = [
    {
      icon: RotateCcw,
      label: "Refresh",
      onClick: () => refetch(),
      always: true,
    },
    {
      icon: Plus,
      label: "Add user",
      onClick: () => {
        setSelectedId(null);
        setPanelMode("add");
      },
      always: true,
      primary: true,
    },
    {
      icon: Pen,
      label: "Edit",
      onClick: () => selected && setPanelMode("edit"),
      disabled: !selected,
    },
    {
      icon: Trash2,
      label: "Delete",
      onClick: () => selected && setPanelMode("delete"),
      disabled: !selected,
    },
    {
      icon: KeyRound,
      label: "Reset password",
      onClick: () => selected && setPanelMode("edit"),
      disabled: !selected,
    },
    {
      icon: Eye,
      label: "Show inactive",
      onClick: () => setShowInactive((v) => !v),
      always: true,
      toggled: showInactive,
    },
    {
      icon: HelpCircle,
      label: "Help",
      onClick: () => {},
      always: true,
      mlAuto: true,
    },
  ];

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="border-b border-slate-800 px-3 py-2 flex items-center gap-0.5 bg-slate-800 shrink-0">
          {toolbarItems.map(
            ({
              icon: Icon,
              label,
              onClick,
              disabled,
              primary,
              toggled,
              mlAuto,
            }) => (
              <button
                key={label}
                onClick={onClick}
                disabled={disabled}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded text-xs transition-colors
                disabled:opacity-30 disabled:cursor-not-allowed
                ${mlAuto ? "ml-auto" : ""}
                ${
                  toggled
                    ? "text-sky-400 bg-slate-700"
                    : primary
                      ? "text-sky-500 hover:text-sky-400 hover:bg-slate-700"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-700"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            ),
          )}
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-slate-500 text-sm">
              Loading…
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-800 sticky top-0 border-b border-slate-700 z-10">
                <tr>
                  {[
                    "Name",
                    "Email",
                    "Access level",
                    "City",
                    "Age",
                    "Status",
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left py-2.5 px-4 text-xs font-medium text-slate-400 border-r border-slate-700/50 last:border-r-0"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayed.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-12 text-center text-slate-500 text-sm"
                    >
                      No users to display
                    </td>
                  </tr>
                ) : (
                  displayed.map((user) => {
                    const lvl = user.accessLevel ?? 0;
                    const lvlMeta = ACCESS_LEVEL_LABELS[lvl];
                    const active = isActive(user);
                    return (
                      <tr
                        key={user.id}
                        onClick={() => {
                          setSelectedId(user.id ?? null);
                          setPanelMode("idle");
                        }}
                        className={`border-b border-slate-700/40 cursor-pointer transition-colors ${
                          selectedId === user.id
                            ? "bg-sky-600/20"
                            : "hover:bg-slate-800/60"
                        }`}
                      >
                        <td className="py-2.5 px-4 font-medium text-slate-100">
                          {user.name ?? "—"}
                        </td>
                        <td className="py-2.5 px-4 text-slate-400">
                          {user.email ?? "—"}
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-2">
                            {/* Mini level bar */}
                            <div className="flex gap-px">
                              {Array.from({ length: 10 }, (_, i) => (
                                <div
                                  key={i}
                                  className={`w-1.5 h-2.5 rounded-sm ${
                                    i <= lvl
                                      ? lvl <= 4
                                        ? "bg-emerald-500"
                                        : lvl <= 7
                                          ? "bg-sky-500"
                                          : "bg-violet-500"
                                      : "bg-slate-600"
                                  }`}
                                />
                              ))}
                            </div>
                            <span className={`text-xs ${lvlMeta?.color}`}>
                              {lvl} — {lvlMeta?.label}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-4 text-slate-400">
                          {user.city === "NULL" || !user.city ? "—" : user.city}
                        </td>
                        <td className="py-2.5 px-4 text-slate-400">
                          {user.age ?? "—"}
                        </td>
                        <td className="py-2.5 px-4">
                          {active ? (
                            <span className="text-xs text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">
                              Active
                            </span>
                          ) : (
                            <span className="text-xs text-slate-500 bg-slate-700 px-2 py-0.5 rounded">
                              Inactive
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Status bar */}
        <div className="px-4 py-1.5 border-t border-slate-700 bg-slate-800 text-xs text-slate-500 shrink-0">
          {displayed.length} user{displayed.length !== 1 ? "s" : ""}
          {!showInactive && allUsers.length !== displayed.length && (
            <span className="ml-2 text-slate-600">
              ({allUsers.length - displayed.length} inactive hidden)
            </span>
          )}
        </div>
      </div>

      {/* Side panel */}
      {panelMode === "add" && (
        <UserFormPanel
          onSave={handleAdd}
          onCancel={() => setPanelMode("idle")}
          isSaving={createMutation.isPending}
        />
      )}
      {panelMode === "edit" && selected && (
        <UserFormPanel
          initial={selected}
          onSave={handleEdit}
          onCancel={() => setPanelMode("idle")}
          isSaving={updateMutation.isPending}
        />
      )}
      {panelMode === "delete" && selected && (
        <DeleteConfirm
          user={selected}
          onConfirm={handleDelete}
          onCancel={() => setPanelMode("idle")}
          isDeleting={deleteMutation.isPending}
        />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                           MAIN SCREEN                                      */
/* -------------------------------------------------------------------------- */

export default function UsersSecurityScreen() {
  const [activeTab, setActiveTab] = useState<"users" | "security">("users");

  return (
    <div className="flex-1 flex flex-col bg-slate-900 text-slate-200 overflow-hidden">
      <div className="border-b border-slate-800 px-6 flex gap-6 shrink-0">
        {(["users", "security"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-3 px-1 text-sm font-medium border-b-2 transition-colors capitalize ${
              activeTab === tab
                ? "border-sky-500 text-sky-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            {tab === "users" ? "Users" : "Security"}
          </button>
        ))}
      </div>

      {activeTab === "users" ? <UsersTab /> : <AccessLevelSettings />}
    </div>
  );
}
