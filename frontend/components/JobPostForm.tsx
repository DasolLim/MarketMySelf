"use client";

import React, { useState } from "react";
import { JobPost, JobCategory, ExperienceLevel, JobPostPayload } from "@/types";

const CATEGORIES: JobCategory[] = ["Technical", "Marketing", "Finance"];
const EXPERIENCE_LEVELS: ExperienceLevel[] = ["junior", "mid", "senior"];
const LEVEL_LABELS: Record<ExperienceLevel, string> = { junior: "Junior", mid: "Mid-level", senior: "Senior" };

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

interface Props {
  initial?: Partial<JobPost>;
  onSubmit: (payload: JobPostPayload) => Promise<void>;
  submitLabel?: string;
}

export default function JobPostForm({ initial, onSubmit, submitLabel = "Post job" }: Props) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [category, setCategory] = useState<JobCategory>(initial?.job_category ?? "Technical");
  const [level, setLevel] = useState<ExperienceLevel | "">(initial?.experience_level ?? "");
  const [techSkills, setTechSkills] = useState((initial?.required_tech_skills ?? []).join(", "));
  const [softSkills, setSoftSkills] = useState((initial?.required_soft_skills ?? []).join(", "));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parseCsv = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim() || !description.trim()) {
      setError("Title and description are required");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        job_category: category,
        experience_level: (level as ExperienceLevel) || undefined,
        required_tech_skills: parseCsv(techSkills),
        required_soft_skills: parseCsv(softSkills),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  const focusOn = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    e.target.style.borderColor = "#0A66C2";
    e.target.style.boxShadow = "0 0 0 3px rgba(10,102,194,0.10)";
  };
  const focusOff = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    e.target.style.borderColor = "rgba(0,0,0,0.18)";
    e.target.style.boxShadow = "none";
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <label style={{ display: "block", fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600, color: "#191919", marginBottom: 6 }}>Job title</label>
        <input style={inputStyle} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Senior Software Engineer" required onFocus={focusOn} onBlur={focusOff} />
      </div>

      <div>
        <label style={{ display: "block", fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600, color: "#191919", marginBottom: 6 }}>Description</label>
        <textarea
          style={{ ...inputStyle, minHeight: 120, resize: "vertical", lineHeight: 1.65 }}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the role, responsibilities, and what you're looking for..."
          required
          onFocus={focusOn as React.FocusEventHandler<HTMLTextAreaElement>}
          onBlur={focusOff as React.FocusEventHandler<HTMLTextAreaElement>}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div>
          <label style={{ display: "block", fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600, color: "#191919", marginBottom: 6 }}>Category</label>
          <select style={{ ...inputStyle, appearance: "none", cursor: "pointer" }} value={category} onChange={(e) => setCategory(e.target.value as JobCategory)} onFocus={focusOn} onBlur={focusOff}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: "block", fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600, color: "#191919", marginBottom: 6 }}>Experience level</label>
          <select style={{ ...inputStyle, appearance: "none", cursor: "pointer" }} value={level} onChange={(e) => setLevel(e.target.value as ExperienceLevel | "")} onFocus={focusOn} onBlur={focusOff}>
            <option value="">Any level</option>
            {EXPERIENCE_LEVELS.map((l) => <option key={l} value={l}>{LEVEL_LABELS[l]}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label style={{ display: "block", fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600, color: "#191919", marginBottom: 4 }}>Required tech skills</label>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#9CA3AF", marginBottom: 6 }}>Comma-separated: Python, React, SQL</div>
        <input style={inputStyle} value={techSkills} onChange={(e) => setTechSkills(e.target.value)} placeholder="Python, React, SQL..." onFocus={focusOn} onBlur={focusOff} />
      </div>

      <div>
        <label style={{ display: "block", fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600, color: "#191919", marginBottom: 4 }}>Required soft skills</label>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#9CA3AF", marginBottom: 6 }}>Comma-separated: Leadership, Communication</div>
        <input style={inputStyle} value={softSkills} onChange={(e) => setSoftSkills(e.target.value)} placeholder="Leadership, Communication..." onFocus={focusOn} onBlur={focusOff} />
      </div>

      {error && (
        <div style={{ padding: "10px 14px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.22)", borderRadius: 8, fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#DC2626" }}>
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        style={{
          padding: "12px",
          background: submitting ? "rgba(10,102,194,0.5)" : "#0A66C2",
          border: "none",
          borderRadius: 24,
          color: "#fff",
          fontFamily: "'Inter', sans-serif",
          fontWeight: 700,
          fontSize: 15,
          cursor: submitting ? "not-allowed" : "pointer",
          transition: "background 150ms",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
        onMouseEnter={(e) => { if (!submitting) e.currentTarget.style.background = "#004182"; }}
        onMouseLeave={(e) => { if (!submitting) e.currentTarget.style.background = "#0A66C2"; }}
      >
        {submitting ? (
          <>
            <div style={{ width: 15, height: 15, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 600ms linear infinite" }} />
            Submitting...
          </>
        ) : submitLabel}
      </button>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </form>
  );
}
