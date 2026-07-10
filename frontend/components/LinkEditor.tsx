"use client";

import React, { useState } from "react";
import { LinksPayload } from "@/types";

interface Props {
  initial?: Record<string, string> | null;
  onSave: (links: LinksPayload) => Promise<void>;
}

const LINK_FIELDS: { key: keyof LinksPayload; label: string; placeholder: string }[] = [
  { key: "github", label: "GitHub", placeholder: "https://github.com/username" },
  { key: "linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/in/username" },
  { key: "portfolio", label: "Portfolio", placeholder: "https://yoursite.com" },
  { key: "twitter", label: "Twitter / X", placeholder: "https://twitter.com/username" },
  { key: "other", label: "Other", placeholder: "https://..." },
];

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
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

export default function LinkEditor({ initial, onSave }: Props) {
  const [values, setValues] = useState<Record<string, string>>(
    (initial as Record<string, string>) ?? {}
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await onSave(values as LinksPayload);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save links");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {LINK_FIELDS.map(({ key, label, placeholder }) => (
          <div key={key}>
            <label style={{ display: "block", fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 600, color: "#555555", marginBottom: 5 }}>
              {label}
            </label>
            <input
              style={inputStyle}
              type="url"
              value={values[key] ?? ""}
              placeholder={placeholder}
              onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
              onFocus={(e) => { e.target.style.borderColor = "#0A66C2"; e.target.style.boxShadow = "0 0 0 3px rgba(10,102,194,0.10)"; }}
              onBlur={(e) => { e.target.style.borderColor = "rgba(0,0,0,0.18)"; e.target.style.boxShadow = "none"; }}
            />
          </div>
        ))}
      </div>

      {error && (
        <div style={{ marginTop: 12, padding: "10px 14px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.22)", borderRadius: 7, fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#DC2626" }}>
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={saving}
        style={{
          marginTop: 16,
          padding: "10px 24px",
          background: saved ? "#057642" : saving ? "rgba(10,102,194,0.5)" : "#0A66C2",
          border: "none",
          borderRadius: 20,
          color: "#fff",
          fontFamily: "'Inter', sans-serif",
          fontWeight: 600,
          fontSize: 14,
          cursor: saving ? "not-allowed" : "pointer",
          transition: "background 150ms",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        {saving ? (
          <>
            <div style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 600ms linear infinite" }} />
            Saving...
          </>
        ) : saved ? "Saved!" : "Save links"}
      </button>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </form>
  );
}
