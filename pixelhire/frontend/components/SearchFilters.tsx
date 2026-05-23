"use client";

import React, { useState } from "react";
import { JobCategory, ExperienceLevel, SearchFilters as SearchFiltersType } from "@/types";

interface Props {
  onSearch: (filters: SearchFiltersType) => void;
  loading?: boolean;
}

const selectStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  background: "#FFFFFF",
  border: "1px solid rgba(0,0,0,0.18)",
  borderRadius: 7,
  fontFamily: "'Inter', sans-serif",
  fontSize: 14,
  color: "#191919",
  outline: "none",
  cursor: "pointer",
  appearance: "none",
};

const inputStyle: React.CSSProperties = {
  ...selectStyle,
  cursor: "text",
};

const CATEGORIES: JobCategory[] = ["Technical", "Marketing", "Finance"];
const EXPERIENCE_LEVELS: ExperienceLevel[] = ["junior", "mid", "senior"];
const LEVEL_LABELS: Record<ExperienceLevel, string> = { junior: "Junior", mid: "Mid-level", senior: "Senior" };

export default function SearchFilters({ onSearch, loading = false }: Props) {
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState<JobCategory | "">("");
  const [level, setLevel] = useState<ExperienceLevel | "">("");
  const [techSkills, setTechSkills] = useState("");
  const [softSkills, setSoftSkills] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSearch({
      keyword: keyword || undefined,
      job_category: (category as JobCategory) || undefined,
      experience_level: (level as ExperienceLevel) || undefined,
      tech_skills: techSkills || undefined,
      soft_skills: softSkills || undefined,
      page: 1,
      limit: 20,
    });
  }

  function handleReset() {
    setKeyword(""); setCategory(""); setLevel(""); setTechSkills(""); setSoftSkills("");
    onSearch({ page: 1, limit: 20 });
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12, marginBottom: 14 }}>
        <div>
          <label style={{ display: "block", fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>Keyword</label>
          <input style={inputStyle} placeholder="Name, title, bio..." value={keyword} onChange={(e) => setKeyword(e.target.value)} />
        </div>
        <div>
          <label style={{ display: "block", fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>Category</label>
          <select style={selectStyle} value={category} onChange={(e) => setCategory(e.target.value as JobCategory | "")}>
            <option value="">All categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: "block", fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>Experience</label>
          <select style={selectStyle} value={level} onChange={(e) => setLevel(e.target.value as ExperienceLevel | "")}>
            <option value="">All levels</option>
            {EXPERIENCE_LEVELS.map((l) => <option key={l} value={l}>{LEVEL_LABELS[l]}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: "block", fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>Tech skills</label>
          <input style={inputStyle} placeholder="Python, React, SQL..." value={techSkills} onChange={(e) => setTechSkills(e.target.value)} />
        </div>
        <div>
          <label style={{ display: "block", fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>Soft skills</label>
          <input style={inputStyle} placeholder="Leadership, Comms..." value={softSkills} onChange={(e) => setSoftSkills(e.target.value)} />
        </div>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "9px 22px",
            background: loading ? "rgba(10,102,194,0.5)" : "#0A66C2",
            border: "none",
            borderRadius: 20,
            color: "#fff",
            fontFamily: "'Inter', sans-serif",
            fontWeight: 600,
            fontSize: 14,
            cursor: loading ? "not-allowed" : "pointer",
            transition: "background 150ms",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          {loading ? (
            <>
              <div style={{ width: 13, height: 13, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 600ms linear infinite" }} />
              Searching...
            </>
          ) : "Search talent"}
        </button>
        <button
          type="button"
          onClick={handleReset}
          style={{ padding: "9px 18px", background: "transparent", border: "1px solid rgba(0,0,0,0.18)", borderRadius: 20, color: "#555555", fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: 14, cursor: "pointer", transition: "border-color 150ms, color 150ms" }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(0,0,0,0.35)"; e.currentTarget.style.color = "#191919"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(0,0,0,0.18)"; e.currentTarget.style.color = "#555555"; }}
        >
          Reset
        </button>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </form>
  );
}
