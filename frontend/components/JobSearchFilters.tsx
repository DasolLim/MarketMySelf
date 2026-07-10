"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  JOB_CATEGORIES,
  ScrapedJobFacets,
  ScrapedJobFilters,
  WORK_TYPE_LABELS,
  EXPERIENCE_LABELS,
  EMPLOYMENT_LABELS,
  EXP_LEVEL_LABELS,
  EMPLOYMENT_TYPE_LABELS,
} from "@/types";

interface Props {
  filters: ScrapedJobFilters;
  facets: ScrapedJobFacets | null;
  onChange: (filters: ScrapedJobFilters) => void;
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: 10,
  fontWeight: 500,
  color: "#4a5578",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  background: "#111627",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 8,
  fontFamily: "'Inter', sans-serif",
  fontSize: 13,
  color: "#f0f2fa",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 150ms",
};

const sectionStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

function count(facets: ScrapedJobFacets | null, group: "work_types" | "experience_levels" | "employment_types", key: string): number | null {
  if (!facets) return null;
  const bucket = facets[group] as Record<string, number>;
  return bucket[key] ?? 0;
}

function countLabel(n: number | null): string {
  if (n === null) return "";
  return ` (${n})`;
}

function SelectToggle({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(active ? "" : opt.value)}
            style={{
              padding: "5px 11px",
              background: active ? "#6366f1" : "rgba(255,255,255,0.04)",
              border: `1px solid ${active ? "#6366f1" : "rgba(255,255,255,0.09)"}`,
              borderRadius: 100,
              fontFamily: "'Inter', sans-serif",
              fontSize: 12,
              color: active ? "#fff" : "#8492b8",
              fontWeight: active ? 600 : 400,
              cursor: "pointer",
              transition: "background 150ms, border-color 150ms, color 150ms",
              whiteSpace: "nowrap",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export default function JobSearchFilters({ filters, facets, onChange }: Props) {
  const [keywords, setKeywords] = useState(filters.keywords ?? "");
  const [location, setLocation] = useState(filters.location_city ?? "");
  const [company, setCompany] = useState(filters.company ?? "");

  const keywordsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const locationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (keywordsTimer.current) clearTimeout(keywordsTimer.current);
    keywordsTimer.current = setTimeout(() => {
      onChange({ ...filters, keywords: keywords || undefined, page: 1 });
    }, 300);
    return () => { if (keywordsTimer.current) clearTimeout(keywordsTimer.current); };
  }, [keywords]);

  useEffect(() => {
    if (locationTimer.current) clearTimeout(locationTimer.current);
    locationTimer.current = setTimeout(() => {
      onChange({ ...filters, location_city: location || undefined, page: 1 });
    }, 300);
    return () => { if (locationTimer.current) clearTimeout(locationTimer.current); };
  }, [location]);

  function set(patch: Partial<ScrapedJobFilters>) {
    onChange({ ...filters, ...patch, page: 1 });
  }

  function handleCompanyBlur() {
    set({ company: company || undefined });
  }

  function handleReset() {
    setKeywords("");
    setLocation("");
    setCompany("");
    onChange({});
  }

  const workTypeOptions = [
    { value: "remote",  label: `Remote${countLabel(count(facets, "work_types", "remote"))}` },
    { value: "hybrid",  label: `Hybrid${countLabel(count(facets, "work_types", "hybrid"))}` },
    { value: "on_site", label: `On-site${countLabel(count(facets, "work_types", "on_site"))}` },
  ];

  const postedOptions = [
    { value: "24",  label: "Last 24h" },
    { value: "168", label: "Last 7 days" },
    { value: "720", label: "Last 30 days" },
  ];

  const employmentOptions = [
    { value: "full_time",  label: EMPLOYMENT_LABELS.full_time },
    { value: "part_time",  label: EMPLOYMENT_LABELS.part_time },
    { value: "contract",   label: EMPLOYMENT_LABELS.contract },
    { value: "internship", label: EMPLOYMENT_LABELS.internship },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* 1. Keywords */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Keywords</label>
        <input
          style={inputStyle}
          type="text"
          placeholder="Job title, skills, or keyword"
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(99,102,241,0.5)"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)"; }}
        />
      </div>

      {/* 2. Location */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Location</label>
        <input
          style={inputStyle}
          type="text"
          placeholder="City (e.g. Toronto)"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(99,102,241,0.5)"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)"; }}
        />
      </div>

      {/* 3. Work type */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Work type</label>
        <SelectToggle
          value={filters.work_type ?? ""}
          options={workTypeOptions}
          onChange={(v) => set({ work_type: v || undefined })}
        />
      </div>

      {/* 4. Experience level */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Experience</label>
        <select
          style={{ ...inputStyle, cursor: "pointer", appearance: "none" as const }}
          value={filters.experience_level ?? ""}
          onChange={(e) => set({ experience_level: e.target.value || undefined })}
          onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(99,102,241,0.5)"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)"; }}
        >
          <option value="">All levels</option>
          {Object.entries(EXPERIENCE_LABELS).map(([k, label]) => {
            const n = count(facets, "experience_levels", k);
            return (
              <option key={k} value={k}>
                {label}{n !== null ? ` (${n})` : ""}
              </option>
            );
          })}
        </select>
      </div>

      {/* 5. Category */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Category</label>
        <select
          style={{ ...inputStyle, cursor: "pointer", appearance: "none" as const }}
          value={filters.category ?? ""}
          onChange={(e) => set({ category: e.target.value || undefined })}
          onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(99,102,241,0.5)"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)"; }}
        >
          <option value="">All categories</option>
          {JOB_CATEGORIES.map((cat) => {
            const n: number | null = null;
            const label = cat.charAt(0).toUpperCase() + cat.slice(1);
            return (
              <option key={cat} value={cat}>
                {label}{n !== null ? ` (${n})` : ""}
              </option>
            );
          })}
        </select>
      </div>

      {/* 6. Employment type */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Employment type</label>
        <SelectToggle
          value={filters.employment_type ?? ""}
          options={employmentOptions}
          onChange={(v) => set({ employment_type: v || undefined })}
        />
      </div>

      {/* 7. Company */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Company</label>
        <input
          style={inputStyle}
          type="text"
          placeholder="Company name"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(99,102,241,0.5)"; }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)";
            handleCompanyBlur();
          }}
        />
      </div>

      {/* 8. Minimum salary */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Min salary (USD / yr)</label>
        <input
          style={inputStyle}
          type="number"
          placeholder="e.g. 80000"
          step={10000}
          value={filters.salary_min ?? ""}
          onChange={(e) => set({ salary_min: e.target.value ? Number(e.target.value) : undefined })}
          onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(99,102,241,0.5)"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)"; }}
        />
      </div>

      {/* 9. Posted within */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Posted within</label>
        <SelectToggle
          value={String(filters.posted_within_hours ?? 24)}
          options={postedOptions}
          onChange={(v) => set({ posted_within_hours: v ? Number(v) : 24 })}
        />
      </div>

      {/* 10. Reset */}
      <button
        type="button"
        onClick={handleReset}
        style={{
          padding: "9px 0",
          background: "transparent",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 10,
          color: "#8492b8",
          fontFamily: "'Inter', sans-serif",
          fontWeight: 500,
          fontSize: 13,
          cursor: "pointer",
          transition: "border-color 150ms, color 150ms",
          width: "100%",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)";
          e.currentTarget.style.color = "#f0f2fa";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
          e.currentTarget.style.color = "#8492b8";
        }}
      >
        Reset filters
      </button>
    </div>
  );
}
