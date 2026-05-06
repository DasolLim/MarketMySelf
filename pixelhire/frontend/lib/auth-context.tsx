"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { login as apiLogin, register as apiRegister } from "./api";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface AuthContextValue {
  accessToken: string | null;
  userId: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function decodeJwt(token: string): { sub: string } | null {
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const refreshToken = localStorage.getItem("refresh_token");
    if (!refreshToken) { setIsLoading(false); return; }

    fetch(`${API}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.access_token) {
          setAccessToken(data.access_token);
          localStorage.setItem("refresh_token", data.refresh_token);
          const decoded = decodeJwt(data.access_token);
          if (decoded) setUserId(decoded.sub);
        } else {
          localStorage.removeItem("refresh_token");
        }
      })
      .catch(() => localStorage.removeItem("refresh_token"))
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiLogin(email, password);
    setAccessToken(data.access_token);
    localStorage.setItem("refresh_token", data.refresh_token);
    const decoded = decodeJwt(data.access_token);
    if (decoded) setUserId(decoded.sub);
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    await apiRegister(email, password);
  }, []);

  const logout = useCallback(() => {
    setAccessToken(null);
    setUserId(null);
    localStorage.removeItem("refresh_token");
  }, []);

  return (
    <AuthContext.Provider value={{ accessToken, userId, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
