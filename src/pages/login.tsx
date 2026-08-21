"use client";

import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router";
import {
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  UserPlus,
  Check,
  Radio,
  ArrowLeft,
  ChevronRight,
  Shield,
} from "lucide-react";
import { useUsers, useCreateUser, type User } from "@/hooks/controllers/users";
import { hashPassword } from "@/lib/auth";
import { useAuth } from "@/providers/auth-provider";
import { useSync } from "@/hooks/useSync";
import { useQueryClient } from "@tanstack/react-query";

interface LoginPageProps {
  onLogin?: (credentials: { username: string; password: string }) => Promise<void>;
}

// ─── Background ───────────────────────────────────────────────────────────────

function DotGrid() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "radial-gradient(circle, #22d3ee 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 50%, transparent 10%, #1c1917 75%)",
        }}
      />
      <div
        className="absolute -top-20 left-1/2 -translate-x-1/2 w-[500px] h-[260px] rounded-full opacity-[0.08]"
        style={{ background: "#d97706", filter: "blur(60px)" }}
      />
    </div>
  );
}

// ─── Shared field wrapper ─────────────────────────────────────────────────────

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-500 uppercase tracking-wider mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

function TextInput({
  type = "text",
  value,
  onChange,
  placeholder,
  autoComplete,
  disabled,
  inputRef,
  rightSlot,
}: {
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  disabled?: boolean;
  inputRef?: React.Ref<HTMLInputElement>;
  rightSlot?: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-[#1c1917] border border-stone-300 dark:border-stone-700 rounded-xl focus-within:border-amber-600 transition-colors flex items-center">
      <input
        ref={inputRef}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        disabled={disabled}
        className="flex-1 bg-transparent px-4 py-3 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-500 dark:placeholder:text-stone-700 outline-none rounded-xl disabled:opacity-50"
      />
      {rightSlot}
    </div>
  );
}

function EyeToggle({
  show,
  onToggle,
}: {
  show: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      tabIndex={-1}
      className="px-3 text-stone-600 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300 transition-colors"
    >
      {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </button>
  );
}

// ─── Access Level Info ────────────────────────────────────────────────────────

const ACCESS_LEVEL_MAP: Record<
  number,
  { label: string; bg: string }
> = {
  0: { label: "Locked", bg: "bg-stone-500" },
  1: { label: "Cashier", bg: "bg-stone-600" },
  2: { label: "Senior Cashier", bg: "bg-stone-600" },
  3: { label: "Shift Lead", bg: "bg-blue-600" },
  4: { label: "Assistant Manager", bg: "bg-blue-600" },
  5: { label: "Store Manager", bg: "bg-emerald-600" },
  6: { label: "Area Manager", bg: "bg-emerald-600" },
  7: { label: "Auditor", bg: "bg-purple-600" },
  8: { label: "Administrator", bg: "bg-amber-600" },
  9: { label: "Super Admin", bg: "bg-amber-500" },
};

function getRoleMeta(accessLevel?: number | null) {
  const lvl = accessLevel ?? 1;
  return ACCESS_LEVEL_MAP[lvl] ?? { label: "Cashier", bg: "bg-stone-600" };
}

function getInitials(name?: string | null) {
  if (!name) return "U";
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// ─── User avatar tile ─────────────────────────────────────────────────────────

function UserAvatar({
  user,
  onClick,
}: {
  user: User;
  onClick: () => void;
}) {
  const roleMeta = getRoleMeta(user.accessLevel);
  const initials = getInitials(user.name ?? user.email);

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-2xl hover:border-amber-500 hover:shadow-lg hover:shadow-amber-900/10 transition-all active:scale-95 group"
    >
      <div
        className={`w-14 h-14 rounded-2xl ${roleMeta.bg} flex items-center justify-center text-white font-bold text-lg group-hover:scale-105 transition-transform shadow-sm`}
      >
        {initials}
      </div>
      <span className="text-xs font-semibold text-stone-800 dark:text-stone-200 text-center leading-tight max-w-[85px] truncate">
        {user.name || user.email || "Unnamed"}
      </span>
      <span className="text-[10px] text-stone-500 capitalize">
        {roleMeta.label}
      </span>
    </button>
  );
}

// ─── User Selector ────────────────────────────────────────────────────────────

function UserSelector({
  users,
  onSelect,
}: {
  users: User[];
  onSelect: (user: User) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider text-center">
        Select your account
      </p>
      <div className="grid grid-cols-3 gap-2.5 max-h-[340px] overflow-y-auto p-0.5">
        {users.map((u) => (
          <UserAvatar key={u.id} user={u} onClick={() => onSelect(u)} />
        ))}
      </div>
    </div>
  );
}

// ─── Password-only form ───────────────────────────────────────────────────────

function PasswordForm({
  selectedUser,
  navigateTo,
  onBack,
  onLogin,
}: {
  selectedUser: User;
  navigateTo: string;
  onBack: () => void;
  onLogin?: (credentials: { username: string; password: string }) => Promise<void>;
}) {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const roleMeta = getRoleMeta(selectedUser.accessLevel);
  const initials = getInitials(selectedUser.name ?? selectedUser.email);
  const displayName = selectedUser.name || selectedUser.email || "Account";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError("Please enter your password.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const identifier = selectedUser.name || selectedUser.email || "";
      if (onLogin) {
        await onLogin({ username: identifier, password });
      } else {
        await login(identifier, password);
      }
      navigate(navigateTo, { replace: true });
    } catch (err: any) {
      setError(err?.message ?? "Incorrect password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1 text-xs text-stone-500 hover:text-stone-300 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to accounts
      </button>

      {/* Selected user badge */}
      <div className="flex items-center gap-3 bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-3">
        <div
          className={`w-10 h-10 rounded-xl ${roleMeta.bg} flex items-center justify-center text-white font-bold text-sm shrink-0`}
        >
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-stone-900 dark:text-stone-100 truncate">
            {displayName}
          </p>
          <p className="text-[11px] text-stone-500 capitalize">
            {roleMeta.label}
          </p>
        </div>
        <ChevronRight className="w-4 h-4 text-stone-400 shrink-0" />
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-950/60 border border-red-900 rounded-xl px-3 py-2.5 text-sm text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <Field label="Password">
        <TextInput
          type={showPw ? "text" : "password"}
          value={password}
          onChange={setPassword}
          placeholder="Enter your password"
          autoComplete="current-password"
          disabled={loading}
          inputRef={inputRef}
          rightSlot={
            <EyeToggle show={showPw} onToggle={() => setShowPw((v) => !v)} />
          }
        />
      </Field>

      <button
        type="submit"
        disabled={loading || !password}
        className="w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-stone-900 dark:text-white font-semibold py-3 rounded-xl text-sm transition-all active:scale-[0.98] mt-1 shadow-[0_4px_20px_#d9770630]"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Signing in…
          </>
        ) : (
          "Sign in"
        )}
      </button>
    </form>
  );
}

// ─── First-run choice: create or join ─────────────────────────────────────────

function FirstRunChoice({
  onSelectCreate,
  onSelectJoin,
}: {
  onSelectCreate: () => void;
  onSelectJoin: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 bg-amber-950/40 border border-amber-800/50 rounded-xl px-4 py-3">
        <UserPlus className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-semibold text-amber-300">
            First time setup
          </p>
          <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
            No users found on this device. Are you setting up a new
            organization, or joining one that already exists?
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onSelectCreate}
        className="w-full flex items-center gap-3 bg-white dark:bg-[#1c1917] border border-stone-300 dark:border-stone-700 hover:border-amber-600 rounded-xl px-4 py-3.5 text-left transition-colors"
      >
        <div className="w-9 h-9 rounded-lg bg-amber-500 flex items-center justify-center shrink-0">
          <UserPlus className="w-4 h-4 text-black" />
        </div>
        <div>
          <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
            Create new organization
          </p>
          <p className="text-xs text-stone-500 mt-0.5">
            Set up a new administrator account and start fresh.
          </p>
        </div>
      </button>

      <button
        type="button"
        onClick={onSelectJoin}
        className="w-full flex items-center gap-3 bg-white dark:bg-[#1c1917] border border-stone-300 dark:border-stone-700 hover:border-amber-600 rounded-xl px-4 py-3.5 text-left transition-colors"
      >
        <div className="w-9 h-9 rounded-lg bg-stone-700 flex items-center justify-center shrink-0">
          <Radio className="w-4 h-4 text-amber-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
            Join an existing organization
          </p>
          <p className="text-xs text-stone-500 mt-0.5">
            Connect to your admin's server using local network sync.
          </p>
        </div>
      </button>
    </div>
  );
}

