"use client";

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { searchScrapedJobs } from "@/lib/api";
import {
  ScrapedJob,
  ScrapedJobFacets,
  ScrapedJobSearchState,
  WORK_TYPE_LABELS,
  EXP_LEVEL_LABELS,
  EMPLOYMENT_TYPE_LABELS,
} from "@/types";
import ScrapedJobCard from "@/components/ScrapedJobCard";

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  engineering: "Engineering",
  data: "Data & Analytics",
  finance: "Finance",
  design: "Design",
  marketing: "Marketing",
  sales: "Sales",
  operations: "Operations",
  product: "Product",
  other: "Other",
};

const DEFAULT_STATE: ScrapedJobSearchState = {
  query: "",
  category: "",
  work_types: [],
  experience_levels: [],
  employment_types: [],
  skills: [],
  salary_min: undefined,
  salary_max: undefined,
  location_city: "",
  posted_within_days: undefined,
  page: 0,
};

// ── Auto-detect filters from query text ──────────────────────────────────────

function detectFromQuery(q: string) {
  const s = q.toLowerCase();
  const work_types: string[] = [];
  const experience_levels: string[] = [];
  const employment_types: string[] = [];

  if (/\bremote\b/.test(s) || /\bwfh\b/.test(s) || /work.from.home/.test(s)) work_types.push("remote");
  if (/\bhybrid\b/.test(s)) work_types.push("hybrid");
  if (/\bon.?site\b/.test(s) || /\bin.?office\b/.test(s)) work_types.push("onsite");

  if (/\bsenior\b/.test(s) || /\bsr\b/.test(s)) experience_levels.push("senior");
  if (/\bjunior\b/.test(s) || /\bentry.level\b/.test(s) || /\bjr\b/.test(s)) experience_levels.push("entry_level");
  if (/\bmid.level\b/.test(s)) experience_levels.push("mid_level");
  if (/\bmanager\b/.test(s)) experience_levels.push("manager");
  if (/\bdirector\b/.test(s)) experience_levels.push("director");
  if (/\bexecutive\b/.test(s) || /\b(ceo|cto|cfo|vp)\b/.test(s)) experience_levels.push("executive");
  if (/\bintern\b/.test(s)) experience_levels.push("internship");

  if (/\bfull.time\b/.test(s)) employment_types.push("full_time");
  if (/\bpart.time\b/.test(s)) employment_types.push("part_time");
  if (/\bcontract\b/.test(s)) employment_types.push("contract");
  if (/\bfreelance\b/.test(s)) employment_types.push("freelance");
  if (/\binternship\b/.test(s)) employment_types.push("internship");

  return { work_types, experience_levels, employment_types };
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div style={{
      background: "#FFFFFF",
      border: "1px solid rgba(0,0,0,0.08)",
      borderRadius: 12,
      padding: "22px 24px",
      position: "relative",
      overflow: "hidden",
      boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "rgba(10,102,194,0.15)" }} />
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
        <div style={{ height: 17, width: "58%", background: "rgba(0,0,0,0.06)", borderRadius: 6 }} />
        <div style={{ height: 17, width: 72, background: "rgba(0,0,0,0.04)", borderRadius: 100 }} />
      </div>
      <div style={{ height: 13, width: "36%", background: "rgba(0,0,0,0.04)", borderRadius: 6, marginBottom: 12 }} />
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        <div style={{ height: 22, width: 66, background: "rgba(0,0,0,0.04)", borderRadius: 100 }} />
        <div style={{ height: 22, width: 82, background: "rgba(0,0,0,0.04)", borderRadius: 100 }} />
      </div>
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" as const }}>
        {[58, 76, 52, 68, 44].map((w, i) => (
          <div key={i} style={{ height: 20, width: w, background: "rgba(0,0,0,0.04)", borderRadius: 100 }} />
        ))}
      </div>
    </div>
  );
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const filterLabelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: "'Inter', sans-serif",
  fontSize: 11,
  fontWeight: 700,
  color: "#9CA3AF",
  letterSpacing: "0.10em",
  textTransform: "uppercase",
  marginBottom: 6,
};

const baseInputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  background: "#FFFFFF",
  border: "1px solid rgba(0,0,0,0.18)",
  borderRadius: 8,
  fontFamily: "'Inter', sans-serif",
  fontSize: 13,
  color: "#191919",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 150ms",
};

