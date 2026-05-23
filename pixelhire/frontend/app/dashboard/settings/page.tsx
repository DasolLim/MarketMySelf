"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { changePassword } from "@/lib/api";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 13px",
  background: "#FFFFFF",
  border: "1px solid rgba(0,0,0,0.18)",
  borderRadius: 7,
  fontFamily: "'Inter', sans-serif",
  fontSize: 14,
  color: "#191919",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 150ms, box-shadow 150ms",
};

export default function SettingsPage() {
  const { accessToken, isLoading, role, logout } = useAuth();
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !accessToken) router.push("/login");
    if (!isLoading && accessToken && role && role !== "seeker") router.push("/recruiter");
  }, [isLoading, accessToken, role, router]);

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (next !== confirm) { setError("New passwords do not match"); return; }
    if (next.length < 8) { setError("Password must be at least 8 characters"); return; }
    if (!accessToken) return;
    setSaving(true);
    try {
      await changePassword(current, next, accessToken);
      setSaved(true);
      setCurrent(""); setNext(""); setConfirm("");
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setSaving(false);
    }
  }

  const focusOn = (e: React.FocusEvent<HTMLInputElement>) => { e.target.style.borderColor = "#0A66C2"; e.target.style.boxShadow = "0 0 0 3px rgba(10,102,194,0.10)"; };
  const focusOff = (e: React.FocusEvent<HTMLInputElement>) => { e.target.style.borderColor = "rgba(0,0,0,0.18)"; e.target.style.boxShadow = "none"; };

  if (isLoading) {
    return (
      <main style={{ minHeight: "100vh", background: "#F3F2EF", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 18, height: 18, border: "2px solid rgba(10,102,194,0.2)", borderTopColor: "#0A66C2", borderRadius: "50%", animation: "spin 600ms linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", background: "#F3F2EF", padding: "80px clamp(20px, 5vw, 60px) 60px", position: "relative" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "#0A66C2" }} />
      <div style={{ maxWidth: 600, margin: "0 auto", animation: "fadeInUp 0.55s cubic-bezier(0.16,1,0.3,1) both" }}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#0A66C2", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 6 }}>Seeker dashboard</div>
            <h1 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: "clamp(22px, 4vw, 32px)", color: "#191919", letterSpacing: "-0.03em" }}>Settings</h1>
          </div>
          <Link href="/dashboard" style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#555555", textDecoration: "none", display: "flex", alignItems: "center", gap: 5 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
            Dashboard
          </Link>
        </div>

        <div style={{ background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, padding: "24px 28px", marginBottom: 16, boxShadow: "0 1px 8px rgba(0,0,0,0.04)" }}>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 20 }}>Change Password</div>
          <form onSubmit={handlePasswordChange} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600, color: "#191919", marginBottom: 6 }}>Current password</label>
              <input type="password" style={inputStyle} value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="••••••••" required onFocus={focusOn} onBlur={focusOff} />
            </div>
            <div>
              <label style={{ display: "block", fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600, color: "#191919", marginBottom: 6 }}>New password</label>
              <input type="password" style={inputStyle} value={next} onChange={(e) => setNext(e.target.value)} placeholder="Minimum 8 characters" required onFocus={focusOn} onBlur={focusOff} />
            </div>
            <div>
              <label style={{ display: "block", fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600, color: "#191919", marginBottom: 6 }}>Confirm new password</label>
              <input type="password" style={inputStyle} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Re-enter new password" required onFocus={focusOn} onBlur={focusOff} />
            </div>

            {saved && (
              <div style={{ padding: "10px 14px", background: "rgba(5,118,66,0.06)", border: "1px solid rgba(5,118,66,0.22)", borderRadius: 8, fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#057642" }}>
                Password updated successfully.
              </div>
            )}
            {error && (
              <div style={{ padding: "10px 14px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.22)", borderRadius: 8, fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#DC2626" }}>{error}</div>
            )}

            <button
              type="submit"
              disabled={saving}
              style={{ padding: "10px 24px", background: saving ? "rgba(10,102,194,0.5)" : "#0A66C2", border: "none", borderRadius: 20, color: "#fff", fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 14, cursor: saving ? "not-allowed" : "pointer", transition: "background 150ms", display: "inline-flex", alignItems: "center", gap: 8, alignSelf: "flex-start" }}>
              {saving ? (<><div style={{ width: 13, height: 13, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 600ms linear infinite" }} />Saving...</>) : "Update password"}
            </button>
          </form>
        </div>

        <div style={{ background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, padding: "24px 28px", boxShadow: "0 1px 8px rgba(0,0,0,0.04)" }}>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 16 }}>Account</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
            <div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 600, color: "#191919", marginBottom: 3 }}>Sign out</div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#9CA3AF" }}>You can sign back in at any time.</div>
            </div>
            <button
              onClick={() => { logout(); router.push("/"); }}
              style={{ padding: "8px 20px", background: "transparent", border: "1px solid rgba(0,0,0,0.20)", borderRadius: 20, color: "#555555", fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13, cursor: "pointer", transition: "border-color 150ms, color 150ms", flexShrink: 0 }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(0,0,0,0.40)"; e.currentTarget.style.color = "#191919"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(0,0,0,0.20)"; e.currentTarget.style.color = "#555555"; }}
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
      <style>{`@keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </main>
  );
}