// ─── First-run Signup Form (Local Admin) ──────────────────────────────────────

function SignupForm({
  onSignedUp,
  onBack,
}: {
  onSignedUp: () => void;
  onBack?: () => void;
}) {
  const createUser = useCreateUser();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password || !confirm) {
      setError("Please fill in all fields.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const passwordHash = await hashPassword(password);
      await createUser.mutateAsync({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        passwordHash,
        accessLevel: 9, // Super Admin
        position: 0,
      });
      onSignedUp();
    } catch (err: any) {
      setError(err?.message ?? "Failed to create administrator account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-xs text-stone-500 hover:text-stone-300 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
      )}

      <div className="flex items-start gap-3 bg-amber-950/40 border border-amber-800/50 rounded-xl px-4 py-3">
        <Shield className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-semibold text-amber-300">
            Create administrator account
          </p>
          <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
            This will be the master account with full access to settings and
            security.
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-950/60 border border-red-900 rounded-xl px-3 py-2.5 text-sm text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <Field label="Full name">
        <TextInput
          value={name}
          onChange={setName}
          placeholder="e.g. John Doe"
          autoComplete="name"
          disabled={loading}
        />
      </Field>

      <Field label="Email address">
        <TextInput
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="admin@yourbusiness.com"
          autoComplete="email"
          disabled={loading}
        />
      </Field>

      <Field label="Password">
        <TextInput
          type={showPw ? "text" : "password"}
          value={password}
          onChange={setPassword}
          placeholder="Min. 6 characters"
          autoComplete="new-password"
          disabled={loading}
          rightSlot={
            <EyeToggle show={showPw} onToggle={() => setShowPw((v) => !v)} />
          }
        />
      </Field>

      <Field label="Confirm password">
        <TextInput
          type={showPw ? "text" : "password"}
          value={confirm}
          onChange={setConfirm}
          placeholder="Repeat password"
          autoComplete="new-password"
          disabled={loading}
        />
      </Field>

      <button
        type="submit"
        disabled={loading || !name || !email || !password || !confirm}
        className="w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-stone-900 dark:text-white font-semibold py-3 rounded-xl text-sm transition-all active:scale-[0.98] mt-1 shadow-[0_4px_20px_#d9770630]"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Creating account…
          </>
        ) : (
          <>
            <UserPlus className="w-4 h-4" />
            Create administrator account
          </>
        )}
      </button>
    </form>
  );
}

