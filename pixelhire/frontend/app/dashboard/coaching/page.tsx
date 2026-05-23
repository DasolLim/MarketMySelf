"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  analyzeResume,
  fetchCoachingHistory,
  fetchProfile,
  getResumeAnalysis,
  getResumeAnalysisHistory,
  startInterviewPrep,
  submitResumeForCoaching,
} from "@/lib/api";
import {
  CoachingSession,
  DiagnoserResult,
  FeatureType,
  HiringManagerResult,
  PixelSection,
  RecruiterResult,
  ResumeAnalysisHistoryItem,
  ResumeAnalysisResponse,
  RewriterResult,
  ValidationError,
} from "@/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function isValidationError(v: ResumeAnalysisResponse | ValidationError): v is ValidationError {
  return "is_valid" in v && v.is_valid === false;
}

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, { bg: string; color: string }> = {
    high:   { bg: "rgba(239,68,68,0.10)",    color: "#DC2626" },
    medium: { bg: "rgba(245,158,11,0.10)",   color: "#D97706" },
    low:    { bg: "rgba(107,114,128,0.10)",  color: "#6B7280" },
  };
  const c = colors[severity] ?? colors.low;
  return (
    <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700, fontFamily: "'Inter', sans-serif", textTransform: "uppercase", letterSpacing: "0.06em", background: c.bg, color: c.color }}>
      {severity}
    </span>
  );
}

function LikelihoodPill({ value }: { value?: string }) {
  const normalised = (value ?? "").toLowerCase();
  const colors: Record<string, { bg: string; border: string; color: string }> = {
    high:   { bg: "rgba(5,118,66,0.08)",    border: "rgba(5,118,66,0.22)",    color: "#057642" },
    medium: { bg: "rgba(245,158,11,0.08)",  border: "rgba(245,158,11,0.22)",  color: "#D97706" },
    low:    { bg: "rgba(239,68,68,0.08)",   border: "rgba(239,68,68,0.22)",   color: "#DC2626" },
  };
  const c = colors[normalised] ?? colors.medium;
  const label = normalised ? normalised.charAt(0).toUpperCase() + normalised.slice(1) : "—";
  return (
    <span style={{ display: "inline-block", padding: "4px 14px", borderRadius: 20, fontSize: 13, fontWeight: 700, fontFamily: "'Inter', sans-serif", background: c.bg, border: `1px solid ${c.border}`, color: c.color }}>
      {label} shortlist likelihood
    </span>
  );
}

function HireRecommendationPill({ value }: { value?: string }) {
  const normalised = (value ?? "").toLowerCase();
  const isPositive = normalised === "strong yes" || normalised === "yes";
  const isNeutral  = normalised === "maybe";
  const bg     = isPositive ? "rgba(5,118,66,0.08)"  : isNeutral ? "rgba(245,158,11,0.08)"  : "rgba(239,68,68,0.08)";
  const border = isPositive ? "rgba(5,118,66,0.22)"  : isNeutral ? "rgba(245,158,11,0.22)"  : "rgba(239,68,68,0.22)";
  const color  = isPositive ? "#057642"               : isNeutral ? "#D97706"                : "#DC2626";
  return (
    <span style={{ display: "inline-block", padding: "4px 14px", borderRadius: 20, fontSize: 13, fontWeight: 700, fontFamily: "'Inter', sans-serif", background: bg, border: `1px solid ${border}`, color }}>
      {normalised ? normalised.toUpperCase() : "—"}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; color: string }> = {
    "meets":           { bg: "rgba(5,118,66,0.08)",   color: "#057642" },
    "partially meets": { bg: "rgba(245,158,11,0.08)", color: "#D97706" },
    "missing":         { bg: "rgba(239,68,68,0.08)",  color: "#DC2626" },
  };
  const c = colors[status] ?? { bg: "rgba(107,114,128,0.10)", color: "#6B7280" };
  return (
    <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700, fontFamily: "'Inter', sans-serif", background: c.bg, color: c.color }}>
      {status}
    </span>
  );
}

// ── Result layouts ─────────────────────────────────────────────────────────────

