"use client";

import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import type { PixelSection, JobCategory, SectionUpdatePayload } from "@/types";
import { updateSection, uploadSectionImage } from "@/lib/api";

const CATEGORIES: JobCategory[] = ["Technical", "Marketing", "Finance"];

const CAT_COLOR: Record<JobCategory, { color: string; border: string; bg: string }> = {
  Technical: { color: "#22d3ee", border: "rgba(34,211,238,0.40)",  bg: "rgba(34,211,238,0.08)"  },
  Marketing: { color: "#c084fc", border: "rgba(192,132,252,0.40)", bg: "rgba(192,132,252,0.08)" },
  Finance:   { color: "#34d399", border: "rgba(52,211,153,0.40)",  bg: "rgba(52,211,153,0.08)"  },
};

const inputBase: React.CSSProperties = {
  width: "100%",
  padding: "11px 14px",
  background: "#0a0d1a",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: 10,
  color: "#f0f2fa",
  fontFamily: "'Inter', sans-serif",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 150ms",
};

const labelBase: React.CSSProperties = {
  display: "block",
  fontFamily: "'Inter', sans-serif",
  fontWeight: 500,
  fontSize: 13,
  color: "#8492b8",
  marginBottom: 8,
};

const hintBase: React.CSSProperties = {
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: 10,
  color: "#4a5578",
  letterSpacing: "0.04em",
  fontWeight: 400,
};

interface SectionEditorProps {
  section: PixelSection;
  accessToken: string;
  onSaved: (updated: PixelSection) => void;
  onDiscard?: () => void;
}

