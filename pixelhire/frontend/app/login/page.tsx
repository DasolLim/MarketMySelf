"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 16px",
  background: "#0c0f1d",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: 10,
  color: "#f0f2fa",
  fontFamily: "'Inter', sans-serif",
  fontSize: 15,
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 150ms",
};

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid credentials");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#07080f",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "80px 24px 40px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(255,255,255,0.02) 1px, transparent 1px)", backgroundSize: "36px 36px", pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: "20%", left: "50%", transform: "translateX(-50%)", width: 700, height: 600, background: "radial-gradient(ellipse, rgba(99,102,241,0.07) 0%, transparent 65%)", pointerEvents: "none" }} />

      <div style={{ width: "100%", maxWidth: 400, position: "relative", animation: "fadeInUp 0.65s cubic-bezier(0.16,1,0.3,1) both" }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none", marginBottom: 28 }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: "linear-gradient(135deg, #6366f1, #818cf8)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 24px rgba(99,102,241,0.40)" }}>
              <svg width="18" height="18" viewBox="0 0 14 14" fill="none">
                <rect x="1" y="1" width="5" height="5" rx="1.5" fill="white" opacity="0.9" />
                <rect x="8" y="1" width="5" height="5" rx="1.5" fill="white" opacity="0.55" />
                <rect x="1" y="8" width="5" height="5" rx="1.5" fill="white" opacity="0.55" />
                <rect x="8" y="8" width="5" height="5" rx="1.5" fill="white" opacity="0.25" />
              </svg>
            </div>
            <span style={{ fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700, fontSize: 18, color: "#f0f2fa", letterSpacing: "0.04em" }}>PixelHire</span>
          </Link>
          <h1 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 28, color: "#f0f2fa", letterSpacing: "-0.025em", marginBottom: 8 }}>
            Welcome back
          </h1>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, color: "#8492b8" }}>
            Sign in to manage your section
          </p>
        </div>

        {/* Form card */}
        <div
          style={{
            background: "#0c0f1d",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 16,
            padding: "32px 28px",
          }}
        >
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 500, color: "#8492b8", marginBottom: 8 }}>
                Email address
              </label>
              <input
                style={inputStyle}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                onFocus={(e) => { e.target.style.borderColor = "rgba(99,102,241,0.55)"; }}
                onBlur={(e)  => { e.target.style.borderColor = "rgba(255,255,255,0.09)"; }}
              />
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <label style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 500, color: "#8492b8" }}>
                  Password
                </label>
              </div>
              <input
                style={inputStyle}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                onFocus={(e) => { e.target.style.borderColor = "rgba(99,102,241,0.55)"; }}
                onBlur={(e)  => { e.target.style.borderColor = "rgba(255,255,255,0.09)"; }}
              />
            </div>

            {error && (
              <div
                style={{
                  padding: "12px 14px",
                  background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.22)",
                  borderRadius: 8,
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 13,
                  color: "#f87171",
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "13px",
                background: loading ? "rgba(99,102,241,0.4)" : "#6366f1",
                border: "none",
                borderRadius: 10,
                color: "#fff",
                fontFamily: "'Inter', sans-serif",
                fontWeight: 600,
                fontSize: 15,
                cursor: loading ? "not-allowed" : "pointer",
                transition: "background 150ms, transform 120ms",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                marginTop: 4,
              }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = "#5254cc"; }}
              onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = "#6366f1"; }}
            >
              {loading ? (
                <>
                  <div style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 600ms linear infinite" }} />
                  Signing in...
                </>
              ) : "Sign in"}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p style={{ textAlign: "center", marginTop: 20, fontFamily: "'Inter', sans-serif", fontSize: 14, color: "#4a5578" }}>
          Don't have an account?{" "}
          <Link href="/register" style={{ color: "#818cf8", textDecoration: "none", fontWeight: 500 }}>
            Create one free
          </Link>
        </p>
      </div>
    </main>
  );
}
