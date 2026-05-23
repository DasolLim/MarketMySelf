"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { login as apiLogin, register as apiRegister } from "./api";
import { UserRole } from "@/types";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface AuthContextValue {
  accessToken: string | null;
  userId: string | null;
  role: UserRole | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<UserRole>;
  register: (email: string, password: string, role: UserRole) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface JwtPayload {
  sub: string;
  role?: UserRole;
  exp?: number;
}

function decodeJwt(token: string): JwtPayload | null {
  try {
    return JSON.parse(atob(token.split(".")[1])) as JwtPayload;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [userId, setUserId]           = useState<string | null>(null);
  const [role, setRole]               = useState<UserRole | null>(null);
  const [isLoading, setIsLoading]     = useState(true);

  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Core refresh call ─────────────────────────────────────────────────────
  const doRefresh = useCallback(async (): Promise<string | null> => {
    const stored = localStorage.getItem("refresh_token");
    if (!stored) return null;

    try {
      const res = await fetch(`${API}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: stored }),
      });
      if (!res.ok) { localStorage.removeItem("refresh_token"); return null; }

      const data = await res.json();
      if (!data?.access_token) { localStorage.removeItem("refresh_token"); return null; }

      setAccessToken(data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);
      const decoded = decodeJwt(data.access_token);
      if (decoded) {
        setUserId(decoded.sub);
        setRole(decoded.role ?? "seeker");
      }
      return data.access_token as string;
    } catch {
      return null;
    }
  }, []);

  // ── Schedule next proactive refresh 60 s before token expiry ─────────────
  const scheduleRefresh = useCallback(
    (token: string) => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      const decoded = decodeJwt(token);
      if (!decoded?.exp) return;

      const msUntilExpiry = decoded.exp * 1000 - Date.now();
      const delay = Math.max(0, msUntilExpiry - 60_000);

      refreshTimerRef.current = setTimeout(async () => {
        const newToken = await doRefresh();
        if (newToken) scheduleRefresh(newToken);
      }, delay);
    },
    [doRefresh],
  );

  // ── On mount: restore session then schedule ongoing refresh ──────────────
  useEffect(() => {
    const refreshToken = localStorage.getItem("refresh_token");
    if (!refreshToken) { setIsLoading(false); return; }

    doRefresh()
      .then((token) => { if (token) scheduleRefresh(token); })
      .finally(() => setIsLoading(false));

    return () => { if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current); };
  }, [doRefresh, scheduleRefresh]);

  // ── login / register / logout ─────────────────────────────────────────────
  const login = useCallback(
    async (email: string, password: string): Promise<UserRole> => {
      const data = await apiLogin(email, password);
      setAccessToken(data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);
      const decoded = decodeJwt(data.access_token);
      const resolvedRole: UserRole = decoded?.role ?? "seeker";
      if (decoded) {
        setUserId(decoded.sub);
        setRole(resolvedRole);
      }
      scheduleRefresh(data.access_token);
      return resolvedRole;
    },
    [scheduleRefresh],
  );

  const register = useCallback(
    async (email: string, password: string, userRole: UserRole) => {
      await apiRegister(email, password, userRole);
    },
    [],
  );

  const logout = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    setAccessToken(null);
    setUserId(null);
    setRole(null);
    localStorage.removeItem("refresh_token");
  }, []);

  return (
    <AuthContext.Provider value={{ accessToken, userId, role, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
