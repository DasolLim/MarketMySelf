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

export default function RegisterPage() {
  const { register } = useAuth();
  const router       = useRouter();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [error, setError]       = useState<string | null>(null);
  const [success, setSuccess]   = useState(false);
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) { setError("Passwords do not match"); return; }
    if (password.length < 8)  { setError("Password must be at least 8 characters"); return; }
    setLoading(true);
    try {
      await register(email, password);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  const base: React.CSSProperties = {
    minHeight: "100vh",
    background: "#07080f",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "80px 24px 40px",
    position: "relative",
    overflow: "hidden",
  };

  if (success) {
    return (
      <main style={base}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(255,255,255,0.02) 1px, transparent 1px)", backgroundSize: "36px 36px", pointerEvents: "none" }} />
        <div style={{ textAlign: "center", maxWidth: 420, position: "relative", animation: "scaleIn 0.5s ease both" }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.28)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          </div>
          <h1 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 28, color: "#f0f2fa", letterSpacing: "-0.025em", marginBottom: 12 }}>
            Check your inbox
          </h1>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, color: "#8492b8", lineHeight: 1.7, marginBottom: 32 }}>
            We sent a verification link to <span style={{ color: "#f0f2fa", fontWeight: 500 }}>{email}</span>. Click it to activate your account and claim your section.
          </p>
          <Link href="/login" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "12px 28px", background: "#6366f1", borderRadius: 10, color: "#fff", fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 15, textDecoration: "none" }}>
            Go to sign in
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main style={base}>
      {/* Background */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(255,255,255,0.02) 1px, transparent 1px)", backgroundSize: "36px 36px", pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: "20%", left: "50%", transform: "translateX(-50%)", width: 700, height: 600, background: "radial-gradient(ellipse, rgba(99,102,241,0.07) 0%, transparent 65%)", pointerEvents: "none" }} />

      <div style={{ width: "100%", maxWidth: 420, position: "relative", animation: "fadeInUp 0.65s cubic-bezier(0.16,1,0.3,1) both" }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none", marginBottom: 24 }}>
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
            Create your account
          </h1>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, color: "#8492b8" }}>
            Free to join. Sections are one-time purchase.
          </p>
        </div>

        {/* Feature pills */}
        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 28 }}>
          {["Personal profile", "Company visibility", "One-time fee"].map((pill) => (
            <span key={pill} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.18)", borderRadius: 100, fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#818cf8", letterSpacing: "0.06em" }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
              {pill}
            </span>
          ))}
        </div>

        {/* Form card */}
        <div style={{ background: "#0c0f1d", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "32px 28px" }}>
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
              <label style={{ display: "block", fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 500, color: "#8492b8", marginBottom: 8 }}>
                Password
              </label>
              <input
                style={inputStyle}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                required
                onFocus={(e) => { e.target.style.borderColor = "rgba(99,102,241,0.55)"; }}
                onBlur={(e)  => { e.target.style.borderColor = "rgba(255,255,255,0.09)"; }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 500, color: "#8492b8", marginBottom: 8 }}>
                Confirm password
              </label>
              <input
                style={inputStyle}
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Re-enter password"
                required
                onFocus={(e) => { e.target.style.borderColor = "rgba(99,102,241,0.55)"; }}
                onBlur={(e)  => { e.target.style.borderColor = "rgba(255,255,255,0.09)"; }}
              />
            </div>

            {error && (
              <div style={{ padding: "12px 14px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.22)", borderRadius: 8, fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#f87171" }}>
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
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                marginTop: 4,
                transition: "background 150ms",
              }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = "#5254cc"; }}
              onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = "#6366f1"; }}
            >
              {loading ? (
                <>
                  <div style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 600ms linear infinite" }} />
                  Creating account...
                </>
              ) : "Create free account"}
            </button>

            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#4a5578", textAlign: "center", lineHeight: 1.6 }}>
              By registering you agree to our terms. No subscription — sections are a one-time fee.
            </p>
          </form>
        </div>

        {/* Footer */}
        <p style={{ textAlign: "center", marginTop: 20, fontFamily: "'Inter', sans-serif", fontSize: 14, color: "#4a5578" }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "#818cf8", textDecoration: "none", fontWeight: 500 }}>
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