export function SectionEditor({ section, accessToken, onSaved, onDiscard }: SectionEditorProps) {
  const [form, setForm] = useState<SectionUpdatePayload>({
    full_name:     section.full_name  ?? "",
    job_title:     section.job_title  ?? "",
    bio:           section.bio        ?? "",
    portfolio_url: section.portfolio_url ?? "",
    job_category:  section.job_category  ?? undefined,
    skills:        section.skills ?? [],
    is_published:  section.is_published,
  });
  const [skillInput, setSkillInput]   = useState("");
  const [saving, setSaving]           = useState(false);
  const [uploading, setUploading]     = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [error, setError]             = useState<string | null>(null);
  const [previewUrl, setPreviewUrl]   = useState<string | null>(null);

  function set<K extends keyof SectionUpdatePayload>(key: K, value: SectionUpdatePayload[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function addSkill() {
    const tag = skillInput.trim().slice(0, 50);
    if (!tag || (form.skills ?? []).length >= 5) return;
    set("skills", [...(form.skills ?? []), tag]);
    setSkillInput("");
  }

  function removeSkill(i: number) {
    set("skills", (form.skills ?? []).filter((_, idx) => idx !== i));
  }

  const onDrop = useCallback(async (accepted: File[], rejected: any[]) => {
    setUploadError(null);
    if (rejected.length > 0) {
      setUploadError(rejected[0]?.errors?.[0]?.message ?? "Invalid file");
      return;
    }
    const file = accepted[0];
    if (!file) return;
    if (file.size > 500_000) { setUploadError("Image must be under 500 KB"); return; }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    try {
      setUploading(true);
      await uploadSectionImage(section.id, file, accessToken);
    } catch (err: any) {
      setUploadError(err?.message ?? "Upload failed");
      setPreviewUrl(null);
      URL.revokeObjectURL(url);
    } finally {
      setUploading(false);
    }
  }, [section.id, accessToken]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/jpeg": [], "image/png": [], "image/webp": [] },
    maxSize: 500_000,
    maxFiles: 1,
    disabled: uploading,
  });

  async function handleSave() {
    setError(null);
    setSaving(true);
    try {
      const updated = await updateSection(section.id, form, accessToken);
      onSaved(updated as PixelSection);
    } catch (err: any) {
      setError(err?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const bioLen   = form.bio?.length ?? 0;
  const bioMax   = 300;
  const bioPct   = Math.min((bioLen / bioMax) * 100, 100);
  const bioOver  = bioLen > 280;
  const bioColor = bioOver ? "#f87171" : "#6366f1";
  const skillsLeft = 5 - (form.skills ?? []).length;
  const displayImg = previewUrl ?? section.image_url;
  const activeCat  = form.job_category ? CAT_COLOR[form.job_category] : null;

  return (
    <div
      style={{
        background: "#0c0f1d",
        borderRadius: 16,
        overflow: "hidden",
        fontFamily: "'Inter', sans-serif",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      {/* ── Section header ──────────────────────────────────────────────── */}
      <div
        style={{
          padding: "20px 24px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#6366f1", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>
            Edit your section
          </div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 16, color: "#f0f2fa" }}>
            Build your profile
          </div>
        </div>
        {/* Publish toggle */}
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            cursor: "pointer",
            userSelect: "none",
          }}
        >
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: form.is_published ? "#34d399" : "#4a5578", letterSpacing: "0.06em" }}>
            {form.is_published ? "Published" : "Draft"}
          </span>
          <div
            onClick={() => set("is_published", !form.is_published)}
            style={{
              width: 40,
              height: 22,
              borderRadius: 11,
              background: form.is_published ? "rgba(52,211,153,0.25)" : "rgba(255,255,255,0.06)",
              border: `1px solid ${form.is_published ? "rgba(52,211,153,0.45)" : "rgba(255,255,255,0.10)"}`,
              position: "relative",
              cursor: "pointer",
              transition: "background 200ms, border-color 200ms",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 3,
                left: form.is_published ? 20 : 3,
                width: 14,
                height: 14,
                borderRadius: "50%",
                background: form.is_published ? "#34d399" : "rgba(255,255,255,0.25)",
                transition: "left 200ms, background 200ms",
              }}
            />
          </div>
        </label>
      </div>

      <div style={{ padding: "24px 24px 0" }}>

        {/* ── PROFILE PHOTO ─────────────────────────────────────────────── */}
        <div style={{ marginBottom: 24 }}>
          <label style={labelBase}>
            Profile photo
            <span style={{ ...hintBase, marginLeft: 8 }}>JPG, PNG, WebP · max 500 KB · square recommended</span>
          </label>

          <div
            {...getRootProps()}
            style={{
              position: "relative",
              borderRadius: 12,
              overflow: "hidden",
              cursor: uploading ? "not-allowed" : "pointer",
              background: isDragActive ? "rgba(99,102,241,0.06)" : "#0a0d1a",
              border: `1px ${displayImg ? "solid" : "dashed"} ${
                isDragActive ? "rgba(99,102,241,0.50)"
                : uploadError ? "rgba(239,68,68,0.40)"
                : displayImg ? "rgba(255,255,255,0.10)"
                : "rgba(255,255,255,0.10)"
              }`,
              transition: "border-color 150ms",
              minHeight: displayImg ? 220 : 140,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <input {...getInputProps()} />

            {displayImg ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={displayImg}
                  alt="Preview"
                  style={{ width: "100%", maxHeight: 280, objectFit: "cover", objectPosition: "top center", display: "block" }}
                />
                {/* Overlay hint */}
                {!uploading && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "rgba(7,8,15,0)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "background 150ms",
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "rgba(7,8,15,0.55)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "rgba(7,8,15,0)"; }}
                  >
                    <span
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: 13,
                        color: "#f0f2fa",
                        padding: "6px 16px",
                        background: "rgba(7,8,15,0.75)",
                        borderRadius: 8,
                        border: "1px solid rgba(255,255,255,0.14)",
                        opacity: 0,
                        pointerEvents: "none",
                      }}
                    >
                      Change photo
                    </span>
                  </div>
                )}
              </>
            ) : (
              <>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    background: isDragActive ? "rgba(99,102,241,0.12)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${isDragActive ? "rgba(99,102,241,0.40)" : "rgba(255,255,255,0.09)"}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={isDragActive ? "#818cf8" : "#4a5578"} strokeWidth="1.5">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </div>
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: isDragActive ? "#818cf8" : "#4a5578", textAlign: "center" }}>
                  {isDragActive ? "Drop to upload" : "Drag & drop or click to upload"}
                </span>
              </>
            )}

            {uploading && (
              <div style={{ position: "absolute", inset: 0, background: "rgba(7,8,15,0.75)", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                <div style={{ width: 20, height: 20, border: "2px solid rgba(255,255,255,0.15)", borderTopColor: "#6366f1", borderRadius: "50%", animation: "spin 600ms linear infinite" }} />
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#8492b8" }}>Uploading...</span>
              </div>
            )}
          </div>

          {uploadError && (
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#f87171", margin: "6px 0 0" }}>
              {uploadError}
            </p>
          )}
        </div>

        {/* ── NAME + CAREER FIELD ───────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
          <div>
            <label style={labelBase}>Full name</label>
            <input
              style={inputBase}
              value={form.full_name ?? ""}
              maxLength={100}
              onChange={(e) => set("full_name", e.target.value)}
              placeholder="Jamie Sato"
              onFocus={(e) => { e.target.style.borderColor = "rgba(99,102,241,0.55)"; }}
              onBlur={(e)  => { e.target.style.borderColor = "rgba(255,255,255,0.09)"; }}
            />
          </div>
          <div>
            <label style={labelBase}>
              Career / Field of study
            </label>
            <input
              style={inputBase}
              value={form.job_title ?? ""}
              maxLength={100}
              onChange={(e) => set("job_title", e.target.value)}
              placeholder="Senior Software Engineer"
              onFocus={(e) => { e.target.style.borderColor = "rgba(99,102,241,0.55)"; }}
              onBlur={(e)  => { e.target.style.borderColor = "rgba(255,255,255,0.09)"; }}
            />
          </div>
        </div>

        {/* ── MARKETING DESCRIPTION ─────────────────────────────────────── */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
            <label style={{ ...labelBase, margin: 0 }}>
              Your pitch
            </label>
            <span style={hintBase}>Tell recruiters what makes you unique</span>
          </div>
          <textarea
            style={{
              ...inputBase,
              minHeight: 110,
              resize: "vertical",
              lineHeight: 1.7,
            }}
            value={form.bio ?? ""}
            maxLength={bioMax}
            onChange={(e) => set("bio", e.target.value)}
            placeholder="Full-stack engineer with 6 years at fintech startups. I specialize in distributed systems and have led three platform migrations from legacy stacks to modern cloud-native architecture..."
            onFocus={(e) => { e.target.style.borderColor = "rgba(99,102,241,0.55)"; }}
            onBlur={(e)  => { e.target.style.borderColor = "rgba(255,255,255,0.09)"; }}
          />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
            <div style={{ height: 3, flex: 1, background: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden", marginRight: 12 }}>
              <div
                style={{
                  height: "100%",
                  width: `${bioPct}%`,
                  background: bioOver
                    ? "linear-gradient(90deg, #6366f1, #f87171)"
                    : "linear-gradient(90deg, #6366f1, #818cf8)",
                  borderRadius: 2,
                  transition: "width 120ms",
                }}
              />
            </div>
            <span style={{ ...hintBase, color: bioOver ? "#f87171" : "#4a5578", whiteSpace: "nowrap" }}>
              {bioLen} / {bioMax}
            </span>
          </div>
        </div>

        {/* ── SKILLS ────────────────────────────────────────────────────── */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
            <label style={{ ...labelBase, margin: 0 }}>Skills</label>
            <span style={hintBase}>max 5 · press Enter to add</span>
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: (form.skills ?? []).length > 0 ? 10 : 0 }}>
            <input
              style={{ ...inputBase, flex: 1 }}
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
              placeholder="e.g. TypeScript, Figma, SQL..."
              disabled={(form.skills ?? []).length >= 5}
              onFocus={(e) => { e.target.style.borderColor = "rgba(99,102,241,0.55)"; }}
              onBlur={(e)  => { e.target.style.borderColor = "rgba(255,255,255,0.09)"; }}
            />
            <button
              onClick={addSkill}
              disabled={(form.skills ?? []).length >= 5}
              style={{
                padding: "11px 18px",
                background: (form.skills ?? []).length >= 5 ? "transparent" : "rgba(99,102,241,0.12)",
                border: "1px solid rgba(99,102,241,0.30)",
                borderRadius: 10,
                color: (form.skills ?? []).length >= 5 ? "#4a5578" : "#818cf8",
                fontFamily: "'Inter', sans-serif",
                fontWeight: 600,
                fontSize: 13,
                cursor: (form.skills ?? []).length >= 5 ? "not-allowed" : "pointer",
                flexShrink: 0,
                transition: "background 150ms",
              }}
            >
              Add
            </button>
          </div>
          {(form.skills ?? []).length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7, alignItems: "center" }}>
              {(form.skills ?? []).map((s, i) => (
                <span
                  key={i}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "5px 10px 5px 12px",
                    background: "rgba(99,102,241,0.08)",
                    border: "1px solid rgba(99,102,241,0.28)",
                    borderRadius: 6,
                    color: "#818cf8",
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 12,
                  }}
                >
                  {s}
                  <button
                    onClick={() => removeSkill(i)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#4a5578",
                      cursor: "pointer",
                      padding: 0,
                      lineHeight: 1,
                      fontSize: 15,
                      display: "flex",
                      alignItems: "center",
                      transition: "color 120ms",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = "#f87171"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "#4a5578"; }}
                  >
                    ×
                  </button>
                </span>
              ))}
              {skillsLeft > 0 && (
                <span style={hintBase}>{skillsLeft} slot{skillsLeft !== 1 ? "s" : ""} remaining</span>
              )}
            </div>
          )}
        </div>

        {/* ── CATEGORY ──────────────────────────────────────────────────── */}
        <div style={{ marginBottom: 20 }}>
          <label style={labelBase}>Category</label>
          <div style={{ display: "flex", gap: 8 }}>
            {CATEGORIES.map((cat) => {
              const active = form.job_category === cat;
              const cfg    = CAT_COLOR[cat];
              return (
                <button
                  key={cat}
                  onClick={() => set("job_category", cat)}
                  style={{
                    flex: 1,
                    padding: "10px 8px",
                    background: active ? cfg.bg : "transparent",
                    border: `1px solid ${active ? cfg.border : "rgba(255,255,255,0.09)"}`,
                    borderRadius: 10,
                    color: active ? cfg.color : "#4a5578",
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: active ? 600 : 400,
                    fontSize: 13,
                    cursor: "pointer",
                    transition: "all 150ms",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {active && (
                    <div
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        height: 2,
                        background: cfg.color,
                        borderRadius: "2px 2px 0 0",
                      }}
                    />
                  )}
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── PORTFOLIO URL ─────────────────────────────────────────────── */}
        <div style={{ marginBottom: 24 }}>
          <label style={labelBase}>Portfolio / LinkedIn URL</label>
          <input
            style={inputBase}
            value={form.portfolio_url ?? ""}
            type="url"
            onChange={(e) => set("portfolio_url", e.target.value)}
            placeholder="https://yourname.dev"
            onFocus={(e) => { e.target.style.borderColor = "rgba(99,102,241,0.55)"; }}
            onBlur={(e)  => { e.target.style.borderColor = "rgba(255,255,255,0.09)"; }}
          />
        </div>
      </div>

      {/* ── Error ─────────────────────────────────────────────────────────── */}
      {error && (
        <div
          style={{
            margin: "0 24px 16px",
            padding: "12px 14px",
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.22)",
            borderRadius: 8,
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 12,
            color: "#f87171",
          }}
        >
          {error}
        </div>
      )}

      {/* ── Footer actions ─────────────────────────────────────────────────── */}
      <div
        style={{
          padding: "16px 24px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {/* Constraints hint */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {["500 KB photo", "300 char pitch", "5 skills"].map((t) => (
            <span
              key={t}
              style={{
                padding: "3px 8px",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 4,
                ...hintBase,
              }}
            >
              {t}
            </span>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          {onDiscard && (
            <button
              onClick={onDiscard}
              style={{
                padding: "10px 20px",
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.09)",
                borderRadius: 10,
                color: "#8492b8",
                fontFamily: "'Inter', sans-serif",
                fontWeight: 500,
                fontSize: 14,
                cursor: "pointer",
                transition: "border-color 150ms, color 150ms",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.20)";
                e.currentTarget.style.color = "#f0f2fa";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)";
                e.currentTarget.style.color = "#8492b8";
              }}
            >
              Discard
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: "10px 24px",
              background: saving ? "rgba(99,102,241,0.35)" : "#6366f1",
              border: "1px solid transparent",
              borderRadius: 10,
              color: "#fff",
              fontFamily: "'Inter', sans-serif",
              fontWeight: 600,
              fontSize: 14,
              cursor: saving ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              transition: "background 150ms",
            }}
            onMouseEnter={(e) => { if (!saving) e.currentTarget.style.background = "#5254cc"; }}
            onMouseLeave={(e) => { if (!saving) e.currentTarget.style.background = "#6366f1"; }}
          >
            {saving ? (
              <>
                <div style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 600ms linear infinite" }} />
                Saving...
              </>
            ) : "Save section"}
          </button>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