// ─── Join Organization form (LAN sync) ───────────────────────────────────────

function JoinOrganizationForm({
  onJoined,
  onBack,
}: {
  onJoined: () => void;
  onBack: () => void;
}) {
  const {
    discoveredServers,
    isSearching,
    lastSyncError,
    discoverServers,
    connectToServer,
  } = useSync();
  const queryClient = useQueryClient();

  const [manualUrl, setManualUrl] = useState("");
  const [connectingUrl, setConnectingUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const hasScannedRef = useRef(false);

  useEffect(() => {
    if (!hasScannedRef.current) {
      hasScannedRef.current = true;
      discoverServers();
    }
  }, [discoverServers]);

  const handleConnect = async (url: string) => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setError("");
    setConnectingUrl(trimmed);
    try {
      const ok = await connectToServer(trimmed);
      if (ok) {
        await queryClient.invalidateQueries({ queryKey: ["users"] });
        onJoined();
      } else {
        setError(
          lastSyncError || "Could not connect to the organization server."
        );
      }
    } catch (err: any) {
      setError(err?.message ?? "Could not connect to the organization server.");
    } finally {
      setConnectingUrl(null);
    }
  };

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1 text-xs text-stone-500 hover:text-stone-300 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back
      </button>

      <div className="flex items-start gap-3 bg-amber-950/40 border border-amber-800/50 rounded-xl px-4 py-3">
        <Radio className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-semibold text-amber-300">
            Join organization
          </p>
          <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
            Connect to an existing POS server on your local network to sync user
            accounts and inventory.
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-950/60 border border-red-900 rounded-xl px-3 py-2.5 text-sm text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-stone-600 dark:text-stone-500 uppercase tracking-wider">
          Discovered servers
        </span>
        <button
          type="button"
          onClick={() => discoverServers()}
          disabled={isSearching}
          className="text-xs text-amber-500 hover:text-amber-400 disabled:opacity-50"
        >
          {isSearching ? "Scanning…" : "Scan again"}
        </button>
      </div>

      <div className="space-y-2">
        {discoveredServers.length === 0 ? (
          <div className="p-4 border border-dashed border-stone-300 dark:border-stone-700 rounded-xl text-center text-xs text-stone-500">
            {isSearching
              ? "Scanning local network…"
              : "No servers found. Try scanning again or enter a server address manually below."}
          </div>
        ) : (
          discoveredServers.map((srv, idx) => {
            const url = `http://${srv.ip}:${srv.port}`;
            const isThisConnecting = connectingUrl === url;
            return (
              <div
                key={idx}
                className="flex items-center justify-between p-3 bg-stone-50 dark:bg-[#1c1917] border border-stone-200 dark:border-stone-700 rounded-xl"
              >
                <div>
                  <span className="font-semibold text-sm block text-stone-900 dark:text-stone-100">
                    {srv.storeName || srv.name}
                  </span>
                  <span className="text-xs text-stone-500">
                    {srv.name} · {srv.ip}:{srv.port}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleConnect(url)}
                  disabled={!!connectingUrl}
                  className="px-3 py-1.5 text-xs text-white rounded-lg font-medium bg-amber-600 hover:bg-amber-500 disabled:opacity-50 transition-colors"
                >
                  {isThisConnecting ? "Connecting…" : "Connect"}
                </button>
              </div>
            );
          })
        )}
      </div>

      <div className="pt-2 border-t border-stone-200 dark:border-stone-800">
        <Field label="Or enter server address manually">
          <TextInput
            value={manualUrl}
            onChange={setManualUrl}
            placeholder="http://192.168.1.10:8080"
            disabled={!!connectingUrl}
          />
        </Field>
        <button
          type="button"
          onClick={() => handleConnect(manualUrl)}
          disabled={!manualUrl.trim() || !!connectingUrl}
          className="w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-stone-900 dark:text-white font-semibold py-3 rounded-xl text-sm transition-all active:scale-[0.98] mt-3"
        >
          {connectingUrl && connectingUrl === manualUrl.trim() ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Connecting…
            </>
          ) : (
            "Connect & join"
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Root Component ───────────────────────────────────────────────────────────

export default function LoginPage({ onLogin }: LoginPageProps) {
  const location = useLocation();
  const rawFrom = (location.state as any)?.from?.pathname;
  const from =
    rawFrom && rawFrom !== "/" && rawFrom !== "/login" ? rawFrom : "/pos";

  const usersQuery = useUsers();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [signedUp, setSignedUp] = useState(false);
  const [joined, setJoined] = useState(false);
  const [firstRunMode, setFirstRunMode] = useState<"choice" | "create" | "join">("choice");

  const isLoading = usersQuery.isLoading;
  const allUsers = usersQuery.data ?? [];
  const activeUsers = allUsers.filter(
    (u) => !u.deleted_at || u.deleted_at === "NULL"
  );
  const hasUsers = activeUsers.length > 0;
  const showLogin = hasUsers || signedUp || joined;

  return (
    <div className="min-h-screen bg-white dark:bg-[#1c1917] text-stone-900 dark:text-stone-100 flex items-center justify-center relative overflow-hidden w-screen">
      <DotGrid />

      <div className="relative z-10 w-full max-w-sm px-4">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-amber-500 flex items-center justify-center text-black font-bold text-2xl mb-4 shadow-[0_0_32px_#d9770640]">
            A
          </div>
          <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-100 tracking-tight">
            Axis Lite
          </h1>
          <p className="text-sm text-stone-600 dark:text-stone-500 mt-1">
            {showLogin
              ? selectedUser
                ? "Point of Sale · Enter password"
                : "Point of Sale · Select your account"
              : firstRunMode === "join"
                ? "Point of Sale · Join your organization"
                : "Point of Sale · First time setup"}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-700 rounded-2xl p-7 shadow-2xl">
          {isLoading ? (
            <div className="flex items-center justify-center py-10 gap-3 text-stone-500 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Checking database…
            </div>
          ) : signedUp && !hasUsers ? (
            /* Success state briefly shown after signup before re-query resolves */
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-950 border border-emerald-800 flex items-center justify-center">
                <Check className="w-5 h-5 text-emerald-400" />
              </div>
              <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                Account created!
              </p>
              <p className="text-xs text-stone-600 dark:text-stone-500">
                Loading sign-in screen…
              </p>
              <Loader2 className="w-4 h-4 animate-spin text-stone-600 mt-1" />
            </div>
          ) : joined && !hasUsers ? (
            /* Success state briefly shown after joining before re-query resolves */
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-950 border border-emerald-800 flex items-center justify-center">
                <Check className="w-5 h-5 text-emerald-400" />
              </div>
              <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                Connected!
              </p>
              <p className="text-xs text-stone-600 dark:text-stone-500">
                Loading sign-in screen…
              </p>
              <Loader2 className="w-4 h-4 animate-spin text-stone-600 mt-1" />
            </div>
          ) : !showLogin ? (
            firstRunMode === "choice" ? (
              <FirstRunChoice
                onSelectCreate={() => setFirstRunMode("create")}
                onSelectJoin={() => setFirstRunMode("join")}
              />
            ) : firstRunMode === "join" ? (
              <JoinOrganizationForm
                onJoined={() => setJoined(true)}
                onBack={() => setFirstRunMode("choice")}
              />
            ) : (
              <SignupForm
                onSignedUp={() => setSignedUp(true)}
                onBack={() => setFirstRunMode("choice")}
              />
            )
          ) : selectedUser ? (
            <PasswordForm
              selectedUser={selectedUser}
              navigateTo={from}
              onBack={() => setSelectedUser(null)}
              onLogin={onLogin}
            />
          ) : (
            <UserSelector
              users={activeUsers}
              onSelect={(u) => setSelectedUser(u)}
            />
          )}
        </div>

        <p className="text-center text-xs text-stone-800 mt-6">
          Axis Lite POS · &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
