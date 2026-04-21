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
} from "lucide-react";
import { useUsers, useCreateUser } from "@/hooks/controllers/users";
import type { NewUser } from "@/hooks/controllers/users";
import { hashPassword, verifyPassword } from "@/lib/auth";
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
            "radial-gradient(ellipse 80% 60% at 50% 50%, transparent 10%, #020617 75%)",
        }}
      />
      <div
        className="absolute -top-20 left-1/2 -translate-x-1/2 w-[500px] h-[260px] rounded-full opacity-[0.08]"
        style={{ background: "#0891b2", filter: "blur(60px)" }}
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
      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-500 uppercase tracking-wider mb-1.5">
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
    <div className="bg-white dark:bg-[#020617] border border-slate-300 dark:border-slate-700 rounded-xl focus-within:border-cyan-600 transition-colors flex items-center">
      <input
        ref={inputRef}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        disabled={disabled}
        className="flex-1 bg-transparent px-4 py-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-700 outline-none rounded-xl disabled:opacity-50"
      />
      {rightSlot}
    </div>
  );
}

// ─── Sign-up form (shown when 0 users in DB) ──────────────────────────────────

function SignupForm({ onSignedUp }: { onSignedUp: () => void }) {
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
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
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
        email: email.trim().toLowerCase(),
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
      className="px-3 text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-700 transition-colors"
    >
      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </button>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* First-run banner */}
      <div className="flex items-start gap-3 bg-cyan-950/40 border border-cyan-800/50 rounded-xl px-4 py-3 mb-2">
        <UserPlus className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-semibold text-cyan-300">
            First time setup
          </p>
          <p className="text-[11px] text-cyan-700 mt-0.5 leading-relaxed">
            No users found. Create an admin account to get started.
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

      <Field label="Email">
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
        disabled={loading || !name || !email || !password || !confirm}
        className="w-full flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed text-slate-900 dark:text-white font-semibold py-3 rounded-xl text-sm transition-all active:scale-[0.98] mt-1 shadow-[0_4px_20px_#0891b230]"
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
              className="px-3 text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-700 transition-colors"
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
        className="w-full flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed text-slate-900 dark:text-white font-semibold py-3 rounded-xl text-sm transition-all active:scale-[0.98] mt-1 shadow-[0_4px_20px_#0891b230]"
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

  // Three states: loading → signup (0 users) → login (≥1 user or just signed up)
  const isLoading = usersQuery.isLoading;
  const hasUsers = (usersQuery.data ?? []).length > 0;
  const showLogin = hasUsers || signedUp;

  return (
    <div className="min-h-screen bg-white dark:bg-[#020617] text-slate-900 dark:text-slate-100 flex items-center justify-center relative overflow-hidden w-screen">
      <DotGrid />

      <div className="relative z-10 w-full max-w-sm px-4">
        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500 flex items-center justify-center text-black font-bold text-2xl mb-4 shadow-[0_0_32px_#0891b240]">
            A
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
            Axis Lite
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-500 mt-1">
            {showLogin
              ? "Point of Sale · Sign in to continue"
              : "Point of Sale · First time setup"}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-2xl p-7 shadow-2xl">
          {isLoading ? (
            <div className="flex items-center justify-center py-10 gap-3 text-slate-500 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Checking database…
            </div>
          ) : signedUp && !hasUsers ? (
            /* Success state briefly shown after signup before re-query resolves */
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-950 border border-emerald-800 flex items-center justify-center">
                <Check className="w-5 h-5 text-emerald-400" />
              </div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Account created!
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-500">
                Sign in with your new credentials below.
              </p>
              <Loader2 className="w-4 h-4 animate-spin text-slate-600 mt-1" />
            </div>
          ) : !showLogin ? (
            <SignupForm onSignedUp={() => setSignedUp(true)} />
          ) : (
            <LoginForm onLogin={onLogin} navigateTo={from} />
          )}
        </div>

        <p className="text-center text-xs text-slate-800 mt-6">
          Axis Lite POS · &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
