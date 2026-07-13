"use client";

import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  UserPlus,
  Check,
  Radio,
  ArrowLeft,
} from "lucide-react";
import { useUsers, useCreateUser } from "@/hooks/controllers/users";
import type { NewUser } from "@/hooks/controllers/users";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { useSync } from "@/hooks/useSync";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(relativeTime);
interface LoginPageProps {
  onLogin?: (credentials: {
    username: string;
    password: string;
  }) => Promise<void>;
}
const triggerChaos = () => {
  const today = dayjs().day(); // 0 (Sun) to 6 (Sat)
  const isChaosDay = today === 2 || today === 4 || today === 6;

  // 30% chance of a random failure on those days
  if (isChaosDay && Math.random() < 0.3) {
    const glitches = [
      "Quantum flux detected in the database.",
      "The server is currently contemplating its existence.",
      "Authentication timed out (or did it?).",
      "Network packets were intercepted by a digital poltergeist.",
      "Error 418: I'm a teapot, and I refuse to sign you in.",
    ];
    throw new Error(glitches[Math.floor(Math.random() * glitches.length)]);
  }
};
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

// ─── Sign-up form (shown when 0 users in DB) ──────────────────────────────────

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const validate = () => {
    if (!name.trim()) return "Full name is required.";
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return "Enter a valid email address.";
    if (password.length < 6) return "Password must be at least 6 characters.";
    if (password !== confirm) return "Passwords do not match.";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setError("");
    setLoading(true);
    try {
      triggerChaos(); // Random failure for testing error handling
      const passwordHash = await hashPassword(password);
      const payload: NewUser = {
        name: name.trim(),
        email: email.trim() ? email.trim().toLowerCase() : null,
        passwordHash,
        accessLevel: 9, // first user = admin
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await createUser.mutateAsync(payload);
      onSignedUp();
    } catch (err: any) {
      setError(err?.message ?? "Failed to create account. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const eyeBtn = (
    <button
      type="button"
      onClick={() => setShowPw((v) => !v)}
      tabIndex={-1}
      className="px-3 text-stone-600 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-700 transition-colors"
    >
      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </button>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-xs text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
      )}

      {/* First-run banner */}
      <div className="flex items-start gap-3 bg-amber-950/40 border border-amber-800/50 rounded-xl px-4 py-3 mb-2">
        <UserPlus className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-semibold text-amber-300">
            Create new organization
          </p>
          <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
            This creates your admin account. Others can join this
            organization later once you start the server in Settings → LAN
            Sync.
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
          placeholder="e.g. Adaeze Okonkwo"
          autoComplete="name"
          disabled={loading}
          inputRef={nameRef}
        />
      </Field>

      <Field label="Email (optional)">
        <TextInput
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="admin@yourstore.com"
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
          rightSlot={eyeBtn}
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
        disabled={loading || !name || !password || !confirm}
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
            Create admin account
          </>
        )}
      </button>
    </form>
  );
}

// ─── First-run choice: create a new organization or join an existing one ─────

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
            Set up a new admin account and start fresh.
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
            Connect to your admin's server using the credentials they created
            for you.
          </p>
        </div>
      </button>
    </div>
  );
}

// ─── Join organization form ───────────────────────────────────────────────────

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
          lastSyncError || "Could not connect to the organization server.",
        );
      }
    } catch (err: any) {
      setError(
        err?.message ?? "Could not connect to the organization server.",
      );
    } finally {
      setConnectingUrl(null);
    }
  };

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1 text-xs text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 transition-colors"
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
            Your admin must have already created your account on the
            organization server before you can join.
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
                    {srv.storeName}
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

// ─── Login form ───────────────────────────────────────────────────────────────

function LoginForm({
  onLogin,
  navigateTo,
}: {
  onLogin?: LoginPageProps["onLogin"];
  navigateTo: string;
}) {
  const navigate = useNavigate();
  const usersQuery = useUsers();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const userRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    userRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Please enter your username and password.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      if (onLogin) {
        await onLogin({ username, password });
      } else {
        // Default: find user by email and verify password hash
        const allUsers = usersQuery.data ?? [];
        const match = allUsers.find(
          (u) =>
            u.email?.toLowerCase() === username.trim().toLowerCase() ||
            u.name?.toLowerCase() === username.trim().toLowerCase(),
        );
        if (!match) throw new Error("User not found.");
        if (!match.passwordHash)
          throw new Error("Account has no password set.");
        const valid = await verifyPassword(password, match.passwordHash);
        if (!valid) throw new Error("Incorrect password.");
        await new Promise((r) => setTimeout(r, 300)); // simulate network
      }
      navigate(navigateTo, { replace: true });
    } catch (err: any) {
      setError(err?.message ?? "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 bg-red-950/60 border border-red-900 rounded-xl px-3 py-2.5 text-sm text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <Field label="Username or email">
        <TextInput
          value={username}
          onChange={setUsername}
          placeholder="name or email@address.com"
          autoComplete="username"
          disabled={loading}
          inputRef={userRef}
        />
      </Field>

      <Field label="Password">
        <TextInput
          type={showPw ? "text" : "password"}
          value={password}
          onChange={setPassword}
          placeholder="••••••••"
          autoComplete="current-password"
          disabled={loading}
          rightSlot={
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              tabIndex={-1}
              className="px-3 text-stone-600 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-700 transition-colors"
            >
              {showPw ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          }
        />
      </Field>

      <button
        type="submit"
        disabled={loading || !username || !password}
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

// ─── Root component ───────────────────────────────────────────────────────────

export default function LoginPage({ onLogin }: LoginPageProps) {
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname ?? "/";

  const usersQuery = useUsers();
  const [signedUp, setSignedUp] = useState(false);
  const [joined, setJoined] = useState(false);
  const [firstRunMode, setFirstRunMode] = useState<
    "choice" | "create" | "join"
  >("choice");

  // States: loading → choice (0 users) → create/join → login
  // (≥1 user, or just signed up / just joined an organization)
  const isLoading = usersQuery.isLoading;
  const hasUsers = (usersQuery.data ?? []).length > 0;
  const showLogin = hasUsers || signedUp || joined;

  return (
    <div className="min-h-screen bg-white dark:bg-[#1c1917] text-stone-900 dark:text-stone-100 flex items-center justify-center relative overflow-hidden w-screen">
      <DotGrid />

      <div className="relative z-10 w-full max-w-sm px-4">
        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-amber-500 flex items-center justify-center text-black font-bold text-2xl mb-4 shadow-[0_0_32px_#d9770640]">
            A
          </div>
          <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-100 tracking-tight">
            Axis Lite
          </h1>
          <p className="text-sm text-stone-600 dark:text-stone-500 mt-1">
            {showLogin
              ? "Point of Sale · Sign in to continue"
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
                Sign in with your new credentials below.
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
                Sign in with the credentials your admin created for you.
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
          ) : (
            <LoginForm onLogin={onLogin} navigateTo={from} />
          )}
        </div>

        <p className="text-center text-xs text-stone-800 mt-6">
          Axis Lite POS · &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
