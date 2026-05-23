"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 42px 11px 14px",
  background: "#FFFFFF",
  border: "1px solid rgba(0,0,0,0.20)",
  borderRadius: 8,
  color: "#191919",
  fontFamily: "'Inter', sans-serif",
  fontSize: 15,
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 150ms, box-shadow 150ms",
};

function EyeIcon({ visible }: { visible: boolean }) {
  return visible ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [error, setError]           = useState<string | null>(null);
  const [loading, setLoading]       = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const role = await login(email, password);
      router.push(role === "recruiter" ? "/recruiter" : "/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid credentials");
    } finally {
      setLoading(false);
    }
  }

  const focusOn: React.FocusEventHandler<HTMLInputElement> = (e) => {
    e.target.style.borderColor = "#0A66C2";
    e.target.style.boxShadow = "0 0 0 3px rgba(10,102,194,0.10)";
  };
  const focusOff: React.FocusEventHandler<HTMLInputElement> = (e) => {
    e.target.style.borderColor = "rgba(0,0,0,0.20)";
    e.target.style.boxShadow = "none";
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#F3F2EF",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "80px 24px 40px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "#0A66C2" }} />

      <div style={{ width: "100%", maxWidth: 400, position: "relative", animation: "fadeInUp 0.55s cubic-bezier(0.16,1,0.3,1) both" }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none", marginBottom: 28 }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: "#0A66C2", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="18" height="18" viewBox="0 0 14 14" fill="none">
                <rect x="1" y="1" width="5" height="5" rx="1.5" fill="white" opacity="0.95" />
                <rect x="8" y="1" width="5" height="5" rx="1.5" fill="white" opacity="0.65" />
                <rect x="1" y="8" width="5" height="5" rx="1.5" fill="white" opacity="0.65" />
                <rect x="8" y="8" width="5" height="5" rx="1.5" fill="white" opacity="0.35" />
              </svg>
            </div>
            <span style={{ fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700, fontSize: 18, color: "#191919", letterSpacing: "0.04em" }}>PixelHire</span>
          </Link>
          <h1 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 26, color: "#191919", letterSpacing: "-0.025em", marginBottom: 6 }}>
            Welcome back
          </h1>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, color: "#555555" }}>
            Sign in to manage your profile section
          </p>
        </div>

        {/* Form card */}
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid rgba(0,0,0,0.10)",
            borderRadius: 12,
            padding: "32px 28px",
            boxShadow: "0 2px 16px rgba(0,0,0,0.08)",
          }}
        >
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <label style={{ display: "block", fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600, color: "#191919", marginBottom: 7 }}>
                Email address
              </label>
              <input
                style={{ ...inputStyle, paddingRight: 14 }}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                onFocus={focusOn}
                onBlur={focusOff}
              />
            </div>

            <div>
              <label style={{ display: "block", fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600, color: "#191919", marginBottom: 7 }}>
                Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  style={inputStyle}
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  onFocus={focusOn}
                  onBlur={focusOff}
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onMouseDown={(e) => { e.preventDefault(); setShowPassword(true); }}
                  onMouseUp={() => setShowPassword(false)}
                  onMouseLeave={() => setShowPassword(false)}
                  onTouchStart={(e) => { e.preventDefault(); setShowPassword(true); }}
                  onTouchEnd={() => setShowPassword(false)}
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    color: "#9CA3AF",
                    display: "flex",
                    alignItems: "center",
                    transition: "color 150ms",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "#555555"; }}
                >
                  <EyeIcon visible={showPassword} />
                </button>
              </div>
            </div>

            {error && (
              <div
                style={{
                  padding: "11px 14px",
                  background: "rgba(239,68,68,0.06)",
                  border: "1px solid rgba(239,68,68,0.22)",
                  borderRadius: 8,
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 13,
                  color: "#DC2626",
                  fontWeight: 500,
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
                padding: "12px",
                background: loading ? "rgba(10,102,194,0.5)" : "#0A66C2",
                border: "none",
                borderRadius: 24,
                color: "#fff",
                fontFamily: "'Inter', sans-serif",
                fontWeight: 700,
                fontSize: 15,
                cursor: loading ? "not-allowed" : "pointer",
                transition: "background 150ms",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                marginTop: 4,
              }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = "#004182"; }}
              onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = "#0A66C2"; }}
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

        <p style={{ textAlign: "center", marginTop: 20, fontFamily: "'Inter', sans-serif", fontSize: 14, color: "#9CA3AF" }}>
          Don&apos;t have an account?{" "}
          <Link href="/register" style={{ color: "#0A66C2", textDecoration: "none", fontWeight: 600 }}>
            Join free
          </Link>
        </p>
      </div>
      <style>{`@keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </main>
  );
}