function DiagnoserCard({ result }: { result: DiagnoserResult }) {
  const [openSection, setOpenSection] = useState<number | null>(null);
  const score = result.overall_score ?? 0;
  const scoreColor = score >= 70 ? "#057642" : score >= 40 ? "#D97706" : "#DC2626";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
        <div style={{ width: 80, height: 80, borderRadius: "50%", border: `4px solid ${scoreColor}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: "rgba(0,0,0,0.03)" }}>
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 22, fontWeight: 800, color: scoreColor }}>{score}</span>
        </div>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: "#555555", lineHeight: 1.65, margin: 0, flex: 1 }}>{result.score_rationale}</p>
      </div>

      {result.ats_killers?.length > 0 && (
        <div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 10 }}>ATS Killers</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {result.ats_killers.map((k, i) => (
              <div key={i} style={{ padding: "10px 14px", background: "#FAFAFA", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600, color: "#191919" }}>{k.issue}</span>
                  <SeverityBadge severity={k.severity} />
                </div>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#555555", margin: 0, lineHeight: 1.6 }}>{k.detail}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {result.section_diagnosis?.length > 0 && (
        <div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 10 }}>Section Diagnosis</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {result.section_diagnosis.map((s, i) => (
              <div key={i} style={{ border: "1px solid rgba(0,0,0,0.08)", borderRadius: 8, overflow: "hidden" }}>
                <button
                  onClick={() => setOpenSection(openSection === i ? null : i)}
                  style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "#FAFAFA", border: "none", cursor: "pointer", textAlign: "left" }}
                >
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600, color: "#191919" }}>{s.section}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" style={{ transform: openSection === i ? "rotate(180deg)" : "none", transition: "transform 150ms" }}><path d="M6 9l6 6 6-6"/></svg>
                </button>
                {openSection === i && (
                  <div style={{ padding: "10px 14px", background: "#FFFFFF", borderTop: "1px solid rgba(0,0,0,0.06)", display: "flex", flexDirection: "column", gap: 8 }}>
                    <div>
                      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#9CA3AF", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>Weakest line</div>
                      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#191919", fontStyle: "italic", margin: 0, background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.12)", borderRadius: 6, padding: "6px 10px" }}>&ldquo;{s.weakest_line}&rdquo;</p>
                    </div>
                    <div>
                      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#9CA3AF", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>Why it fails</div>
                      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#555555", margin: 0, lineHeight: 1.6 }}>{s.why_it_fails}</p>
                    </div>
                    <div>
                      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#057642", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>Fix</div>
                      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#191919", margin: 0, lineHeight: 1.6 }}>{s.one_line_fix}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {result.missing_signals?.length > 0 && (
        <div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 10 }}>Missing Signals</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {result.missing_signals.map((s, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "8px 14px", background: "#FAFAFA", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 8, gap: 10 }}>
                <div>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600, color: "#191919" }}>{s.signal}</span>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#9CA3AF", marginLeft: 8 }}>{s.source}</span>
                </div>
                <SeverityBadge severity={s.impact} />
              </div>
            ))}
          </div>
        </div>
      )}

      {result.top_fixes?.length > 0 && (
        <div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 10 }}>Top Fixes</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {result.top_fixes.map((f, i) => (
              <div key={i} style={{ padding: "12px 14px", background: "#FAFAFA", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: f.before ? 8 : 0 }}>
                  <span style={{ width: 22, height: 22, borderRadius: "50%", background: "#0A66C2", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, fontFamily: "'Inter', sans-serif", flexShrink: 0 }}>
                    {f.rank}
                  </span>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600, color: "#191919" }}>{f.fix}</span>
                </div>
                {f.before && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                    <div style={{ padding: "6px 10px", background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.12)", borderRadius: 6 }}>
                      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, color: "#DC2626", fontWeight: 700, textTransform: "uppercase", marginBottom: 2 }}>Before</div>
                      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#191919", fontStyle: "italic", margin: 0 }}>{f.before}</p>
                    </div>
                    {f.after && (
                      <div style={{ padding: "6px 10px", background: "rgba(5,118,66,0.04)", border: "1px solid rgba(5,118,66,0.12)", borderRadius: 6 }}>
                        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, color: "#057642", fontWeight: 700, textTransform: "uppercase", marginBottom: 2 }}>After</div>
                        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#191919", margin: 0 }}>{f.after}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RecruiterCard({ result }: { result: RecruiterResult }) {
  const statusColor: Record<string, string> = {
    "present and prominent": "#057642",
    "present but buried":    "#D97706",
    "missing":               "#DC2626",
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <LikelihoodPill value={result.shortlist_likelihood} />
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: "#555555", lineHeight: 1.65, margin: 0 }}>{result.recruiter_verdict ?? ""}</p>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#9CA3AF", lineHeight: 1.6, margin: 0 }}>{result.shortlist_rationale ?? ""}</p>
      </div>

      {result.top_keywords?.length > 0 && (
        <div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 10 }}>Keyword Status</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'Inter', sans-serif", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
                  {["#", "Keyword", "Type", "Status"].map((h) => (
                    <th key={h} style={{ padding: "6px 10px", textAlign: "left", color: "#9CA3AF", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.top_keywords.map((k, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                    <td style={{ padding: "7px 10px", color: "#9CA3AF" }}>{k.rank}</td>
                    <td style={{ padding: "7px 10px", color: "#191919", fontWeight: 500 }}>{k.keyword}</td>
                    <td style={{ padding: "7px 10px", color: "#9CA3AF" }}>{k.type}</td>
                    <td style={{ padding: "7px 10px" }}>
                      <span style={{ color: statusColor[(k.resume_status ?? "").toLowerCase()] ?? "#6B7280", fontWeight: 600 }}>{k.resume_status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {result.keyword_gaps?.length > 0 && (
        <div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 10 }}>Keyword Gaps</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {result.keyword_gaps.map((g, i) => (
              <div key={i} style={{ padding: "8px 14px", background: "#FAFAFA", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600, color: "#191919" }}>{g.keyword}</span>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#D97706", fontWeight: 600 }}>{g.status}</span>
                </div>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#555555", margin: 0 }}>{g.recommendation}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {result.emerging_skills?.length > 0 && (
        <div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 10 }}>Emerging Skills to Add</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {result.emerging_skills.map((s, i) => (
              <div key={i} style={{ padding: "8px 14px", background: "#FAFAFA", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 8 }}>
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600, color: "#191919" }}>{s.skill}</span>
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#9CA3AF", marginLeft: 8 }}>{s.rationale}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {result.buzzwords_to_cut?.length > 0 && (
        <div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 10 }}>Buzzwords to Cut</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {result.buzzwords_to_cut.map((b, i) => (
              <div key={i} style={{ padding: "8px 14px", background: "#FAFAFA", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 8 }}>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#191919", fontStyle: "italic", margin: "0 0 3px" }}>&ldquo;{b.phrase}&rdquo;</p>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#9CA3AF", margin: 0 }}>{b.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {result.shortlist_action_plan?.length > 0 && (
        <div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 10 }}>Shortlist Action Plan</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {result.shortlist_action_plan.map((a, i) => (
              <div key={i} style={{ display: "flex", gap: 10, padding: "10px 14px", background: "#FAFAFA", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 8, alignItems: "flex-start" }}>
                <span style={{ width: 22, height: 22, borderRadius: "50%", background: "#0A66C2", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, fontFamily: "'Inter', sans-serif", flexShrink: 0, marginTop: 1 }}>{a.rank}</span>
                <div>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600, color: "#191919", margin: "0 0 2px" }}>{a.action}</p>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#9CA3AF", margin: 0 }}>{a.impact}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RewriterCard({ result }: { result: RewriterResult }) {
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});
  const metricsNeeded = result.metrics_needed?.length ?? 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {metricsNeeded > 0 && (
        <div style={{ padding: "12px 16px", background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.22)", borderRadius: 10 }}>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#D97706", fontWeight: 600, margin: "0 0 4px" }}>
            {metricsNeeded} bullet{metricsNeeded > 1 ? "s" : ""} still need metrics
          </p>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#9CA3AF", margin: 0 }}>
            Ask the candidate for specifics before sending.
          </p>
        </div>
      )}

      {result.keywords_added?.length > 0 && (
        <div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 8 }}>Keywords Added</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {result.keywords_added.map((k, i) => (
              <span key={i} style={{ padding: "3px 10px", background: "rgba(10,102,194,0.08)", border: "1px solid rgba(10,102,194,0.18)", borderRadius: 20, fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#0A66C2", fontWeight: 500 }}>
                {k.keyword}
              </span>
            ))}
          </div>
        </div>
      )}

      {result.top_5_rewrites?.length > 0 && (
        <div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 10 }}>Top Rewrites</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {result.top_5_rewrites.map((r, i) => {
              const key = `top-${i}`;
              const showing = flipped[key];
              return (
                <div key={i} style={{ padding: "12px 14px", background: "#FAFAFA", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ width: 22, height: 22, borderRadius: "50%", background: "#0A66C2", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, fontFamily: "'Inter', sans-serif", flexShrink: 0 }}>{r.rank}</span>
                      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#9CA3AF" }}>{r.why_stronger}</span>
                    </div>
                    <button
                      onClick={() => setFlipped((f) => ({ ...f, [key]: !f[key] }))}
                      style={{ background: "none", border: "1px solid rgba(0,0,0,0.12)", borderRadius: 20, padding: "3px 10px", fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#555555", cursor: "pointer" }}
                    >
                      {showing ? "Before" : "After"}
                    </button>
                  </div>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#191919", margin: 0, lineHeight: 1.6 }}>
                    {showing ? r.before : r.after}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {result.rewritten_experience?.length > 0 && (
        <div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 10 }}>All Rewrites by Company</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {result.rewritten_experience.map((exp, ei) => (
              <div key={ei}>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 700, color: "#191919", marginBottom: 8 }}>
                  {exp.company} — {exp.original_title}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {exp.bullets.map((b, bi) => {
                    const key = `exp-${ei}-${bi}`;
                    const showing = flipped[key];
                    return (
                      <div key={bi} style={{ padding: "10px 14px", background: "#FAFAFA", border: `1px solid ${b.metric_needed ? "rgba(245,158,11,0.22)" : "rgba(0,0,0,0.08)"}`, borderRadius: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                          {b.metric_needed && <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, color: "#D97706", fontWeight: 700, textTransform: "uppercase" }}>Metric needed</span>}
                          <button
                            onClick={() => setFlipped((f) => ({ ...f, [key]: !f[key] }))}
                            style={{ marginLeft: "auto", background: "none", border: "1px solid rgba(0,0,0,0.12)", borderRadius: 20, padding: "2px 8px", fontFamily: "'Inter', sans-serif", fontSize: 10, color: "#555555", cursor: "pointer" }}
                          >
                            {showing ? "Rewritten" : "Original"}
                          </button>
                        </div>
                        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#191919", margin: 0, lineHeight: 1.6 }}>
                          {showing ? b.original : b.rewritten}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function HiringManagerCard({ result }: { result: HiringManagerResult }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <HireRecommendationPill value={result.hire_recommendation} />
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: "#555555", lineHeight: 1.7, margin: 0 }}>{result.hiring_manager_verdict ?? ""}</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ padding: "12px 14px", background: "rgba(5,118,66,0.04)", border: "1px solid rgba(5,118,66,0.12)", borderRadius: 10 }}>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#057642", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Positives</div>
          <ul style={{ margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 5 }}>
            {result.first_impression?.positives?.map((p, i) => (
              <li key={i} style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#191919", lineHeight: 1.6 }}>{p}</li>
            ))}
          </ul>
        </div>
        <div style={{ padding: "12px 14px", background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.12)", borderRadius: 10 }}>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#DC2626", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Concerns</div>
          <ul style={{ margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 5 }}>
            {result.first_impression?.negatives?.map((n, i) => (
              <li key={i} style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#191919", lineHeight: 1.6 }}>{n}</li>
            ))}
          </ul>
        </div>
      </div>

      {result.candidate_narrative && (
        <div style={{ padding: "12px 14px", background: "#FAFAFA", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 10 }}>
          <div style={{ display: "flex", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#9CA3AF", fontWeight: 600 }}>Trajectory: <b style={{ color: "#191919" }}>{result.candidate_narrative.trajectory}</b></span>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#9CA3AF", fontWeight: 600 }}>Fit: <b style={{ color: "#191919" }}>{result.candidate_narrative.positioning_fit}</b></span>
          </div>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#555555", margin: 0, lineHeight: 1.65 }}>{result.candidate_narrative.narrative_summary}</p>
        </div>
      )}

      {result.qualifications_check?.length > 0 && (
        <div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 10 }}>Qualifications Check</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {result.qualifications_check.map((q, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "8px 14px", background: "#FAFAFA", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 8, gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 500, color: "#191919", margin: "0 0 2px" }}>{q.requirement}</p>
                  {q.evidence && <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#9CA3AF", fontStyle: "italic", margin: 0 }}>&ldquo;{q.evidence}&rdquo;</p>}
                </div>
                <StatusBadge status={q.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {result.red_flags?.length > 0 && (
        <div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 10 }}>Red Flags</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {result.red_flags.map((f, i) => (
              <div key={i} style={{ padding: "10px 14px", background: "#FAFAFA", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600, color: "#191919" }}>{f.flag}</span>
                  <SeverityBadge severity={f.severity} />
                </div>
                <blockquote style={{ margin: 0, borderLeft: "3px solid rgba(239,68,68,0.3)", paddingLeft: 10 }}>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#6B7280", fontStyle: "italic", margin: 0 }}>&ldquo;{f.resume_quote}&rdquo;</p>
                </blockquote>
              </div>
            ))}
          </div>
        </div>
      )}

      {result.interview_questions?.length > 0 && (
        <div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 10 }}>Interview Questions</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {result.interview_questions.map((q, i) => (
              <div key={i} style={{ display: "flex", gap: 10, padding: "10px 14px", background: "#FAFAFA", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 8, alignItems: "flex-start" }}>
                <span style={{ width: 22, height: 22, borderRadius: "50%", background: "#0A66C2", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, fontFamily: "'Inter', sans-serif", flexShrink: 0, marginTop: 1 }}>{q.rank}</span>
                <div>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600, color: "#191919", margin: "0 0 3px" }}>{q.question}</p>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#9CA3AF", margin: 0 }}>{q.why_asking}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const FEATURES: Array<{ id: FeatureType; name: string; description: string }> = [
  { id: "diagnoser",      name: "Resume Diagnoser",  description: "ATS audit — find what is broken and why" },
  { id: "recruiter",      name: "Resume Recruiter",  description: "Keyword gap analysis from a recruiter's perspective" },
  { id: "rewriter",       name: "Resume Rewriter",   description: "Rewrite every bullet using the XYZ formula" },
  { id: "hiring_manager", name: "Hiring Manager",    description: "Pre-interview assessment from a hiring manager's lens" },
];

const VALIDATION_MESSAGES: Record<string, string> = {
  PAGE_LIMIT: "Your resume is more than 2 pages. Please shorten it and re-upload.",
  NOT_RESUME: "",
  UNREADABLE: "We couldn't read your file. Try re-saving it as a PDF and uploading again.",
  WRONG_TYPE: "Only PDF and DOCX files are accepted.",
};

export default function CoachingPage() {
  const { accessToken, isLoading, role } = useAuth();
  const router = useRouter();

  // Existing state
  const [profile, setProfile] = useState<PixelSection | null>(null);
  const [sessions, setSessions] = useState<CoachingSession[]>([]);
  const [fetching, setFetching] = useState(true);
  const [resumeText, setResumeText] = useState("");
  const [submittingResume, setSubmittingResume] = useState(false);
  const [submittingInterview, setSubmittingInterview] = useState(false);
  const [activeSession, setActiveSession] = useState<CoachingSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"resume" | "interview" | "analyze">("resume");

  // AI Analyze tab state
  const [analyzeForm, setAnalyzeForm] = useState({ job_position: "", company: "", job_description: "" });
  const [selectedFeature, setSelectedFeature] = useState<FeatureType | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [validationError, setValidationError] = useState<ValidationError | null>(null);
  const [analyzeResult, setAnalyzeResult] = useState<ResumeAnalysisResponse | null>(null);
  const [recruiterResult, setRecruiterResult] = useState<RecruiterResult | null>(null);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [history, setHistory] = useState<ResumeAnalysisHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isLoading && !accessToken) router.push("/login");
    if (!isLoading && accessToken && role && role !== "seeker") router.push("/recruiter");
  }, [isLoading, accessToken, role, router]);

  useEffect(() => {
    if (!accessToken) return;
    Promise.all([
      fetchProfile(accessToken).catch(() => null),
      fetchCoachingHistory(accessToken).catch(() => []),
    ])
      .then(([p, h]) => { setProfile(p); setSessions(h); })
      .finally(() => setFetching(false));
  }, [accessToken]);

  async function handleResumeSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken || !resumeText.trim()) return;
    setError(null);
    setSubmittingResume(true);
    try {
      const result = await submitResumeForCoaching(resumeText, accessToken);
      const session: CoachingSession = { id: result.id, user_id: "", type: "resume", input_text: resumeText, feedback: result.feedback, questions: null, created_at: result.created_at };
      setSessions((s) => [session, ...s]);
      setActiveSession(session);
      setResumeText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmittingResume(false);
    }
  }

  async function handleInterviewStart() {
    if (!accessToken) return;
    setError(null);
    setSubmittingInterview(true);
    try {
      const result = await startInterviewPrep(profile?.job_category ?? null, profile?.tech_skills ?? [], accessToken);
      const session: CoachingSession = { id: result.id, user_id: "", type: "interview", input_text: null, feedback: null, questions: result.questions, created_at: result.created_at };
      setSessions((s) => [session, ...s]);
      setActiveSession(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate questions");
    } finally {
      setSubmittingInterview(false);
    }
  }

  async function handleAnalyzeSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken || !selectedFile || !selectedFeature) return;
    setValidationError(null);
    setAnalyzeResult(null);
    setAnalyzing(true);

    try {
      const fd = new FormData();
      fd.append("job_position", analyzeForm.job_position);
      fd.append("company", analyzeForm.company);
      fd.append("job_description", analyzeForm.job_description);
      fd.append("feature", selectedFeature);
      fd.append("resume", selectedFile);

      if (selectedFeature === "rewriter" && recruiterResult) {
        const keywords = recruiterResult.keyword_gaps?.map((g) => g.keyword) ?? [];
        fd.append("missing_keywords", JSON.stringify(keywords));
      } else {
        fd.append("missing_keywords", "[]");
      }

      const response = await analyzeResume(fd, accessToken);

      if (isValidationError(response)) {
        const msg = response.error_code === "NOT_RESUME"
          ? `This file doesn't look like a resume. We detected it as: ${response.detected_as ?? "unknown"}. Please upload your resume.`
          : VALIDATION_MESSAGES[response.error_code] ?? response.error_message;
        setValidationError({ ...response, error_message: msg });
      } else {
        setAnalyzeResult(response);
        if (response.feature === "recruiter") {
          setRecruiterResult(response.result as unknown as RecruiterResult);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleHistoryExpand() {
    if (historyExpanded) { setHistoryExpanded(false); return; }
    setHistoryExpanded(true);
    if (!accessToken || history.length > 0) return;
    setHistoryLoading(true);
    try {
      const h = await getResumeAnalysisHistory(accessToken);
      setHistory(h);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load history");
      setHistoryExpanded(false);
    } finally {
      setHistoryLoading(false);
    }
  }

  async function handleHistoryClick(item: ResumeAnalysisHistoryItem) {
    if (!accessToken) return;
    try {
      const res = await getResumeAnalysis(item.analysis_id, accessToken);
      setAnalyzeResult(res);
      setValidationError(null);
    } catch { /* ignore */ }
  }

  const analyzeReady =
    analyzeForm.job_position.trim() &&
    analyzeForm.company.trim() &&
    analyzeForm.job_description.trim() &&
    selectedFile &&
    selectedFeature;

  const featureLabels: Record<FeatureType, string> = {
    diagnoser:      "Resume Diagnoser",
    recruiter:      "Resume Recruiter",
    rewriter:       "Resume Rewriter",
    hiring_manager: "Hiring Manager",
  };

  if (isLoading || fetching) {
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
      <div style={{ maxWidth: 760, margin: "0 auto", animation: "fadeInUp 0.55s cubic-bezier(0.16,1,0.3,1) both" }}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#0A66C2", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 6 }}>Seeker dashboard</div>
            <h1 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: "clamp(22px, 4vw, 32px)", color: "#191919", letterSpacing: "-0.03em" }}>AI Coaching</h1>
          </div>
          <Link href="/dashboard" style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#555555", textDecoration: "none", display: "flex", alignItems: "center", gap: 5 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
            Dashboard
          </Link>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 0, marginBottom: 20, background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 10, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          {(["resume", "interview", "analyze"] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setActiveSession(null); setError(null); }}
              style={{
                flex: 1,
                padding: "12px 20px",
                background: tab === t ? "#0A66C2" : "transparent",
                border: "none",
                color: tab === t ? "#fff" : "#555555",
                fontFamily: "'Inter', sans-serif",
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
                transition: "background 150ms, color 150ms",
              }}
            >
              {t === "resume" ? "Resume Review" : t === "interview" ? "Interview Prep" : "AI Analyze"}
            </button>
          ))}
        </div>

        {error && (
          <div style={{ padding: "12px 16px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.22)", borderRadius: 10, fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#DC2626", marginBottom: 16 }}>{error}</div>
        )}

        {/* Resume tab */}
        {tab === "resume" && !activeSession && (
          <div style={{ background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, padding: "24px 28px", boxShadow: "0 1px 8px rgba(0,0,0,0.04)", marginBottom: 20 }}>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 16 }}>Paste your resume</div>
            <form onSubmit={handleResumeSubmit}>
              <textarea
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                placeholder="Paste the text of your resume here for AI-powered feedback..."
                style={{ width: "100%", minHeight: 200, padding: "12px 14px", background: "#FAFAFA", border: "1px solid rgba(0,0,0,0.14)", borderRadius: 8, fontFamily: "'Inter', sans-serif", fontSize: 14, color: "#191919", outline: "none", boxSizing: "border-box", resize: "vertical", lineHeight: 1.65 }}
                onFocus={(e) => { e.target.style.borderColor = "#0A66C2"; e.target.style.boxShadow = "0 0 0 3px rgba(10,102,194,0.10)"; }}
                onBlur={(e) => { e.target.style.borderColor = "rgba(0,0,0,0.14)"; e.target.style.boxShadow = "none"; }}
              />
              <button
                type="submit"
                disabled={submittingResume || !resumeText.trim()}
                style={{ marginTop: 14, padding: "10px 26px", background: submittingResume ? "rgba(10,102,194,0.5)" : "#0A66C2", border: "none", borderRadius: 20, color: "#fff", fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 14, cursor: submittingResume || !resumeText.trim() ? "not-allowed" : "pointer", transition: "background 150ms", display: "inline-flex", alignItems: "center", gap: 8 }}>
                {submittingResume ? (<><div style={{ width: 13, height: 13, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 600ms linear infinite" }} />Analyzing...</>) : "Get AI feedback"}
              </button>
            </form>
          </div>
        )}

        {/* Interview tab */}
        {tab === "interview" && !activeSession && (
          <div style={{ background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, padding: "24px 28px", boxShadow: "0 1px 8px rgba(0,0,0,0.04)", marginBottom: 20 }}>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 14 }}>Interview questions</div>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: "#555555", marginBottom: 18, lineHeight: 1.65 }}>
              Generate tailored interview questions based on your profile&apos;s category
              {profile?.job_category ? ` (${profile.job_category})` : ""} and skills.
            </p>
            <button
              onClick={handleInterviewStart}
              disabled={submittingInterview}
              style={{ padding: "10px 26px", background: submittingInterview ? "rgba(10,102,194,0.5)" : "#0A66C2", border: "none", borderRadius: 20, color: "#fff", fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 14, cursor: submittingInterview ? "not-allowed" : "pointer", transition: "background 150ms", display: "inline-flex", alignItems: "center", gap: 8 }}>
              {submittingInterview ? (<><div style={{ width: 13, height: 13, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 600ms linear infinite" }} />Generating...</>) : "Generate questions"}
            </button>
          </div>
        )}

        {/* Active session result (resume/interview) */}
        {(tab === "resume" || tab === "interview") && activeSession && (
          <div style={{ background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, padding: "24px 28px", boxShadow: "0 1px 8px rgba(0,0,0,0.04)", marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase" }}>
                {activeSession.type === "resume" ? "Resume feedback" : "Interview questions"}
              </div>
              <button onClick={() => setActiveSession(null)} style={{ background: "none", border: "1px solid rgba(0,0,0,0.14)", borderRadius: 20, padding: "5px 14px", cursor: "pointer", fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#555555" }}>New session</button>
            </div>
            {activeSession.type === "resume" && activeSession.feedback && (
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: "#191919", lineHeight: 1.75, whiteSpace: "pre-wrap" }}>
                {activeSession.feedback}
              </div>
            )}
            {activeSession.type === "interview" && activeSession.questions && (
              <ol style={{ paddingLeft: 20, margin: 0, display: "flex", flexDirection: "column", gap: 14 }}>
                {activeSession.questions.map((q, i) => (
                  <li key={i} style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: "#191919", lineHeight: 1.65 }}>{q}</li>
                ))}
              </ol>
            )}
          </div>
        )}

        {/* AI Analyze tab */}
        {tab === "analyze" && (
          <>
            {/* Form card */}
            <div style={{ background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, padding: "24px 28px", boxShadow: "0 1px 8px rgba(0,0,0,0.04)", marginBottom: 16 }}>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 20 }}>Analyze your resume</div>

              {validationError && (
                <div style={{ padding: "12px 16px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.22)", borderRadius: 10, fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#DC2626", marginBottom: 16 }}>
                  {validationError.error_message}
                </div>
              )}

              <form onSubmit={handleAnalyzeSubmit}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                  {(["job_position", "company"] as const).map((field) => (
                    <div key={field}>
                      <label style={{ display: "block", fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#555555", fontWeight: 600, marginBottom: 5 }}>
                        {field === "job_position" ? "Job Position" : "Company"}
                      </label>
                      <input
                        type="text"
                        value={analyzeForm[field]}
                        onChange={(e) => setAnalyzeForm((f) => ({ ...f, [field]: e.target.value }))}
                        required
                        placeholder={field === "job_position" ? "e.g. Software Engineer" : "e.g. Google"}
                        style={{ width: "100%", padding: "10px 12px", background: "#FAFAFA", border: "1px solid rgba(0,0,0,0.14)", borderRadius: 8, fontFamily: "'Inter', sans-serif", fontSize: 14, color: "#191919", outline: "none", boxSizing: "border-box" }}
                        onFocus={(e) => { e.target.style.borderColor = "#0A66C2"; e.target.style.boxShadow = "0 0 0 3px rgba(10,102,194,0.10)"; }}
                        onBlur={(e) => { e.target.style.borderColor = "rgba(0,0,0,0.14)"; e.target.style.boxShadow = "none"; }}
                      />
                    </div>
                  ))}
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: "block", fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#555555", fontWeight: 600, marginBottom: 5 }}>Job Description</label>
                  <textarea
                    value={analyzeForm.job_description}
                    onChange={(e) => setAnalyzeForm((f) => ({ ...f, job_description: e.target.value }))}
                    required
                    placeholder="Paste the full job description here..."
                    style={{ width: "100%", minHeight: 120, padding: "10px 12px", background: "#FAFAFA", border: "1px solid rgba(0,0,0,0.14)", borderRadius: 8, fontFamily: "'Inter', sans-serif", fontSize: 14, color: "#191919", outline: "none", boxSizing: "border-box", resize: "vertical", lineHeight: 1.65 }}
                    onFocus={(e) => { e.target.style.borderColor = "#0A66C2"; e.target.style.boxShadow = "0 0 0 3px rgba(10,102,194,0.10)"; }}
                    onBlur={(e) => { e.target.style.borderColor = "rgba(0,0,0,0.14)"; e.target.style.boxShadow = "none"; }}
                  />
                </div>

                {/* File upload */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#555555", fontWeight: 600, marginBottom: 5 }}>Resume (PDF or DOCX)</label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{ border: `2px dashed ${selectedFile ? "#0A66C2" : "rgba(0,0,0,0.18)"}`, borderRadius: 10, padding: "16px 20px", display: "flex", alignItems: "center", gap: 14, cursor: "pointer", background: selectedFile ? "rgba(10,102,194,0.03)" : "#FAFAFA", transition: "border-color 150ms, background 150ms" }}
                  >
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(10,102,194,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0A66C2" strokeWidth="1.8"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
                    </div>
                    <div>
                      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: "#191919", fontWeight: 600 }}>
                        {selectedFile ? selectedFile.name : "Upload your resume"}
                      </div>
                      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#9CA3AF" }}>
                        {selectedFile ? `${(selectedFile.size / 1024).toFixed(0)} KB` : "PDF or DOCX · Max 10 MB"}
                      </div>
                    </div>
                    {selectedFile && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                        style={{ marginLeft: "auto", background: "none", border: "1px solid rgba(0,0,0,0.12)", borderRadius: 20, padding: "3px 10px", fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#9CA3AF", cursor: "pointer" }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) { setSelectedFile(file); setValidationError(null); }
                    }}
                  />
                </div>

                {/* Feature selector */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#555555", fontWeight: 600, marginBottom: 8 }}>Analysis Type</label>
                  {selectedFeature === "rewriter" && recruiterResult && (
                    <div style={{ padding: "8px 12px", background: "rgba(10,102,194,0.06)", border: "1px solid rgba(10,102,194,0.18)", borderRadius: 8, fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#0A66C2", marginBottom: 8 }}>
                      Using keyword gaps from your Recruiter analysis.
                    </div>
                  )}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
                    {FEATURES.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setSelectedFeature(f.id)}
                        style={{
                          padding: "12px 14px",
                          background: selectedFeature === f.id ? "rgba(10,102,194,0.06)" : "#FAFAFA",
                          border: `1.5px solid ${selectedFeature === f.id ? "#0A66C2" : "rgba(0,0,0,0.10)"}`,
                          borderRadius: 10,
                          cursor: "pointer",
                          textAlign: "left",
                          transition: "border-color 150ms, background 150ms",
                        }}
                      >
                        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 700, color: selectedFeature === f.id ? "#0A66C2" : "#191919", marginBottom: 3 }}>{f.name}</div>
                        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#9CA3AF", lineHeight: 1.5 }}>{f.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!analyzeReady || analyzing}
                  style={{
                    padding: "10px 28px",
                    background: !analyzeReady || analyzing ? "rgba(10,102,194,0.4)" : "#0A66C2",
                    border: "none",
                    borderRadius: 20,
                    color: "#fff",
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: !analyzeReady || analyzing ? "not-allowed" : "pointer",
                    transition: "background 150ms",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  {analyzing
                    ? (<><div style={{ width: 13, height: 13, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 600ms linear infinite" }} />Analyzing...</>)
                    : "Analyze Resume"}
                </button>
              </form>
            </div>

            {/* Result card */}
            {analyzeResult && (
              <div style={{ background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, padding: "24px 28px", boxShadow: "0 1px 8px rgba(0,0,0,0.04)", marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <div>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 4 }}>
                      {featureLabels[analyzeResult.feature]}
                    </div>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#9CA3AF" }}>
                      {analyzeResult.model_used} · {analyzeResult.latency_ms}ms
                    </div>
                  </div>
                  <button
                    onClick={() => setAnalyzeResult(null)}
                    style={{ background: "none", border: "1px solid rgba(0,0,0,0.14)", borderRadius: 20, padding: "5px 14px", cursor: "pointer", fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#555555" }}
                  >
                    Clear
                  </button>
                </div>

                {analyzeResult.feature === "diagnoser" && <DiagnoserCard result={analyzeResult.result as unknown as DiagnoserResult} />}
                {analyzeResult.feature === "recruiter" && <RecruiterCard result={analyzeResult.result as unknown as RecruiterResult} />}
                {analyzeResult.feature === "rewriter" && <RewriterCard result={analyzeResult.result as unknown as RewriterResult} />}
                {analyzeResult.feature === "hiring_manager" && <HiringManagerCard result={analyzeResult.result as unknown as HiringManagerResult} />}
              </div>
            )}

            {/* History panel */}
            <div style={{ background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, boxShadow: "0 1px 8px rgba(0,0,0,0.04)", overflow: "hidden", marginBottom: 16 }}>
              <button
                onClick={handleHistoryExpand}
                style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
              >
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 700, color: "#191919" }}>Previous Analyses</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" style={{ transform: historyExpanded ? "rotate(180deg)" : "none", transition: "transform 150ms" }}><path d="M6 9l6 6 6-6"/></svg>
              </button>

              {historyExpanded && (
                <div style={{ borderTop: "1px solid rgba(0,0,0,0.06)", padding: "12px 16px" }}>
                  {historyLoading ? (
                    <div style={{ display: "flex", justifyContent: "center", padding: 20 }}>
                      <div style={{ width: 16, height: 16, border: "2px solid rgba(10,102,194,0.2)", borderTopColor: "#0A66C2", borderRadius: "50%", animation: "spin 600ms linear infinite" }} />
                    </div>
                  ) : history.length === 0 ? (
                    <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#9CA3AF", textAlign: "center", padding: "16px 0", margin: 0 }}>No previous analyses yet.</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {history.map((item) => (
                        <button
                          key={item.analysis_id}
                          onClick={() => handleHistoryClick(item)}
                          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "#FAFAFA", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 8, cursor: "pointer", textAlign: "left", width: "100%", transition: "border-color 150ms" }}
                          onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(0,0,0,0.18)")}
                          onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(0,0,0,0.08)")}
                        >
                          <div>
                            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600, color: "#191919" }}>
                              {featureLabels[item.feature]}
                            </span>
                            <span style={{ marginLeft: 8, fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#9CA3AF" }}>
                              {item.job_position} · {item.company}
                            </span>
                          </div>
                          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#9CA3AF", flexShrink: 0, marginLeft: 10 }}>
                            {new Date(item.created_at).toLocaleDateString()}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* Past sessions (resume/interview tabs) */}
        {(tab === "resume" || tab === "interview") && sessions.length > 0 && (
          <div style={{ background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, padding: "24px 28px", boxShadow: "0 1px 8px rgba(0,0,0,0.04)" }}>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 16 }}>Past sessions</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {sessions.slice(0, 5).map((s) => (
                <button
                  key={s.id}
                  onClick={() => setActiveSession(s)}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "#FAFAFA", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 8, cursor: "pointer", textAlign: "left", width: "100%", transition: "border-color 150ms" }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(0,0,0,0.18)")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(0,0,0,0.08)")}
                >
                  <div>
                    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600, color: "#191919" }}>
                      {s.type === "resume" ? "Resume review" : "Interview prep"}
                    </span>
                    <span style={{ marginLeft: 10, fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#9CA3AF" }}>{new Date(s.created_at).toLocaleDateString()}</span>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </main>
  );
}
