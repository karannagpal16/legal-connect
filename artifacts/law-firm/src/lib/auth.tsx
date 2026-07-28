import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Redirect } from "wouter";
import { setAuthTokenGetter } from "@workspace/api-client-react";

export type AppRole = "admin" | "advocate" | "client" | "intern";

export interface SessionUser {
  id: string | number;
  name: string;
  role: AppRole | "rna";
  email?: string | null;
  emailMasked?: string | null;
  phoneMasked?: string | null;
}

export interface AuthSession {
  token: string;
  user: SessionUser;
  demo?: boolean;
}

interface LoginInput {
  email: string;
  password: string;
}

interface RegisterInput extends LoginInput {
  name: string;
  role: Exclude<AppRole, "admin">;
}

interface AuthContextValue {
  session: AuthSession | null;
  ready: boolean;
  login: (input: LoginInput) => Promise<AuthSession>;
  register: (input: RegisterInput) => Promise<AuthSession>;
  demoLogin: (role: AppRole) => Promise<AuthSession>;
  logout: () => Promise<void>;
}

const STORAGE_KEY = "legal-connect-auth";
const AuthContext = createContext<AuthContextValue | null>(null);

export function normaliseRole(role?: string | null): AppRole {
  if (role === "rna" || role === "admin") return "admin";
  if (role === "advocate" || role === "intern") return role;
  return "client";
}

export function roleHome(role?: string | null) {
  return `/${normaliseRole(role)}`;
}

function readSession(): AuthSession | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value ? (JSON.parse(value) as AuthSession) : null;
  } catch {
    return null;
  }
}

function saveSession(session: AuthSession | null) {
  if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  else localStorage.removeItem(STORAGE_KEY);
}

setAuthTokenGetter(() => readSession()?.token ?? null);

async function authRequest(path: string, init: RequestInit = {}) {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      payload.error || payload.error_message || payload.message || "Unable to complete this request.",
    );
  }
  return payload;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => readSession());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    const saved = readSession();
    if (!saved) {
      setReady(true);
      return () => {
        active = false;
      };
    }

    authRequest("/api/auth/me", {
      headers: { Authorization: `Bearer ${saved.token}` },
    })
      .then((payload) => {
        if (!active || !payload.user) return;
        const next = { ...saved, user: { ...saved.user, ...payload.user } };
        setSession(next);
        saveSession(next);
      })
      .catch((error: Error & { status?: number }) => {
        if (!active) return;
        // Keep a demo session usable when the local API is temporarily offline.
        if (String(error.message).toLowerCase().includes("authentication required")) {
          setSession(null);
          saveSession(null);
        }
      })
      .finally(() => {
        if (active) setReady(true);
      });

    return () => {
      active = false;
    };
  }, []);

  const storePayload = (payload: any) => {
    const next: AuthSession = {
      token: payload.token,
      user: payload.user,
      demo: Boolean(payload.demo),
    };
    setSession(next);
    saveSession(next);
    return next;
  };

  const value = useMemo<AuthContextValue>(() => ({
    session,
    ready,
    async login(input) {
      const payload = await authRequest("/api/auth/strict/login", {
        method: "POST",
        body: JSON.stringify(input),
      });
      return storePayload(payload);
    },
    async register(input) {
      const payload = await authRequest("/api/auth/strict/register", {
        method: "POST",
        body: JSON.stringify({ ...input, privacyConsent: true }),
      });
      return storePayload(payload);
    },
    async demoLogin(role) {
      const payload = await authRequest("/api/auth/demo-login", {
        method: "POST",
        body: JSON.stringify({ role }),
      });
      return storePayload(payload);
    },
    async logout() {
      const token = session?.token;
      setSession(null);
      saveSession(null);
      if (!token) return;
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => undefined);
    },
  }), [ready, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}

export function RequireAuth({
  roles,
  children,
}: {
  roles?: AppRole[];
  children: ReactNode;
}) {
  const { session, ready } = useAuth();
  if (!ready) {
    return (
      <div className="lc-auth-loading" role="status">
        <span className="lc-spinner" />
        <p>Opening your workspace...</p>
      </div>
    );
  }
  if (!session) return <Redirect to="/login" />;
  const role = normaliseRole(session.user.role);
  if (roles && !roles.includes(role)) return <Redirect to={roleHome(role)} />;
  return children;
}
