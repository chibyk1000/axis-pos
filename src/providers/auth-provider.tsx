import {
  ReactNode,
  createContext,
  useContext,
  useState,
} from "react";
import { db } from "@/db/database";
import { users } from "@/db/schema";
import { eq, or } from "drizzle-orm";
import { verifyPassword } from "@/lib/auth";

interface AuthUser {
  id: number;
  username: string;
  accessLevel: number;
}

interface AuthCtx {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthCtx | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside <AuthProvider>");
  return ctx;
}

const SESSION_KEY = "axis_lite_session";

/**
 * Non-hook accessor for the logged-in user. Mutation functions (drizzle
 * inserts/updates in hooks/controllers/*) run outside React's render tree
 * and can't call useAuth(), but still need to know "who did this" to write
 * activity-log entries.
 */
export function getCurrentUser(): AuthUser | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const login = async (username: string, password: string) => {
    if (!username || !password)
      throw new Error("Username and password required.");

    const normalized = username.trim().toLowerCase();
    const userRecord = await db.query.users.findFirst({
      where: or(eq(users.email, normalized), eq(users.name, username.trim())),
    });

    if (!userRecord) throw new Error("User not found.");
    if (!userRecord.passwordHash)
      throw new Error("This account has no password set.");

    const valid = await verifyPassword(password, userRecord.passwordHash);
    if (!valid) throw new Error("Invalid credentials.");

    const u: AuthUser = {
      id: userRecord.id,
      username: userRecord.name ?? userRecord.email ?? "",
      accessLevel: userRecord.accessLevel ?? 1,
    };

    sessionStorage.setItem(SESSION_KEY, JSON.stringify(u));
    setUser(u);
  };

  const logout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}
