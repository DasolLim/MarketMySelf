"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { UserRole } from "@/types";

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

function PasswordInput({
  value,
  onChange,
  placeholder,
  show,
  onShowChange,
  onFocus,
  onBlur,
  required,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  show: boolean;
  onShowChange: (v: boolean) => void;
  onFocus: React.FocusEventHandler<HTMLInputElement>;
  onBlur: React.FocusEventHandler<HTMLInputElement>;
  required?: boolean;
}) {
  return (
    <div style={{ position: "relative" }}>
      <input
        style={inputStyle}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        onFocus={onFocus}
        onBlur={onBlur}
      />
      <button
        type="button"
        aria-label={show ? "Hide password" : "Show password"}
        onMouseDown={(e) => { e.preventDefault(); onShowChange(true); }}
        onMouseUp={() => onShowChange(false)}
        onMouseLeave={() => onShowChange(false)}
        onTouchStart={(e) => { e.preventDefault(); onShowChange(true); }}
        onTouchEnd={() => onShowChange(false)}
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
        <EyeIcon visible={show} />
      </button>
    </div>
  );
}

export default function RegisterPage() {
  const { register } = useAuth();
  const router       = useRouter();
  const [email, setEmail]             = useState("");
  const [password, setPassword]       = useState("");
  const [confirm, setConfirm]         = useState("");
  const [role, setRole]               = useState<UserRole>("seeker");
  const [error, setError]             = useState<string | null>(null);
  const [success, setSuccess]         = useState(false);
  const [loading, setLoading]         = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) { setError("Passwords do not match"); return; }
    if (password.length < 8)  { setError("Password must be at least 8 characters"); return; }
    setLoading(true);
    try {
      await register(email, password, role);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  const base: React.CSSProperties = {
    minHeight: "100vh",
    background: "#F3F2EF",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "80px 24px 40px",
    position: "relative",
    overflow: "hidden",
  };

  const focusOn: React.FocusEventHandler<HTMLInputElement> = (e) => {
    e.target.style.borderColor = "#0A66C2";
    e.target.style.boxShadow = "0 0 0 3px rgba(10,102,194,0.10)";
  };
  const focusOff: React.FocusEventHandler<HTMLInputElement> = (e) => {
    e.target.style.borderColor = "rgba(0,0,0,0.20)";
    e.target.style.boxShadow = "none";
  };

  if (success) {
    return (
      <main style={base}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "#0A66C2" }} />
        <div style={{ textAlign: "center", maxWidth: 420, position: "relative", animation: "scaleIn 0.5s ease both", background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.10)", borderRadius: 16, padding: "48px 36px", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
          <div style={{ width: 60, height: 60, borderRadius: "50%", background: "rgba(5,118,66,0.10)", border: "2px solid rgba(5,118,66,0.25)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#057642" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <h1 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 26, color: "#191919", letterSpacing: "-0.025em", marginBottom: 10 }}>
            Check your inbox
          </h1>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, color: "#555555", lineHeight: 1.7, marginBottom: 32 }}>
            We sent a verification link to <span style={{ color: "#191919", fontWeight: 600 }}>{email}</span>. Click it to activate your account and claim your section.
          </p>
          <Link href="/login" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "12px 28px", background: "#0A66C2", borderRadius: 24, color: "#fff", fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 15, textDecoration: "none" }}>
            Go to sign in
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
          </Link>
        </div>
        <style>{`@keyframes scaleIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }`}</style>
      </main>
    );
  }

  return (
    <main style={base}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "#0A66C2" }} />

      <div style={{ width: "100%", maxWidth: 440, position: "relative", animation: "fadeInUp 0.55s cubic-bezier(0.16,1,0.3,1) both" }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none", marginBottom: 22 }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: "#0A66C2", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="18" height="18" viewBox="0 0 14 14" fill="none">
                <rect x="1" y="1" width="5" height="5" rx="1.5" fill="white" opacity="0.95" />
                <rect x="8" y="1" width="5" height="5" rx="1.5" fill="white" opacity="0.65" />
                <rect x="1" y="8" width="5" height="5" rx="1.5" fill="white" opacity="0.65" />
                <rect x="8" y="8" width="5" height="5" rx="1.5" fill="white" opacity="0.35" />
              </svg>
            </div>
            <span style={{ fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700, fontSize: 18, color: "#191919", letterSpacing: "0.04em" }}>MarketMySelf</span>
          </Link>
          <h1 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 26, color: "#191919", letterSpacing: "-0.025em", marginBottom: 6 }}>
            Create your account
          </h1>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, color: "#555555" }}>
            Free to join. Section is a one-time purchase.
          </p>
        </div>

        {/* Feature pills */}
        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 24 }}>
          {[
            { label: "87% interview rate", color: "#057642" },
            { label: "3× more callbacks", color: "#0A66C2" },
            { label: "One-time fee", color: "#B45309" },
          ].map((pill) => (
            <span key={pill.label} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 11px", background: pill.color + "10", border: `1px solid ${pill.color}28`, borderRadius: 100, fontFamily: "'Inter', sans-serif", fontSize: 11, color: pill.color, fontWeight: 600 }}>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
              {pill.label}
            </span>
          ))}
        </div>

        {/* Form card */}
        <div style={{ background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.10)", borderRadius: 12, padding: "32px 28px", boxShadow: "0 2px 16px rgba(0,0,0,0.08)" }}>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600, color: "#191919", marginBottom: 8 }}>
                I am a
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {(["seeker", "recruiter"] as UserRole[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    style={{
                      padding: "10px 12px",
                      background: role === r ? "#0A66C2" : "#FFFFFF",
                      border: `1px solid ${role === r ? "#0A66C2" : "rgba(0,0,0,0.20)"}`,
                      borderRadius: 8,
                      color: role === r ? "#fff" : "#555555",
                      fontFamily: "'Inter', sans-serif",
                      fontWeight: 600,
                      fontSize: 14,
                      cursor: "pointer",
                      transition: "background 150ms, border-color 150ms, color 150ms",
                    }}
                  >
                    {r === "seeker" ? "Job Seeker" : "Recruiter"}
                  </button>
                ))}
              </div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#9CA3AF", marginTop: 6 }}>
                {role === "seeker" ? "Claim a billboard section and get discovered." : "Search talent and post jobs."}
              </div>
            </div>

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
              <PasswordInput
                value={password}
                onChange={setPassword}
                placeholder="Minimum 8 characters"
                show={showPassword}
                onShowChange={setShowPassword}
                onFocus={focusOn}
                onBlur={focusOff}
                required
              />
            </div>

            <div>
              <label style={{ display: "block", fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600, color: "#191919", marginBottom: 7 }}>
                Confirm password
              </label>
              <PasswordInput
                value={confirm}
                onChange={setConfirm}
                placeholder="Re-enter password"
                show={showConfirm}
                onShowChange={setShowConfirm}
                onFocus={focusOn}
                onBlur={focusOff}
                required
              />
            </div>

            {error && (
              <div style={{ padding: "11px 14px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.22)", borderRadius: 8, fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#DC2626", fontWeight: 500 }}>
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
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                marginTop: 4,
                transition: "background 150ms",
              }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = "#004182"; }}
              onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = "#0A66C2"; }}
            >
              {loading ? (
                <>
                  <div style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 600ms linear infinite" }} />
                  Creating account...
                </>
              ) : "Create free account"}
            </button>

            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#9CA3AF", textAlign: "center", lineHeight: 1.6 }}>
              By joining you agree to our terms. No subscription — sections are a one-time fee.
            </p>
          </form>
        </div>

        <p style={{ textAlign: "center", marginTop: 20, fontFamily: "'Inter', sans-serif", fontSize: 14, color: "#9CA3AF" }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "#0A66C2", textDecoration: "none", fontWeight: 600 }}>
            Sign in
          </Link>
        </p>
      </div>
      <style>{`@keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </main>
  );
}