// ── FilterDropdown ────────────────────────────────────────────────────────────

function FilterDropdown({
  label,
  options,
  selected,
  autoDetected,
  facets,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  autoDetected: string[];
  facets?: Record<string, number> | null;
  onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);

  const effectiveSelected = useMemo(
    () => Array.from(new Set([...selected, ...autoDetected])),
    [selected, autoDetected]
  );

  const summaryText = useMemo(() => {
    if (effectiveSelected.length === 0) return "Any";
    return effectiveSelected
      .map((v) => options.find((o) => o.value === v)?.label ?? v)
      .join(", ");
  }, [effectiveSelected, options]);

  function toggle(v: string) {
    const isManual = selected.includes(v);
    onChange(isManual ? selected.filter((x) => x !== v) : [...selected, v]);
  }

  return (
    <div>
      <label style={filterLabelStyle}>{label}</label>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          padding: "9px 12px",
          background: effectiveSelected.length > 0 ? "rgba(10,102,194,0.04)" : "#FFFFFF",
          border: `1px solid ${effectiveSelected.length > 0 ? "rgba(10,102,194,0.28)" : "rgba(0,0,0,0.18)"}`,
          borderRadius: open ? "8px 8px 0 0" : 8,
          cursor: "pointer",
          boxSizing: "border-box",
          transition: "border-color 150ms, background 150ms",
        }}
      >
        <span style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 13,
          color: effectiveSelected.length > 0 ? "#0A66C2" : "#9CA3AF",
          fontWeight: effectiveSelected.length > 0 ? 600 : 400,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          flex: 1,
          textAlign: "left",
        }}>
          {summaryText}
        </span>
        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="none"
          stroke={effectiveSelected.length > 0 ? "#0A66C2" : "#9CA3AF"}
          strokeWidth="2.5"
          style={{ flexShrink: 0, marginLeft: 8, transition: "transform 150ms", transform: open ? "rotate(180deg)" : "none" }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div style={{
          border: "1px solid rgba(10,102,194,0.28)",
          borderTop: "none",
          borderRadius: "0 0 8px 8px",
          overflow: "hidden",
          background: "#FFFFFF",
        }}>
          {options.map((opt, i) => {
            const isManual = selected.includes(opt.value);
            const isAuto = autoDetected.includes(opt.value) && !isManual;
            const active = isManual || isAuto;
            const count = facets?.[opt.value];
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggle(opt.value)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  width: "100%",
                  padding: "9px 12px",
                  background: isAuto ? "rgba(245,158,11,0.05)" : isManual ? "rgba(10,102,194,0.05)" : "transparent",
                  border: "none",
                  borderTop: i > 0 ? "1px solid rgba(0,0,0,0.05)" : "none",
                  cursor: "pointer",
                  boxSizing: "border-box",
                  transition: "background 120ms",
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "rgba(0,0,0,0.02)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = isAuto ? "rgba(245,158,11,0.05)" : isManual ? "rgba(10,102,194,0.05)" : "transparent"; }}
              >
                <div style={{
                  width: 15, height: 15, borderRadius: 3, flexShrink: 0,
                  border: `1.5px solid ${isManual ? "#0A66C2" : isAuto ? "#f59e0b" : "rgba(0,0,0,0.22)"}`,
                  background: isManual ? "#0A66C2" : isAuto ? "#f59e0b" : "#FFFFFF",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "background 120ms, border-color 120ms",
                }}>
                  {active && (
                    <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                      <polyline points="1.5,5 4,7.5 8.5,2.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <span style={{
                  fontFamily: "'Inter', sans-serif", fontSize: 13,
                  color: isManual ? "#0A66C2" : isAuto ? "#92400e" : "#555555",
                  fontWeight: active ? 600 : 400, flex: 1, textAlign: "left",
                }}>
                  {opt.label}
                </span>
                {isAuto && (
                  <span style={{
                    fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 600,
                    color: "#92400e", background: "rgba(245,158,11,0.12)",
                    padding: "1px 5px", borderRadius: 4, letterSpacing: "0.03em",
                  }}>auto</span>
                )}
                {count != null && (
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#9CA3AF", flexShrink: 0 }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── SkillSearch ───────────────────────────────────────────────────────────────

function SkillSearch({
  selected,
  allSkills,
  onChange,
}: {
  selected: string[];
  allSkills: string[];
  onChange: (v: string[]) => void;
}) {
  const [input, setInput] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = useMemo(() => {
    if (!input.trim()) return [];
    const q = input.toLowerCase();
    return allSkills.filter((s) => s.toLowerCase().includes(q) && !selected.includes(s)).slice(0, 8);
  }, [input, allSkills, selected]);

  function addSkill(skill: string) {
    onChange([...selected, skill]);
    setInput("");
    inputRef.current?.focus();
  }

  return (
    <div>
      <label style={filterLabelStyle}>Skills</label>
      {selected.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
          {selected.map((skill) => (
            <span key={skill} style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "3px 8px 3px 10px",
              background: "rgba(10,102,194,0.08)", border: "1px solid rgba(10,102,194,0.22)",
              borderRadius: 100, fontFamily: "'Inter', sans-serif", fontSize: 11,
              color: "#0A66C2", fontWeight: 600,
            }}>
              {skill}
              <button
                type="button"
                onClick={() => onChange(selected.filter((s) => s !== skill))}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: 14, height: 14, background: "rgba(10,102,194,0.15)", border: "none",
                  borderRadius: "50%", cursor: "pointer", color: "#0A66C2", fontSize: 11,
                  padding: 0, lineHeight: 1, fontWeight: 700,
                }}
              >×</button>
            </span>
          ))}
        </div>
      )}
      <div style={{ position: "relative" }}>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder={selected.length > 0 ? "Add more skills…" : "Type to search skills…"}
          style={{
            ...baseInputStyle,
            borderColor: focused ? "#0A66C2" : "rgba(0,0,0,0.18)",
            borderRadius: focused && suggestions.length > 0 ? "8px 8px 0 0" : 8,
          }}
        />
        {focused && suggestions.length > 0 && (
          <div style={{
            position: "absolute", top: "100%", left: 0, right: 0,
            background: "#FFFFFF", border: "1px solid #0A66C2", borderTop: "none",
            borderRadius: "0 0 8px 8px", overflow: "hidden", zIndex: 100,
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          }}>
            {suggestions.map((skill, i) => (
              <button
                key={skill}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); addSkill(skill); }}
                style={{
                  display: "flex", alignItems: "center", width: "100%",
                  padding: "9px 12px", background: "transparent", border: "none",
                  borderTop: i > 0 ? "1px solid rgba(0,0,0,0.05)" : "none",
                  fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#191919",
                  cursor: "pointer", textAlign: "left", transition: "background 100ms",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(10,102,194,0.05)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                {skill}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── CategoryTabsRow ───────────────────────────────────────────────────────────

function CategoryTabsRow({
  allTabs,
  activeCategory,
  onSelect,
}: {
  allTabs: { cat: string; label: string; count: number }[];
  activeCategory: string;
  onSelect: (cat: string) => void;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);
  const [overflowIdx, setOverflowIdx] = useState<number | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);

  useLayoutEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const measure = () => {
      const cRight = row.getBoundingClientRect().right;
      const children = Array.from(row.children) as HTMLElement[];
      let idx: number | null = null;
      for (let i = 0; i < children.length; i++) {
        const r = children[i].getBoundingClientRect();
        if (r.right > cRight + 1) { idx = i; break; }
      }
      setOverflowIdx(idx);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(row);
    return () => ro.disconnect();
  }, [allTabs.length]);

  useEffect(() => {
    if (!moreOpen) return;
    const handler = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [moreOpen]);

  const hasOverflow = overflowIdx !== null;
  const overflowTabs = hasOverflow ? allTabs.slice(overflowIdx!) : [];
  const overflowHasActive = overflowTabs.some((t) => t.cat === activeCategory);

  function tabBtn(tab: { cat: string; label: string; count: number }): React.ReactNode {
    const active = tab.cat === activeCategory;
    return (
      <button
        key={tab.cat || "all"}
        type="button"
        onClick={() => onSelect(tab.cat === activeCategory ? "" : tab.cat)}
        style={{
          display: "inline-flex", alignItems: "center", gap: 7,
          padding: "7px 16px", whiteSpace: "nowrap", flexShrink: 0,
          background: active ? "#0A66C2" : "#FFFFFF",
          border: `1px solid ${active ? "#0A66C2" : "rgba(0,0,0,0.12)"}`,
          borderRadius: 20, fontFamily: "'Inter', sans-serif", fontSize: 13,
          fontWeight: active ? 700 : 500, color: active ? "#fff" : "#555555",
          cursor: "pointer", transition: "all 150ms",
          boxShadow: active ? "0 2px 8px rgba(10,102,194,0.22)" : "none",
        }}
        onMouseEnter={(e) => { if (!active) { e.currentTarget.style.borderColor = "rgba(0,0,0,0.25)"; e.currentTarget.style.color = "#191919"; } }}
        onMouseLeave={(e) => { if (!active) { e.currentTarget.style.borderColor = "rgba(0,0,0,0.12)"; e.currentTarget.style.color = "#555555"; } }}
      >
        {tab.label}
        <span style={{
          padding: "1px 7px",
          background: active ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.06)",
          borderRadius: 100, fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 10, fontWeight: 500,
          color: active ? "rgba(255,255,255,0.9)" : "#9CA3AF", letterSpacing: "0.04em",
        }}>
          {tab.count}
        </span>
      </button>
    );
  }

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 28 }}>
      <div
        ref={rowRef}
        style={{
          display: "flex", gap: 8, flexWrap: "nowrap", overflow: "hidden",
          flex: 1, minWidth: 0,
          maskImage: hasOverflow ? "linear-gradient(to right, black 82%, transparent 100%)" : undefined,
          WebkitMaskImage: hasOverflow ? "linear-gradient(to right, black 82%, transparent 100%)" : undefined,
        }}
      >
        {allTabs.map((tab) => tabBtn(tab))}
      </div>

      {hasOverflow && (
        <div ref={moreRef} style={{ position: "relative", flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => setMoreOpen((o) => !o)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "7px 14px", whiteSpace: "nowrap",
              background: overflowHasActive ? "#0A66C2" : "#FFFFFF",
              border: `1px solid ${overflowHasActive ? "#0A66C2" : "rgba(0,0,0,0.18)"}`,
              borderRadius: 20, fontFamily: "'Inter', sans-serif", fontSize: 13,
              fontWeight: overflowHasActive ? 700 : 500,
              color: overflowHasActive ? "#fff" : "#555555",
              cursor: "pointer", transition: "all 150ms",
            }}
          >
            More ({overflowTabs.length})
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              style={{ transition: "transform 150ms", transform: moreOpen ? "rotate(180deg)" : "none" }}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {moreOpen && (
            <div style={{
              position: "absolute", top: "calc(100% + 8px)", right: 0,
              background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.10)",
              borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
              minWidth: 190, overflow: "hidden", zIndex: 300,
              animation: "dropdownIn 0.15s ease both",
            }}>
              {overflowTabs.map((tab, i) => {
                const active = tab.cat === activeCategory;
                return (
                  <button
                    key={tab.cat}
                    type="button"
                    onClick={() => { onSelect(tab.cat === activeCategory ? "" : tab.cat); setMoreOpen(false); }}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      width: "100%", padding: "11px 16px",
                      background: active ? "rgba(10,102,194,0.06)" : "transparent",
                      border: "none", borderTop: i > 0 ? "1px solid rgba(0,0,0,0.05)" : "none",
                      fontFamily: "'Inter', sans-serif", fontSize: 14,
                      fontWeight: active ? 600 : 400, color: active ? "#0A66C2" : "#191919",
                      cursor: "pointer", textAlign: "left", transition: "background 120ms",
                    }}
                    onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "rgba(0,0,0,0.03)"; }}
                    onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
                  >
                    <span>{tab.label}</span>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#9CA3AF" }}>{tab.count}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

function FindWorkPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [state, setState] = useState<ScrapedJobSearchState>(() => {
    const q   = searchParams.get("query") ?? "";
    const cat = searchParams.get("category") ?? "";
    const wt  = searchParams.getAll("work_types");
    const el  = searchParams.getAll("experience_levels");
    const et  = searchParams.getAll("employment_types");
    const sk  = searchParams.getAll("skills");
    const city = searchParams.get("location_city") ?? "";
    const smin = searchParams.get("salary_min");
    const smax = searchParams.get("salary_max");
    const pwd  = searchParams.get("posted_within_days");
    return {
      ...DEFAULT_STATE,
      query: q, category: cat,
      work_types: wt, experience_levels: el, employment_types: et, skills: sk,
      location_city: city,
      salary_min: smin ? parseInt(smin) : undefined,
      salary_max: smax ? parseInt(smax) : undefined,
      posted_within_days: pwd ? parseInt(pwd) : undefined,
    };
  });

  const [jobs, setJobs] = useState<ScrapedJob[]>([]);
  const [facets, setFacets] = useState<ScrapedJobFacets | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const queryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);

  const queryDetected = useMemo(() => detectFromQuery(state.query), [state.query]);

  function pushUrl(s: ScrapedJobSearchState) {
    const p = new URLSearchParams();
    if (s.query)               p.set("query", s.query);
    if (s.category)            p.set("category", s.category);
    if (s.location_city)       p.set("location_city", s.location_city);
    if (s.salary_min != null)  p.set("salary_min", String(s.salary_min));
    if (s.salary_max != null)  p.set("salary_max", String(s.salary_max));
    if (s.posted_within_days != null) p.set("posted_within_days", String(s.posted_within_days));
    s.work_types.forEach((v)        => p.append("work_types", v));
    s.experience_levels.forEach((v) => p.append("experience_levels", v));
    s.employment_types.forEach((v)  => p.append("employment_types", v));
    s.skills.forEach((v)            => p.append("skills", v));
    router.replace(`/find-work/jobs${p.toString() ? `?${p}` : ""}`, { scroll: false });
  }

  const doSearch = useCallback(async (s: ScrapedJobSearchState, append = false) => {
    if (!append) setLoading(true); else setLoadingMore(true);
    setError(null);
    try {
      const detected = detectFromQuery(s.query);
      const merged = {
        ...s,
        work_types: Array.from(new Set([...s.work_types, ...detected.work_types])),
        experience_levels: Array.from(new Set([...s.experience_levels, ...detected.experience_levels])),
        employment_types: Array.from(new Set([...s.employment_types, ...detected.employment_types])),
      };
      const res = await searchScrapedJobs({ ...merged, page_size: 20, include_facets: !append });
      if (!append) {
        setJobs(res.jobs);
        if (res.facets) setFacets(res.facets);
      } else {
        setJobs((prev) => [...prev, ...res.jobs]);
      }
      setTotal(res.total);
      setHasMore((s.page + 1) * 20 < res.total);
    } catch {
      setError("Could not load jobs. Please try again.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => { doSearch(state); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    const next = { ...state, page: 0 };
    pushUrl(next);
    if (queryTimer.current) clearTimeout(queryTimer.current);
    queryTimer.current = setTimeout(() => doSearch(next), 300);
    return () => { if (queryTimer.current) clearTimeout(queryTimer.current); };
  }, [
    state.query, state.category,
    state.work_types, state.experience_levels, state.employment_types,
    state.skills, state.salary_min, state.salary_max,
    state.location_city, state.posted_within_days,
  ]); // eslint-disable-line react-hooks/exhaustive-deps

  function update(patch: Partial<ScrapedJobSearchState>) {
    setState((prev) => ({ ...prev, ...patch, page: 0 }));
  }

  function clearAll() { setState(DEFAULT_STATE); }

  async function loadMore() {
    const next = { ...state, page: state.page + 1 };
    setState(next);
    await doSearch(next, true);
  }

  const autoOnly = {
    work_types: queryDetected.work_types.filter((v) => !state.work_types.includes(v)),
    experience_levels: queryDetected.experience_levels.filter((v) => !state.experience_levels.includes(v)),
    employment_types: queryDetected.employment_types.filter((v) => !state.employment_types.includes(v)),
  };

  const activeFilterCount = [
    state.work_types.length + autoOnly.work_types.length,
    state.experience_levels.length + autoOnly.experience_levels.length,
    state.employment_types.length + autoOnly.employment_types.length,
    state.skills.length,
    state.salary_min != null ? 1 : 0,
    state.salary_max != null ? 1 : 0,
    state.location_city ? 1 : 0,
    state.posted_within_days != null ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const categoryTabs = facets?.categories
    ? Object.entries(facets.categories).sort((a, b) => b[1] - a[1])
    : [];

  const totalAllCategories = facets
    ? Object.values(facets.categories ?? {}).reduce((a, b) => a + b, 0)
    : total;

  const allTabs = useMemo(() => [
    { cat: "", label: "All jobs", count: totalAllCategories },
    ...categoryTabs.map(([cat, count]) => ({
      cat, count,
      label: CATEGORY_LABELS[cat] ?? (cat.charAt(0).toUpperCase() + cat.slice(1)),
    })),
  ], [categoryTabs, totalAllCategories]); // eslint-disable-line react-hooks/exhaustive-deps

  const allSkillsList = useMemo(
    () => Object.keys(facets?.top_skills ?? {}).sort(),
    [facets]
  );

  const hasAutoDetected = autoOnly.work_types.length > 0 || autoOnly.experience_levels.length > 0 || autoOnly.employment_types.length > 0;

  return (
    <main style={{
      minHeight: "100vh",
      background: "#F3F2EF",
      color: "#191919",
      padding: "80px clamp(16px, 4vw, 80px) 80px",
      position: "relative",
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "#0A66C2" }} />

      <div style={{ maxWidth: 1120, margin: "0 auto", animation: "fadeInUp 0.55s cubic-bezier(0.16,1,0.3,1) both" }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{
            fontFamily: "'Inter', sans-serif", fontWeight: 800,
            fontSize: "clamp(24px, 4vw, 38px)", color: "#191919",
            letterSpacing: "-0.03em", margin: 0, marginBottom: 6,
          }}>
            Find Work
          </h1>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: "#555555", margin: 0 }}>
            {total > 0 ? (
              <>
                <span style={{ fontWeight: 600, color: "#191919" }}>{total.toLocaleString()}</span>
                {" "}listings{state.category ? ` in ${CATEGORY_LABELS[state.category] ?? state.category}` : ""}
              </>
            ) : loading ? (
              "Loading listings…"
            ) : (
              "Browse live job listings — remote, hybrid, and on-site"
            )}
          </p>
        </div>

        {/* Category tabs */}
        <CategoryTabsRow
          allTabs={allTabs}
          activeCategory={state.category}
          onSelect={(cat) => setState((prev) => ({ ...prev, category: cat, page: 0 }))}
        />

        {/* Two-column layout */}
        <div className="fwp-layout" style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>

          {/* Sidebar */}
          <div
            className="fwp-sidebar filter-sidebar"
            style={{
              width: 264, flexShrink: 0,
              background: "#FFFFFF",
              border: "1px solid rgba(0,0,0,0.08)",
              borderRadius: 12,
              boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
              position: "sticky", top: 80,
              maxHeight: "calc(100vh - 100px)",
              overflowY: "auto",
            }}
          >
            {/* Sticky filter header */}
            <div style={{
              position: "sticky", top: 0, background: "#FFFFFF",
              padding: "16px 20px 12px",
              borderBottom: "1px solid rgba(0,0,0,0.06)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              zIndex: 1,
            }}>
              <span style={{
                fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 700,
                color: "#0A66C2", letterSpacing: "0.12em", textTransform: "uppercase",
              }}>
                Filters {activeFilterCount > 0 && (
                  <span style={{
                    marginLeft: 6, padding: "1px 7px",
                    background: "rgba(10,102,194,0.10)", borderRadius: 100,
                    fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
                    color: "#0A66C2", fontWeight: 600, letterSpacing: "0.04em",
                  }}>{activeFilterCount}</span>
                )}
              </span>
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={clearAll}
                  style={{
                    padding: "3px 10px", background: "transparent",
                    border: "1px solid rgba(10,102,194,0.22)", borderRadius: 100,
                    color: "#0A66C2", fontFamily: "'Inter', sans-serif",
                    fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "background 150ms",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(10,102,194,0.06)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  Clear all
                </button>
              )}
            </div>

            {/* Filter fields */}
            <div style={{ padding: "16px 20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>

              {/* Keywords */}
              <div>
                <label style={filterLabelStyle}>Keywords</label>
                <input
                  style={baseInputStyle}
                  type="text"
                  placeholder="Job title, skills, or keyword"
                  value={state.query}
                  onChange={(e) => setState((p) => ({ ...p, query: e.target.value }))}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "#0A66C2"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(0,0,0,0.18)"; }}
                />
                {hasAutoDetected && (
                  <div style={{
                    marginTop: 7, padding: "6px 10px",
                    background: "rgba(245,158,11,0.07)",
                    border: "1px solid rgba(245,158,11,0.20)",
                    borderRadius: 7, fontFamily: "'Inter', sans-serif",
                    fontSize: 11, color: "#92400e", lineHeight: 1.55,
                  }}>
                    Auto-filtering: {[
                      ...autoOnly.work_types.map((v) => WORK_TYPE_LABELS[v] ?? v),
                      ...autoOnly.experience_levels.map((v) => EXP_LEVEL_LABELS[v] ?? v),
                      ...autoOnly.employment_types.map((v) => EMPLOYMENT_TYPE_LABELS[v] ?? v),
                    ].join(", ")}
                  </div>
                )}
              </div>

              {/* Location */}
              <div>
                <label style={filterLabelStyle}>Location</label>
                <input
                  style={baseInputStyle}
                  type="text"
                  placeholder="City (e.g. Toronto)"
                  value={state.location_city}
                  onChange={(e) => update({ location_city: e.target.value })}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "#0A66C2"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(0,0,0,0.18)"; }}
                />
              </div>

              {/* Dropdowns */}
              <FilterDropdown
                label="Work type"
                options={Object.entries(WORK_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))}
                selected={state.work_types}
                autoDetected={queryDetected.work_types}
                facets={facets?.work_types}
                onChange={(v) => update({ work_types: v })}
              />

              <FilterDropdown
                label="Experience"
                options={Object.entries(EXP_LEVEL_LABELS).map(([v, l]) => ({ value: v, label: l }))}
                selected={state.experience_levels}
                autoDetected={queryDetected.experience_levels}
                facets={facets?.experience_levels}
                onChange={(v) => update({ experience_levels: v })}
              />

              <FilterDropdown
                label="Employment type"
                options={Object.entries(EMPLOYMENT_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))}
                selected={state.employment_types}
                autoDetected={queryDetected.employment_types}
                facets={facets?.employment_types}
                onChange={(v) => update({ employment_types: v })}
              />

              {/* Skills */}
              <SkillSearch
                selected={state.skills}
                allSkills={allSkillsList}
                onChange={(v) => update({ skills: v })}
              />

              {/* Salary range */}
              <div>
                <label style={filterLabelStyle}>Salary (USD / yr)</label>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input
                    style={{ ...baseInputStyle, flex: 1, minWidth: 0, padding: "9px 8px" }}
                    type="number"
                    placeholder="Min"
                    step={10}
                    value={state.salary_min != null ? Math.round(state.salary_min / 1000) : ""}
                    onChange={(e) => update({ salary_min: e.target.value ? parseInt(e.target.value) * 1000 : undefined })}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "#0A66C2"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(0,0,0,0.18)"; }}
                  />
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#9CA3AF", flexShrink: 0 }}>k–</span>
                  <input
                    style={{ ...baseInputStyle, flex: 1, minWidth: 0, padding: "9px 8px" }}
                    type="number"
                    placeholder="Max"
                    step={10}
                    value={state.salary_max != null ? Math.round(state.salary_max / 1000) : ""}
                    onChange={(e) => update({ salary_max: e.target.value ? parseInt(e.target.value) * 1000 : undefined })}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "#0A66C2"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(0,0,0,0.18)"; }}
                  />
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#9CA3AF", flexShrink: 0 }}>k</span>
                </div>
              </div>

              {/* Posted within */}
              <div>
                <label style={filterLabelStyle}>Posted within</label>
                <div style={{ position: "relative" }}>
                  <select
                    style={{ ...baseInputStyle, cursor: "pointer", appearance: "none" as const, paddingRight: 32 }}
                    value={state.posted_within_days ?? ""}
                    onChange={(e) => update({ posted_within_days: e.target.value ? parseInt(e.target.value) : undefined })}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "#0A66C2"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(0,0,0,0.18)"; }}
                  >
                    <option value="">Any time</option>
                    <option value="1">Last 24 hours</option>
                    <option value="7">Last 7 days</option>
                    <option value="30">Last 30 days</option>
                  </select>
                  <svg
                    width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5"
                    style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </div>

            </div>
          </div>

          {/* Results */}
          <div style={{ flex: 1, minWidth: 0 }}>

            {error && (
              <div style={{
                padding: "14px 18px", background: "rgba(239,68,68,0.04)",
                border: "1px solid rgba(239,68,68,0.18)", borderRadius: 10,
                marginBottom: 18, display: "flex", alignItems: "center",
                justifyContent: "space-between", gap: 16,
              }}>
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: "#DC2626" }}>{error}</span>
                <button
                  onClick={() => doSearch(state)}
                  style={{
                    padding: "6px 14px", background: "transparent",
                    border: "1px solid rgba(239,68,68,0.28)", borderRadius: 8,
                    color: "#DC2626", fontFamily: "'Inter', sans-serif",
                    fontSize: 13, fontWeight: 600, cursor: "pointer", flexShrink: 0,
                  }}
                >Retry</button>
              </div>
            )}

            {loading && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            )}

            {!loading && !error && jobs.length === 0 && (
              <div style={{
                padding: "56px 32px", background: "#FFFFFF",
                border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12,
                textAlign: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
              }}>
                <div style={{
                  width: 52, height: 52, borderRadius: "50%",
                  background: "rgba(10,102,194,0.06)", border: "1px solid rgba(10,102,194,0.16)",
                  display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px",
                }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0A66C2" strokeWidth="1.6">
                    <rect x="2" y="7" width="20" height="14" rx="2"/>
                    <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/>
                  </svg>
                </div>
                <h3 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 17, color: "#191919", marginBottom: 8 }}>
                  No jobs match your filters
                </h3>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#9CA3AF", maxWidth: "36ch", margin: "0 auto 20px" }}>
                  Try a different category or broaden your search.
                </p>
                <button
                  onClick={clearAll}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "10px 22px", background: "#0A66C2", border: "none",
                    borderRadius: 20, color: "#fff", fontFamily: "'Inter', sans-serif",
                    fontWeight: 600, fontSize: 13, cursor: "pointer", transition: "background 150ms",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#004182"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "#0A66C2"; }}
                >
                  Clear all filters
                </button>
              </div>
            )}

            {!loading && jobs.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {jobs.map((job) => <ScrapedJobCard key={job.id} job={job} />)}
              </div>
            )}

            {!loading && hasMore && (
              <div style={{ display: "flex", justifyContent: "center", marginTop: 24 }}>
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 8,
                    padding: "11px 28px", background: "transparent",
                    border: "1px solid rgba(0,0,0,0.18)", borderRadius: 20,
                    color: loadingMore ? "#9CA3AF" : "#555555",
                    fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 14,
                    cursor: loadingMore ? "not-allowed" : "pointer",
                    transition: "border-color 150ms, color 150ms",
                  }}
                  onMouseEnter={(e) => { if (!loadingMore) { e.currentTarget.style.borderColor = "rgba(0,0,0,0.30)"; e.currentTarget.style.color = "#191919"; } }}
                  onMouseLeave={(e) => { if (!loadingMore) { e.currentTarget.style.borderColor = "rgba(0,0,0,0.18)"; e.currentTarget.style.color = "#555555"; } }}
                >
                  {loadingMore ? (
                    <>
                      <div style={{ width: 14, height: 14, border: "2px solid rgba(10,102,194,0.2)", borderTopColor: "#0A66C2", borderRadius: "50%", animation: "spin 600ms linear infinite" }} />
                      Loading…
                    </>
                  ) : "Load more jobs"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes dropdownIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
        .filter-sidebar::-webkit-scrollbar { width: 4px; }
        .filter-sidebar::-webkit-scrollbar-track { background: transparent; }
        .filter-sidebar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.12); border-radius: 2px; }
        .filter-sidebar::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.22); }
        @media (max-width: 860px) {
          .fwp-layout { flex-direction: column !important; }
          .fwp-sidebar { width: 100% !important; position: static !important; max-height: 70vh !important; }
        }
        @media (max-width: 640px) {
          .fwp-sidebar { max-height: 60vh !important; }
        }
      `}</style>
    </main>
  );
}

export default function FindWorkPage() {
  return (
    <React.Suspense fallback={<div style={{ minHeight: "100vh", background: "#F3F2EF" }} />}>
      <FindWorkPageInner />
    </React.Suspense>
  );
}
