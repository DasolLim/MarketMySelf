"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  analyzeResume,
  createInterviewSession,
  fetchCoachingHistory,
  fetchProfile,
  generateCoverLetter,
  generateQuestionSet,
  getAnswerHistory,
  getCoverLetter,
  getCoverLetterHistory,
  getDefaultWritingStyle,
  getQuestionSet,
  getQuestionSetHistory,
  getResumeAnalysis,
  getResumeAnalysisHistory,
  submitInterviewAnswer,
  updateInterviewSession,
} from "@/lib/api";
import {
  AnswerFeedbackResponse,
  ClosingQuestion,
  CoachingSession,
  CoverLetterHistoryItem,
  CoverLetterResponse,
  DiagnoserResult,
  FeatureType,
  HiringManagerResult,
  InterviewQuestion,
  InterviewSessionResponse,
  PixelSection,
  QuestionSetHistoryItem,
  QuestionSetResponse,
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

// ── Cover Letter helpers ───────────────────────────────────────────────────────

function relativeDate(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7)  return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return new Date(dateStr).toLocaleDateString();
}

function CoverLetterResultCard({
  result,
  onClear,
}: {
  result: CoverLetterResponse;
  onClear: () => void;
}) {
  const [editedText, setEditedText] = React.useState(result.cover_letter_text);
  const [copied, setCopied]         = React.useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(editedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={{ background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, padding: "24px 28px", boxShadow: "0 1px 8px rgba(0,0,0,0.04)", marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 4 }}>Cover Letter</div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#555555" }}>
            {result.tone_used && <span>{result.tone_used} · </span>}
            {editedText.length.toLocaleString()} chars
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={handleCopy}
            style={{ padding: "6px 16px", background: copied ? "rgba(5,118,66,0.08)" : "#FAFAFA", border: `1px solid ${copied ? "rgba(5,118,66,0.22)" : "rgba(0,0,0,0.14)"}`, borderRadius: 20, fontFamily: "'Inter', sans-serif", fontSize: 12, color: copied ? "#057642" : "#555555", cursor: "pointer", transition: "all 150ms" }}
          >
            {copied ? "Copied ✓" : "Copy ↗"}
          </button>
          <button
            onClick={onClear}
            style={{ padding: "6px 14px", background: "none", border: "1px solid rgba(0,0,0,0.14)", borderRadius: 20, fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#555555", cursor: "pointer" }}
          >
            Clear
          </button>
        </div>
      </div>

      <textarea
        value={editedText}
        onChange={(e) => setEditedText(e.target.value)}
        style={{ width: "100%", minHeight: 260, padding: "16px 18px", background: "#FAFAFA", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 10, fontFamily: "'Inter', sans-serif", fontSize: 14, color: "#191919", lineHeight: 1.8, resize: "vertical", outline: "none", boxSizing: "border-box", marginBottom: result.key_connections.length ? 16 : 0 }}
        onFocus={(e) => { e.target.style.borderColor = "rgba(0,0,0,0.18)"; }}
        onBlur={(e)  => { e.target.style.borderColor = "rgba(0,0,0,0.07)"; }}
      />

      {result.key_connections.length > 0 && (
        <div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 10 }}>Key connections made by AI</div>
          <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 5 }}>
            {result.key_connections.map((c, i) => (
              <li key={i} style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#555555", lineHeight: 1.65 }}>{c}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── Interview Prep components ─────────────────────────────────────────────────

const DIFFICULTY_COLORS: Record<string, { bg: string; color: string }> = {
  warm_up:   { bg: "rgba(5,118,66,0.08)",   color: "#057642" },
  core:      { bg: "rgba(10,102,194,0.08)",  color: "#0A66C2" },
  challenge: { bg: "rgba(239,68,68,0.08)",   color: "#DC2626" },
};
const CATEGORY_COLORS_IP: Record<string, string> = {
  behavioral:   "#0A66C2",
  situational:  "#7C3AED",
  competency:   "#D97706",
  culture_fit:  "#059669",
};
const SHARE_QUALITY_COLORS: Record<string, { color: string }> = {
  weak:     { color: "#DC2626" },
  adequate: { color: "#D97706" },
  strong:   { color: "#057642" },
};
const CLOSING_CATEGORY_LABELS: Record<string, string> = {
  role_clarity:    "Role Clarity",
  team_culture:    "Team & Culture",
  growth_impact:   "Growth & Impact",
  process_tooling: "Process & Tooling",
};

function QuestionCard({ q, index, onStart }: { q: InterviewQuestion; index: number; onStart?: () => void }) {
  const diff = DIFFICULTY_COLORS[q.difficulty] ?? DIFFICULTY_COLORS.core;
  const catColor = CATEGORY_COLORS_IP[q.category] ?? "#555555";
  return (
    <div style={{ padding: "14px 18px", background: "#FAFAFA", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 10 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <span style={{ width: 26, height: 26, borderRadius: "50%", background: "#0A66C2", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, fontFamily: "'Inter', sans-serif", flexShrink: 0, marginTop: 1 }}>{index + 1}</span>
        <div style={{ flex: 1 }}>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 600, color: "#191919", margin: "0 0 8px", lineHeight: 1.55 }}>{q.question}</p>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700, fontFamily: "'Inter', sans-serif", textTransform: "uppercase", letterSpacing: "0.06em", background: diff.bg, color: diff.color }}>{q.difficulty.replace("_", " ")}</span>
            <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 600, fontFamily: "'Inter', sans-serif", background: "rgba(0,0,0,0.04)", color: catColor }}>{q.category.replace("_", " ")}</span>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#9CA3AF" }}>{q.target_skill}</span>
          </div>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#9CA3AF", margin: "8px 0 0", lineHeight: 1.55, fontStyle: "italic" }}>{q.hint}</p>
        </div>
        {onStart && (
          <button onClick={onStart} style={{ flexShrink: 0, padding: "5px 14px", background: "#0A66C2", border: "none", borderRadius: 20, fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 600, color: "#fff", cursor: "pointer", whiteSpace: "nowrap" }}>
            Practice
          </button>
        )}
      </div>
    </div>
  );
}

function ShareBreakdownCard({ breakdown }: { breakdown: AnswerFeedbackResponse["share_breakdown"] }) {
  const bd = breakdown as unknown as Record<string, { present: boolean; quality: string; feedback: string }>;
  const labels: Record<string, string> = { situation: "S — Situation", hindrance: "H — Hindrance", action: "A — Action", result: "R — Result", evaluation: "E — Evaluation" };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {Object.entries(labels).map(([key, label]) => {
        const part = bd[key] ?? { present: false, quality: "weak", feedback: "" };
        const qc = SHARE_QUALITY_COLORS[part.quality] ?? SHARE_QUALITY_COLORS.weak;
        return (
          <div key={key} style={{ padding: "10px 14px", background: "#FAFAFA", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 700, color: "#191919" }}>{label}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {!part.present && <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, color: "#DC2626", fontWeight: 600, textTransform: "uppercase" }}>Missing</span>}
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 700, color: qc.color, textTransform: "uppercase" }}>{part.quality}</span>
              </div>
            </div>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#555555", margin: 0, lineHeight: 1.6 }}>{part.feedback}</p>
          </div>
        );
      })}
    </div>
  );
}

function FeedbackCard({
  feedback,
  onHearImproved,
  ttsPlaying,
}: {
  feedback: AnswerFeedbackResponse;
  onHearImproved: () => void;
  ttsPlaying: boolean;
}) {
  const score = feedback.overall_score ?? 0;
  const scoreColor = score >= 80 ? "#057642" : score >= 55 ? "#D97706" : "#DC2626";
  return (
    <div style={{ background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, padding: "20px 24px", boxShadow: "0 1px 8px rgba(0,0,0,0.04)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ width: 68, height: 68, borderRadius: "50%", border: `4px solid ${scoreColor}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 20, fontWeight: 800, color: scoreColor }}>{score}</span>
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: "#191919", fontWeight: 600, margin: "0 0 4px" }}>{feedback.score_rationale}</p>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#9CA3AF", margin: 0 }}>SHARE score</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        <div style={{ padding: "10px 14px", background: "rgba(5,118,66,0.04)", border: "1px solid rgba(5,118,66,0.12)", borderRadius: 8 }}>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, color: "#057642", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Strongest part</div>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#191919", margin: 0, lineHeight: 1.6 }}>{feedback.strongest_part}</p>
        </div>
        <div style={{ padding: "10px 14px", background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.12)", borderRadius: 8 }}>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, color: "#DC2626", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Critical gap</div>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#191919", margin: 0, lineHeight: 1.6 }}>{feedback.critical_gap}</p>
        </div>
      </div>

      {feedback.one_line_tip && (
        <div style={{ padding: "10px 14px", background: "rgba(10,102,194,0.04)", border: "1px solid rgba(10,102,194,0.12)", borderRadius: 8, marginBottom: 14 }}>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, color: "#0A66C2", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>One-line tip</div>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#191919", fontWeight: 600, margin: 0 }}>{feedback.one_line_tip}</p>
        </div>
      )}

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 8 }}>SHARE Breakdown</div>
        <ShareBreakdownCard breakdown={feedback.share_breakdown} />
      </div>

      <button
        onClick={onHearImproved}
        disabled={ttsPlaying}
        style={{ padding: "8px 20px", background: ttsPlaying ? "rgba(10,102,194,0.4)" : "#0A66C2", border: "none", borderRadius: 20, fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600, color: "#fff", cursor: ttsPlaying ? "not-allowed" : "pointer", display: "inline-flex", alignItems: "center", gap: 8, transition: "background 150ms" }}
      >
        {ttsPlaying
          ? (<><div style={{ width: 11, height: 11, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 600ms linear infinite" }} />Speaking...</>)
          : (<><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>Hear Improved Answer</>)}
      </button>
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

  const [profile, setProfile] = useState<PixelSection | null>(null);
  const [sessions, setSessions] = useState<CoachingSession[]>([]);
  const [fetching, setFetching] = useState(true);
  const [submittingInterview, setSubmittingInterview] = useState(false);
  const [activeSession, setActiveSession] = useState<CoachingSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"cover-letter" | "interview" | "analyze">("cover-letter");

  // Interview Prep — shared state
  const [sharedResumeFile, setSharedResumeFile]     = useState<File | null>(null);
  const sharedResumeFileRef                         = useRef<HTMLInputElement>(null);
  const sharedResumeUploadRef                       = useRef<HTMLDivElement>(null);

  // Interview Prep — tab state
  const [ipSubTab, setIpSubTab] = useState<"generate" | "practice" | "ask-back">("generate");
  const [ipForm, setIpForm] = useState({ job_position: "", company: "", job_description: "", num_questions: 10, interview_stage: "" });
  const [ipGenerating, setIpGenerating] = useState(false);
  const [ipQuestionSet, setIpQuestionSet] = useState<QuestionSetResponse | null>(null);
  const [ipError, setIpError] = useState<string | null>(null);
  const [ipSession, setIpSession] = useState<InterviewSessionResponse | null>(null);
  const [ipCurrentQ, setIpCurrentQ] = useState(0);
  const [ipAnswer, setIpAnswer] = useState("");
  const [ipFeedback, setIpFeedback] = useState<AnswerFeedbackResponse | null>(null);
  const [ipSubmitting, setIpSubmitting] = useState(false);
  const [ipAnsweredMap, setIpAnsweredMap] = useState<Record<number, AnswerFeedbackResponse>>({});
  const [ipTtsPlaying, setIpTtsPlaying] = useState(false);
  const [hintOpen, setHintOpen] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const cameraRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const [ipQHistory, setIpQHistory] = useState<QuestionSetHistoryItem[]>([]);
  const [ipQHistoryExpanded, setIpQHistoryExpanded] = useState(false);
  const [ipQHistoryLoading, setIpQHistoryLoading] = useState(false);

  // Interview Prep — chip input for manual questions
  const [chipInput, setChipInput] = useState("");
  const [manualQuestions, setManualQuestions] = useState<Array<{id: string; question: string}>>([]);
  const [editingChipId, setEditingChipId] = useState<string | null>(null);
  const [editingChipText, setEditingChipText] = useState("");

  // Cover Letter tab state
  const [clForm, setCLForm] = useState({
    job_position: "",
    company: "",
    job_description: "",
    writing_style: "",
    max_characters: 1500,
  });
  const [clFile, setCLFile] = useState<File | null>(null);
  const [clStyleLoaded, setCLStyleLoaded] = useState(false);
  const [clStyleLoading, setCLStyleLoading] = useState(false);
  const [clGenerating, setCLGenerating] = useState(false);
  const [clResult, setCLResult] = useState<CoverLetterResponse | null>(null);
  const [clError, setCLError] = useState<string | null>(null);
  const [clHistory, setCLHistory] = useState<CoverLetterHistoryItem[]>([]);
  const [clHistoryExpanded, setCLHistoryExpanded] = useState(false);
  const [clHistoryLoading, setCLHistoryLoading] = useState(false);
  const clFileRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (tab !== "cover-letter" || clStyleLoaded || !accessToken) return;
    setCLStyleLoading(true);
    getDefaultWritingStyle(accessToken)
      .then((style) => {
        setCLForm((f) => ({ ...f, writing_style: f.writing_style || style }));
        setCLStyleLoaded(true);
      })
      .catch(() => {})
      .finally(() => setCLStyleLoading(false));
  }, [tab, clStyleLoaded, accessToken]);

  async function handleCoverLetterSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken || !clFile) return;
    setCLError(null);
    setCLResult(null);
    setCLGenerating(true);
    try {
      const fd = new FormData();
      fd.append("job_position", clForm.job_position);
      fd.append("company", clForm.company);
      fd.append("job_description", clForm.job_description);
      fd.append("writing_style", clForm.writing_style);
      fd.append("max_characters", String(clForm.max_characters));
      if (clFile) fd.append("resume", clFile);
      const result = await generateCoverLetter(fd, accessToken);
      setCLResult(result);
      setCLHistory([]);
    } catch (err) {
      setCLError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setCLGenerating(false);
    }
  }

  async function handleCLHistoryExpand() {
    if (clHistoryExpanded) { setCLHistoryExpanded(false); return; }
    setCLHistoryExpanded(true);
    if (!accessToken || clHistory.length > 0) return;
    setCLHistoryLoading(true);
    try {
      const h = await getCoverLetterHistory(accessToken);
      setCLHistory(h);
    } catch {
      setCLHistoryExpanded(false);
    } finally {
      setCLHistoryLoading(false);
    }
  }

  async function handleCLHistoryClick(item: CoverLetterHistoryItem) {
    if (!accessToken) return;
    try {
      const res = await getCoverLetter(item.cover_letter_id, accessToken);
      setCLResult(res);
      setCLError(null);
    } catch { /* ignore */ }
  }

  // ── Interview Prep handlers ────────────────────────────────────────────────

  function speakText(text: string) {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 0.95;
    utt.onend = () => setIpTtsPlaying(false);
    utt.onerror = () => setIpTtsPlaying(false);
    setIpTtsPlaying(true);
    window.speechSynthesis.speak(utt);
  }

  function stopCamera() {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current = null;
    }
    setCameraActive(false);
  }

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      cameraStreamRef.current = stream;
      if (cameraRef.current) {
        cameraRef.current.srcObject = stream;
      }
      setCameraActive(true);
    } catch {
      setIpError("Camera access denied. You can still type your answers.");
    }
  }

  async function handleIPGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken) return;
    setIpError(null);
    setIpGenerating(true);
    try {
      const fd = new FormData();
      fd.append("job_position", ipForm.job_position);
      fd.append("company", ipForm.company);
      fd.append("job_description", ipForm.job_description);
      fd.append("num_questions", String(ipForm.num_questions));
      fd.append("interview_stage", ipForm.interview_stage);
      if (sharedResumeFile) fd.append("resume", sharedResumeFile);
      const qs = await generateQuestionSet(fd, accessToken);
      setIpQuestionSet(qs);
      setIpCurrentQ(0);
      setIpAnswer("");
      setIpFeedback(null);
      setIpAnsweredMap({});
      setIpSession(null);
      setIpQHistory([]);
      setManualQuestions([]);
    } catch (err) {
      setIpError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setIpGenerating(false);
    }
  }

  function handleChipKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      const text = chipInput.trim();
      if (!text) return;
      setManualQuestions((prev) => [...prev, { id: crypto.randomUUID(), question: text }]);
      setChipInput("");
    }
  }

  function deleteChip(id: string) {
    setManualQuestions((prev) => prev.filter((c) => c.id !== id));
  }

  function startEditChip(id: string, text: string) {
    setEditingChipId(id);
    setEditingChipText(text);
  }

  function confirmEditChip(id: string) {
    const text = editingChipText.trim();
    if (text) setManualQuestions((prev) => prev.map((c) => c.id === id ? { ...c, question: text } : c));
    setEditingChipId(null);
    setEditingChipText("");
  }

  // Reset hint when question changes
  React.useEffect(() => { setHintOpen(false); }, [ipCurrentQ]);

  function getAllPracticeQuestions(qs: QuestionSetResponse | null): InterviewQuestion[] {
    const aiQs = (qs?.questions ?? []) as InterviewQuestion[];
    const manualQs: InterviewQuestion[] = manualQuestions.map((mq, i) => ({
      id: 9000 + i,
      question: mq.question,
      category: "behavioral" as const,
      target_skill: "General",
      difficulty: "core" as const,
      hint: "",
    }));
    return [...aiQs, ...manualQs];
  }

  async function handleIPStartPractice() {
    if (!accessToken || !ipQuestionSet) return;
    const allQs = getAllPracticeQuestions(ipQuestionSet);
    try {
      const sess = await createInterviewSession(
        {
          question_set_id: ipQuestionSet.question_set_id,
          job_position: ipQuestionSet.job_position,
          company: ipQuestionSet.company,
          questions_total: allQs.length,
        },
        accessToken,
      );
      setIpSession(sess);
    } catch { /* non-fatal */ }
    setIpCurrentQ(0);
    setIpAnswer("");
    setIpFeedback(null);
    setIpAnsweredMap({});
    setIpSubTab("practice");
    const q = allQs[0];
    if (q) setTimeout(() => speakText(q.question), 300);
  }

  async function handleIPSubmitAnswer() {
    if (!accessToken || !ipQuestionSet || !ipAnswer.trim()) return;
    const allQs = getAllPracticeQuestions(ipQuestionSet);
    const q = allQs[ipCurrentQ];
    if (!q) return;
    setIpSubmitting(true);
    setIpFeedback(null);
    try {
      const fb = await submitInterviewAnswer(
        {
          question_set_id: ipQuestionSet.question_set_id,
          question_text: q.question,
          question_category: q.category,
          target_skill: q.target_skill,
          candidate_answer: ipAnswer,
          job_position: ipQuestionSet.job_position,
          company: ipQuestionSet.company,
        },
        accessToken,
      );
      setIpFeedback(fb);
      setIpAnsweredMap((m) => ({ ...m, [ipCurrentQ]: fb }));

      if (ipSession && accessToken) {
        const answered = Object.keys({ ...ipAnsweredMap, [ipCurrentQ]: fb }).length;
        const scores = Object.values({ ...ipAnsweredMap, [ipCurrentQ]: fb }).map((f) => f.overall_score);
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        updateInterviewSession(ipSession.session_id, { questions_answered: answered, avg_score: avg }, accessToken).catch(() => {});
      }
    } catch (err) {
      setIpError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setIpSubmitting(false);
    }
  }

  function handleIPNavigate(dir: "next" | "prev") {
    if (!ipQuestionSet) return;
    const allQs = getAllPracticeQuestions(ipQuestionSet);
    const next = dir === "next"
      ? Math.min(ipCurrentQ + 1, allQs.length - 1)
      : Math.max(ipCurrentQ - 1, 0);
    setIpCurrentQ(next);
    setIpAnswer("");
    setIpFeedback(ipAnsweredMap[next] ?? null);
    const q = allQs[next];
    if (q) setTimeout(() => speakText(q.question), 200);
  }

  async function handleIPQHistoryExpand() {
    if (ipQHistoryExpanded) { setIpQHistoryExpanded(false); return; }
    setIpQHistoryExpanded(true);
    if (!accessToken || ipQHistory.length > 0) return;
    setIpQHistoryLoading(true);
    try {
      const h = await getQuestionSetHistory(accessToken);
      setIpQHistory(h);
    } catch {
      setIpQHistoryExpanded(false);
    } finally {
      setIpQHistoryLoading(false);
    }
  }

  async function handleIPQHistoryClick(item: QuestionSetHistoryItem) {
    if (!accessToken) return;
    try {
      const qs = await getQuestionSet(item.question_set_id, accessToken);
      setIpQuestionSet(qs);
      setIpCurrentQ(0);
      setIpAnswer("");
      setIpFeedback(null);
      setIpAnsweredMap({});
      setIpSession(null);
    } catch { /* ignore */ }
  }

  // Clean up camera on unmount or tab change
  React.useEffect(() => {
    if (tab !== "interview") stopCamera();
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const clReady =
    clForm.job_position.trim() &&
    clForm.company.trim() &&
    clForm.job_description.trim() &&
    !!clFile;

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
          {(["cover-letter", "interview", "analyze"] as const).map((t) => (
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
              {t === "cover-letter" ? "Cover Letter" : t === "interview" ? "Interview Prep" : "AI Analyze"}
            </button>
          ))}
        </div>

        {error && (
          <div style={{ padding: "12px 16px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.22)", borderRadius: 10, fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#DC2626", marginBottom: 16 }}>{error}</div>
        )}

        {/* Cover Letter tab */}
        {tab === "cover-letter" && (
          <>
            <div style={{ background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, padding: "24px 28px", boxShadow: "0 1px 8px rgba(0,0,0,0.04)", marginBottom: 16 }}>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 20 }}>Generate cover letter</div>

              {clError && (
                <div style={{ padding: "12px 16px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.22)", borderRadius: 10, fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#DC2626", marginBottom: 16 }}>
                  {clError}
                </div>
              )}

              <form onSubmit={handleCoverLetterSubmit}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                  {(["job_position", "company"] as const).map((field) => (
                    <div key={field}>
                      <label style={{ display: "block", fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#555555", fontWeight: 600, marginBottom: 5 }}>
                        {field === "job_position" ? "Job Position *" : "Company *"}
                      </label>
                      <input
                        type="text"
                        value={clForm[field]}
                        onChange={(e) => setCLForm((f) => ({ ...f, [field]: e.target.value }))}
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
                  <label style={{ display: "block", fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#555555", fontWeight: 600, marginBottom: 5 }}>Job Description *</label>
                  <textarea
                    value={clForm.job_description}
                    onChange={(e) => setCLForm((f) => ({ ...f, job_description: e.target.value }))}
                    required
                    placeholder="Paste the full job description here..."
                    style={{ width: "100%", minHeight: 120, padding: "10px 12px", background: "#FAFAFA", border: "1px solid rgba(0,0,0,0.14)", borderRadius: 8, fontFamily: "'Inter', sans-serif", fontSize: 14, color: "#191919", outline: "none", boxSizing: "border-box", resize: "vertical", lineHeight: 1.65 }}
                    onFocus={(e) => { e.target.style.borderColor = "#0A66C2"; e.target.style.boxShadow = "0 0 0 3px rgba(10,102,194,0.10)"; }}
                    onBlur={(e) => { e.target.style.borderColor = "rgba(0,0,0,0.14)"; e.target.style.boxShadow = "none"; }}
                  />
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: "block", fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#555555", fontWeight: 600, marginBottom: 5 }}>
                    Resume (PDF or DOCX) <span style={{ color: "#DC2626" }}>*</span>
                  </label>
                  <div
                    onClick={() => clFileRef.current?.click()}
                    style={{ border: `2px dashed ${clFile ? "#0A66C2" : "rgba(0,0,0,0.18)"}`, borderRadius: 10, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", background: clFile ? "rgba(10,102,194,0.03)" : "#FAFAFA", transition: "border-color 150ms, background 150ms" }}
                  >
                    <div style={{ width: 34, height: 34, borderRadius: 8, background: "rgba(10,102,194,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0A66C2" strokeWidth="1.8"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#191919", fontWeight: 600 }}>
                        {clFile ? clFile.name : "Upload your resume"}
                      </div>
                      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#9CA3AF" }}>
                        {clFile ? `${(clFile.size / 1024).toFixed(0)} KB` : "PDF or DOCX · Max 10 MB"}
                      </div>
                    </div>
                    {clFile && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setCLFile(null); if (clFileRef.current) clFileRef.current.value = ""; }}
                        style={{ background: "none", border: "1px solid rgba(0,0,0,0.12)", borderRadius: 20, padding: "3px 10px", fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#9CA3AF", cursor: "pointer" }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <input
                    ref={clFileRef}
                    type="file"
                    accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    style={{ display: "none" }}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) { setCLFile(f); setCLError(null); } }}
                  />
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: "block", fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#555555", fontWeight: 600, marginBottom: 5 }}>Writing Style</label>
                  <textarea
                    value={clStyleLoading ? "" : clForm.writing_style}
                    onChange={(e) => setCLForm((f) => ({ ...f, writing_style: e.target.value }))}
                    rows={4}
                    placeholder={clStyleLoading ? "Loading default style…" : "Describe the tone and style…"}
                    style={{ width: "100%", padding: "10px 12px", background: "#FAFAFA", border: "1px solid rgba(0,0,0,0.14)", borderRadius: 8, fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#191919", outline: "none", boxSizing: "border-box", resize: "vertical", lineHeight: 1.65, opacity: clStyleLoading ? 0.5 : 1 }}
                    onFocus={(e) => { e.target.style.borderColor = "#0A66C2"; e.target.style.boxShadow = "0 0 0 3px rgba(10,102,194,0.10)"; }}
                    onBlur={(e) => { e.target.style.borderColor = "rgba(0,0,0,0.14)"; e.target.style.boxShadow = "none"; }}
                  />
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#9CA3AF", marginTop: 4 }}>Customise the tone and style of your letter</div>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <label style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#555555", fontWeight: 600 }}>Max Length</label>
                    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#0A66C2", fontWeight: 600 }}>
                      {clResult
                        ? `Generated: ${clResult.character_count.toLocaleString()} / ${clForm.max_characters.toLocaleString()} chars`
                        : `Max: ${clForm.max_characters.toLocaleString()} characters`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={500}
                    max={3000}
                    step={100}
                    value={clForm.max_characters}
                    onChange={(e) => setCLForm((f) => ({ ...f, max_characters: Number(e.target.value) }))}
                    style={{ width: "100%", accentColor: "#0A66C2" }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#9CA3AF", marginTop: 3 }}>
                    <span>500</span><span>3,000</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!clReady || clGenerating}
                  style={{ padding: "10px 28px", background: !clReady || clGenerating ? "rgba(10,102,194,0.4)" : "#0A66C2", border: "none", borderRadius: 20, color: "#fff", fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 14, cursor: !clReady || clGenerating ? "not-allowed" : "pointer", transition: "background 150ms", display: "inline-flex", alignItems: "center", gap: 8 }}>
                  {clGenerating
                    ? (<><div style={{ width: 13, height: 13, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 600ms linear infinite" }} />Generating...</>)
                    : "Generate Cover Letter"}
                </button>
              </form>
            </div>

            {clResult && (
              <CoverLetterResultCard result={clResult} onClear={() => setCLResult(null)} />
            )}

            <div style={{ background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, boxShadow: "0 1px 8px rgba(0,0,0,0.04)", overflow: "hidden", marginBottom: 16 }}>
              <button
                onClick={handleCLHistoryExpand}
                style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
              >
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 700, color: "#191919" }}>Previous Cover Letters</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" style={{ transform: clHistoryExpanded ? "rotate(180deg)" : "none", transition: "transform 150ms" }}><path d="M6 9l6 6 6-6"/></svg>
              </button>
              {clHistoryExpanded && (
                <div style={{ borderTop: "1px solid rgba(0,0,0,0.06)", padding: "12px 16px" }}>
                  {clHistoryLoading ? (
                    <div style={{ display: "flex", justifyContent: "center", padding: 20 }}>
                      <div style={{ width: 16, height: 16, border: "2px solid rgba(10,102,194,0.2)", borderTopColor: "#0A66C2", borderRadius: "50%", animation: "spin 600ms linear infinite" }} />
                    </div>
                  ) : clHistory.length === 0 ? (
                    <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#9CA3AF", textAlign: "center", padding: "16px 0", margin: 0 }}>No cover letters yet. Generate your first one above.</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {clHistory.map((item) => (
                        <button
                          key={item.cover_letter_id}
                          onClick={() => handleCLHistoryClick(item)}
                          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "#FAFAFA", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 8, cursor: "pointer", textAlign: "left", width: "100%", transition: "border-color 150ms" }}
                          onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(0,0,0,0.18)")}
                          onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(0,0,0,0.08)")}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600, color: "#191919", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {item.job_position}
                            </span>
                            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#9CA3AF", flexShrink: 0 }}>· {item.company}</span>
                            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#9CA3AF", flexShrink: 0 }}>{item.character_count.toLocaleString()} chars</span>
                          </div>
                          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#9CA3AF", flexShrink: 0, marginLeft: 10 }}>
                            {relativeDate(item.created_at)}
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

        {/* Interview Prep tab */}
        {tab === "interview" && (
          <>
            {/* Shared resume upload — above sub-tabs */}
            <div ref={sharedResumeUploadRef} id="shared-resume-upload" style={{ background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, padding: "16px 20px", boxShadow: "0 1px 8px rgba(0,0,0,0.04)", marginBottom: 14 }}>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 10 }}>Your Resume (optional)</div>
              <div
                onClick={() => sharedResumeFileRef.current?.click()}
                style={{ border: `2px dashed ${sharedResumeFile ? "#0A66C2" : "rgba(0,0,0,0.16)"}`, borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", background: sharedResumeFile ? "rgba(10,102,194,0.03)" : "#FAFAFA", transition: "border-color 150ms" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0A66C2" strokeWidth="1.8"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: sharedResumeFile ? "#191919" : "#9CA3AF", flex: 1 }}>
                  {sharedResumeFile ? sharedResumeFile.name : "Upload your resume for more targeted questions (PDF or DOCX)"}
                </span>
                {sharedResumeFile && (
                  <button type="button" onClick={(e) => { e.stopPropagation(); setSharedResumeFile(null); if (sharedResumeFileRef.current) sharedResumeFileRef.current.value = ""; }} style={{ background: "none", border: "1px solid rgba(0,0,0,0.12)", borderRadius: 20, padding: "2px 8px", fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#9CA3AF", cursor: "pointer" }}>Remove</button>
                )}
              </div>
              <input ref={sharedResumeFileRef} type="file" accept=".pdf,.docx" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) { setSharedResumeFile(f); setIpError(null); } }} />
            </div>

            {/* Sub-tab navigation */}
            <div style={{ display: "flex", gap: 0, marginBottom: 16, background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 10, overflow: "hidden" }}>
              {(["generate", "practice", "ask-back"] as const).map((st) => {
                const labels = { generate: "Question Bank", practice: "Mock Interview", "ask-back": "Questions to Ask" };
                const active = ipSubTab === st;
                return (
                  <button
                    key={st}
                    onClick={() => setIpSubTab(st)}
                    style={{ flex: 1, padding: "10px 12px", background: active ? "rgba(10,102,194,0.08)" : "transparent", border: "none", borderBottom: `2px solid ${active ? "#0A66C2" : "transparent"}`, color: active ? "#0A66C2" : "#555555", fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13, cursor: "pointer", transition: "all 150ms" }}
                  >
                    {labels[st]}
                  </button>
                );
              })}
            </div>

            {ipError && (
              <div style={{ padding: "12px 16px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.22)", borderRadius: 10, fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#DC2626", marginBottom: 14 }}>{ipError}</div>
            )}

            {/* Section A: Question Bank */}
            {ipSubTab === "generate" && (
              <>
                <div style={{ background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, padding: "24px 28px", boxShadow: "0 1px 8px rgba(0,0,0,0.04)", marginBottom: 14 }}>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 20 }}>Generate tailored questions</div>
                  <form onSubmit={handleIPGenerate}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                      {(["job_position", "company"] as const).map((field) => (
                        <div key={field}>
                          <label style={{ display: "block", fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#555555", fontWeight: 600, marginBottom: 5 }}>
                            {field === "job_position" ? "Job Position *" : "Company *"}
                          </label>
                          <input
                            type="text"
                            value={ipForm[field]}
                            onChange={(e) => setIpForm((f) => ({ ...f, [field]: e.target.value }))}
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
                      <label style={{ display: "block", fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#555555", fontWeight: 600, marginBottom: 5 }}>Interview Stage</label>
                      <input
                        type="text"
                        value={ipForm.interview_stage}
                        onChange={(e) => setIpForm((f) => ({ ...f, interview_stage: e.target.value }))}
                        placeholder="e.g. Phone screen, Final round, Technical interview"
                        style={{ width: "100%", padding: "10px 12px", background: "#FAFAFA", border: "1px solid rgba(0,0,0,0.14)", borderRadius: 8, fontFamily: "'Inter', sans-serif", fontSize: 14, color: "#191919", outline: "none", boxSizing: "border-box" }}
                        onFocus={(e) => { e.target.style.borderColor = "#0A66C2"; e.target.style.boxShadow = "0 0 0 3px rgba(10,102,194,0.10)"; }}
                        onBlur={(e) => { e.target.style.borderColor = "rgba(0,0,0,0.14)"; e.target.style.boxShadow = "none"; }}
                      />
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <label style={{ display: "block", fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#555555", fontWeight: 600, marginBottom: 5 }}>Job Description *</label>
                      <textarea
                        value={ipForm.job_description}
                        onChange={(e) => setIpForm((f) => ({ ...f, job_description: e.target.value }))}
                        required
                        placeholder="Paste the full job description to get role-specific questions..."
                        style={{ width: "100%", minHeight: 110, padding: "10px 12px", background: "#FAFAFA", border: "1px solid rgba(0,0,0,0.14)", borderRadius: 8, fontFamily: "'Inter', sans-serif", fontSize: 14, color: "#191919", outline: "none", boxSizing: "border-box", resize: "vertical", lineHeight: 1.65 }}
                        onFocus={(e) => { e.target.style.borderColor = "#0A66C2"; e.target.style.boxShadow = "0 0 0 3px rgba(10,102,194,0.10)"; }}
                        onBlur={(e) => { e.target.style.borderColor = "rgba(0,0,0,0.14)"; e.target.style.boxShadow = "none"; }}
                      />
                    </div>

                    <div style={{ marginBottom: 20 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <label style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#555555", fontWeight: 600 }}>Number of AI Questions</label>
                        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#0A66C2", fontWeight: 700 }}>{ipForm.num_questions}</span>
                      </div>
                      <input type="range" min={5} max={20} step={1} value={ipForm.num_questions} onChange={(e) => setIpForm((f) => ({ ...f, num_questions: Number(e.target.value) }))} style={{ width: "100%", accentColor: "#0A66C2" }} />
                      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#9CA3AF", marginTop: 3 }}>
                        <span>5 (quick)</span><span>20 (full prep)</span>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={!ipForm.job_position.trim() || !ipForm.company.trim() || !ipForm.job_description.trim() || ipGenerating}
                      style={{ padding: "10px 28px", background: ipGenerating ? "rgba(10,102,194,0.4)" : "#0A66C2", border: "none", borderRadius: 20, color: "#fff", fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 14, cursor: ipGenerating ? "not-allowed" : "pointer", display: "inline-flex", alignItems: "center", gap: 8, transition: "background 150ms" }}
                    >
                      {ipGenerating ? (<><div style={{ width: 13, height: 13, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 600ms linear infinite" }} />Generating...</>) : "Generate Questions"}
                    </button>
                  </form>

                  {/* Manual question chip input */}
                  <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid rgba(0,0,0,0.07)" }}>
                    <label style={{ display: "block", fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#555555", fontWeight: 600, marginBottom: 5 }}>Add Your Own Questions</label>
                    <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#9CA3AF", margin: "0 0 10px", lineHeight: 1.55 }}>Press Enter to add. Click a chip to edit, × to remove.</p>
                    {manualQuestions.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                        {manualQuestions.map((mq) => (
                          <div key={mq.id} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", background: "rgba(10,102,194,0.06)", border: "1px solid rgba(10,102,194,0.18)", borderRadius: 20, maxWidth: 320 }}>
                            {editingChipId === mq.id ? (
                              <input
                                autoFocus
                                value={editingChipText}
                                onChange={(e) => setEditingChipText(e.target.value)}
                                onBlur={() => confirmEditChip(mq.id)}
                                onKeyDown={(e) => { if (e.key === "Enter") confirmEditChip(mq.id); if (e.key === "Escape") { setEditingChipId(null); setEditingChipText(""); } }}
                                style={{ border: "none", outline: "none", background: "transparent", fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#0A66C2", width: 180 }}
                              />
                            ) : (
                              <span
                                onClick={() => startEditChip(mq.id, mq.question)}
                                style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#0A66C2", cursor: "text", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 260 }}
                                title={mq.question}
                              >
                                {mq.question}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => deleteChip(mq.id)}
                              style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", lineHeight: 1, padding: 0, fontSize: 14, flexShrink: 0 }}
                            >×</button>
                          </div>
                        ))}
                      </div>
                    )}
                    {((ipQuestionSet?.questions.length ?? 0) + manualQuestions.length) > 20 && (
                      <div style={{ padding: "8px 12px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.22)", borderRadius: 8, fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#D97706", marginBottom: 8 }}>
                        You have more than 20 practice questions. Consider removing some for a focused session.
                      </div>
                    )}
                    <textarea
                      value={chipInput}
                      onChange={(e) => setChipInput(e.target.value)}
                      onKeyDown={handleChipKeyDown}
                      placeholder="Type a question and press Enter to add..."
                      rows={2}
                      style={{ width: "100%", padding: "10px 12px", background: "#FAFAFA", border: "1px solid rgba(0,0,0,0.14)", borderRadius: 8, fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#191919", outline: "none", boxSizing: "border-box", resize: "none", lineHeight: 1.55 }}
                      onFocus={(e) => { e.target.style.borderColor = "#0A66C2"; e.target.style.boxShadow = "0 0 0 3px rgba(10,102,194,0.10)"; }}
                      onBlur={(e) => { e.target.style.borderColor = "rgba(0,0,0,0.14)"; e.target.style.boxShadow = "none"; }}
                    />
                  </div>
                </div>

                {/* Question set result */}
                {ipQuestionSet && (
                  <div style={{ background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, padding: "24px 28px", boxShadow: "0 1px 8px rgba(0,0,0,0.04)", marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
                      <div>
                        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 700, color: "#191919" }}>{ipQuestionSet.job_position} at {ipQuestionSet.company}</div>
                        {ipQuestionSet.interview_stage && (
                          <span style={{ display: "inline-block", marginTop: 4, padding: "2px 8px", background: "rgba(10,102,194,0.06)", border: "1px solid rgba(10,102,194,0.16)", borderRadius: 20, fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#0A66C2", fontWeight: 500 }}>{ipQuestionSet.interview_stage}</span>
                        )}
                        {ipQuestionSet.role_summary && (
                          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#555555", margin: "6px 0 0", lineHeight: 1.6 }}>{ipQuestionSet.role_summary}</p>
                        )}
                        {ipQuestionSet.interview_stage_note && (
                          <div style={{ marginTop: 8, padding: "8px 12px", background: "rgba(10,102,194,0.04)", border: "1px solid rgba(10,102,194,0.12)", borderRadius: 8 }}>
                            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#0A66C2", margin: 0, lineHeight: 1.6 }}>{ipQuestionSet.interview_stage_note}</p>
                          </div>
                        )}
                        {ipQuestionSet.research_sources && ipQuestionSet.research_sources.length > 0 && (
                          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#9CA3AF", margin: "6px 0 0" }}>
                            Sources: {ipQuestionSet.research_sources.slice(0, 3).join(", ")}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={handleIPStartPractice}
                        style={{ padding: "8px 20px", background: "#0A66C2", border: "none", borderRadius: 20, fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer", whiteSpace: "nowrap" }}
                      >
                        Start Mock Interview →
                      </button>
                    </div>

                    {ipQuestionSet.key_themes.length > 0 && (
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
                        {ipQuestionSet.key_themes.map((t, i) => (
                          <span key={i} style={{ padding: "3px 10px", background: "rgba(10,102,194,0.06)", border: "1px solid rgba(10,102,194,0.16)", borderRadius: 20, fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#0A66C2", fontWeight: 500 }}>{t}</span>
                        ))}
                      </div>
                    )}

                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 10 }}>
                      {ipQuestionSet.questions.length} AI Questions
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {(ipQuestionSet.questions as InterviewQuestion[]).map((q, i) => (
                        <QuestionCard key={i} q={q} index={i} onStart={() => { setIpCurrentQ(i); handleIPStartPractice(); }} />
                      ))}
                    </div>
                  </div>
                )}

                {/* History */}
                <div style={{ background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, boxShadow: "0 1px 8px rgba(0,0,0,0.04)", overflow: "hidden", marginBottom: 14 }}>
                  <button onClick={handleIPQHistoryExpand} style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
                    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 700, color: "#191919" }}>Previous Question Sets</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" style={{ transform: ipQHistoryExpanded ? "rotate(180deg)" : "none", transition: "transform 150ms" }}><path d="M6 9l6 6 6-6"/></svg>
                  </button>
                  {ipQHistoryExpanded && (
                    <div style={{ borderTop: "1px solid rgba(0,0,0,0.06)", padding: "12px 16px" }}>
                      {ipQHistoryLoading ? (
                        <div style={{ display: "flex", justifyContent: "center", padding: 20 }}><div style={{ width: 16, height: 16, border: "2px solid rgba(10,102,194,0.2)", borderTopColor: "#0A66C2", borderRadius: "50%", animation: "spin 600ms linear infinite" }} /></div>
                      ) : ipQHistory.length === 0 ? (
                        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#9CA3AF", textAlign: "center", padding: "16px 0", margin: 0 }}>No question sets yet.</p>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {ipQHistory.map((item) => (
                            <button key={item.question_set_id} onClick={() => handleIPQHistoryClick(item)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "#FAFAFA", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 8, cursor: "pointer", textAlign: "left", width: "100%", transition: "border-color 150ms" }} onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(0,0,0,0.18)")} onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(0,0,0,0.08)")}>
                              <div>
                                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600, color: "#191919" }}>{item.job_position}</span>
                                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#9CA3AF", marginLeft: 8 }}>· {item.company}</span>
                                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#9CA3AF", marginLeft: 8 }}>{item.num_questions} questions</span>
                              </div>
                              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#9CA3AF", flexShrink: 0, marginLeft: 10 }}>{relativeDate(item.created_at)}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Section B: Mock Interview Room */}
            {ipSubTab === "practice" && (
              <>
                {!ipQuestionSet ? (
                  <div style={{ background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, padding: "40px 28px", textAlign: "center", boxShadow: "0 1px 8px rgba(0,0,0,0.04)" }}>
                    <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: "#9CA3AF", margin: "0 0 16px" }}>Generate a question set first to start practicing.</p>
                    <button onClick={() => setIpSubTab("generate")} style={{ padding: "8px 20px", background: "#0A66C2", border: "none", borderRadius: 20, fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer" }}>Go to Question Bank</button>
                  </div>
                ) : (() => {
                  const allQs = getAllPracticeQuestions(ipQuestionSet);
                  const q = allQs[ipCurrentQ] as InterviewQuestion | undefined;
                  const diff = q ? (DIFFICULTY_COLORS[q.difficulty] ?? DIFFICULTY_COLORS.core) : DIFFICULTY_COLORS.core;
                  const initials = profile?.full_name
                    ? profile.full_name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()
                    : "?";
                  return (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
                      {/* Room header */}
                      <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#9CA3AF" }}>
                            Question {ipCurrentQ + 1} of {allQs.length}
                          </span>
                          {ipSession && (
                            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#0A66C2" }}>
                              · {Object.keys(ipAnsweredMap).length} answered
                            </span>
                          )}
                          {ipQuestionSet.interview_stage && (
                            <span style={{ padding: "2px 8px", background: "rgba(10,102,194,0.06)", border: "1px solid rgba(10,102,194,0.16)", borderRadius: 20, fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#0A66C2", fontWeight: 500 }}>
                              {ipQuestionSet.interview_stage}
                            </span>
                          )}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          {sharedResumeFile ? (
                            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#057642", display: "inline-flex", alignItems: "center", gap: 4 }}>
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#057642" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                              {sharedResumeFile.name}
                              <button type="button" onClick={() => sharedResumeUploadRef.current?.scrollIntoView({ behavior: "smooth" })} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#0A66C2", padding: 0 }}>Change</button>
                            </span>
                          ) : (
                            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#9CA3AF" }}>
                              No resume —{" "}
                              <button type="button" onClick={() => { setIpSubTab("generate"); setTimeout(() => sharedResumeUploadRef.current?.scrollIntoView({ behavior: "smooth" }), 100); }} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#0A66C2", padding: 0 }}>Upload</button>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Camera — centered, max 720px, 16:9, mirrored */}
                      <div style={{ width: "100%", maxWidth: 720, background: "#000", borderRadius: 12, overflow: "hidden", aspectRatio: "16 / 9", position: "relative" }}>
                        {cameraActive ? (
                          <video ref={cameraRef} autoPlay muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }} />
                        ) : (
                          <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, background: "#111827" }}>
                            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(10,102,194,0.2)", border: "2px solid rgba(10,102,194,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 22, fontWeight: 700, color: "#0A66C2" }}>{initials}</span>
                            </div>
                            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#6B7280" }}>Camera off</span>
                          </div>
                        )}
                      </div>

                      {/* Camera controls */}
                      <div style={{ display: "flex", gap: 8 }}>
                        {!cameraActive ? (
                          <button onClick={startCamera} style={{ padding: "7px 18px", background: "none", border: "1px solid rgba(0,0,0,0.12)", borderRadius: 20, fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#555555", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="15" height="10" rx="2"/><path d="M17 12l5-3v6l-5-3z"/></svg>
                            Turn on Camera
                          </button>
                        ) : (
                          <button onClick={stopCamera} style={{ padding: "7px 18px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.22)", borderRadius: 20, fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#DC2626", cursor: "pointer" }}>Stop Camera</button>
                        )}
                        <button
                          onClick={() => { if (q) speakText(q.question); }}
                          disabled={ipTtsPlaying || !q}
                          style={{ padding: "7px 18px", background: "none", border: "1px solid rgba(0,0,0,0.12)", borderRadius: 20, fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#555555", cursor: ipTtsPlaying || !q ? "not-allowed" : "pointer", display: "inline-flex", alignItems: "center", gap: 5 }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                          Read aloud
                        </button>
                      </div>

                      {/* Question card */}
                      <div style={{ width: "100%", background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, padding: "20px 24px", boxShadow: "0 1px 8px rgba(0,0,0,0.04)" }}>
                        <div style={{ height: 3, background: "rgba(0,0,0,0.06)", borderRadius: 3, marginBottom: 16, overflow: "hidden" }}>
                          <div style={{ height: "100%", background: "#0A66C2", borderRadius: 3, width: `${((ipCurrentQ + 1) / allQs.length) * 100}%`, transition: "width 0.3s ease" }} />
                        </div>

                        {q && (
                          <>
                            <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
                              <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700, fontFamily: "'Inter', sans-serif", textTransform: "uppercase", letterSpacing: "0.06em", background: diff.bg, color: diff.color }}>{q.difficulty.replace("_", " ")}</span>
                              <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 600, fontFamily: "'Inter', sans-serif", background: "rgba(0,0,0,0.04)", color: CATEGORY_COLORS_IP[q.category] ?? "#555" }}>{q.category.replace("_", " ")}</span>
                              {!!ipAnsweredMap[ipCurrentQ] && <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700, fontFamily: "'Inter', sans-serif", background: "rgba(5,118,66,0.08)", color: "#057642" }}>Answered ✓</span>}
                            </div>
                            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 16, fontWeight: 700, color: "#191919", margin: "0 0 10px", lineHeight: 1.5 }}>{q.question}</p>
                            {q.hint && (
                              <div style={{ marginBottom: 14 }}>
                                <button
                                  type="button"
                                  onClick={() => setHintOpen((v) => !v)}
                                  style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#9CA3AF", display: "inline-flex", alignItems: "center", gap: 4, padding: 0 }}
                                >
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: hintOpen ? "rotate(180deg)" : "none", transition: "transform 150ms" }}><path d="M6 9l6 6 6-6"/></svg>
                                  {hintOpen ? "Hide hint" : "Show hint"}
                                </button>
                                {hintOpen && (
                                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#9CA3AF", margin: "6px 0 0", fontStyle: "italic", lineHeight: 1.6 }}>{q.hint}</p>
                                )}
                              </div>
                            )}
                          </>
                        )}

                        <textarea
                          value={ipAnswer}
                          onChange={(e) => setIpAnswer(e.target.value)}
                          placeholder="Type your answer here using the SHARE framework: Situation → Hindrance → Action → Result → Evaluation"
                          style={{ width: "100%", minHeight: 130, padding: "12px 14px", background: "#FAFAFA", border: "1px solid rgba(0,0,0,0.12)", borderRadius: 10, fontFamily: "'Inter', sans-serif", fontSize: 14, color: "#191919", lineHeight: 1.75, outline: "none", boxSizing: "border-box", resize: "vertical" }}
                          onFocus={(e) => { e.target.style.borderColor = "#0A66C2"; e.target.style.boxShadow = "0 0 0 3px rgba(10,102,194,0.10)"; }}
                          onBlur={(e) => { e.target.style.borderColor = "rgba(0,0,0,0.12)"; e.target.style.boxShadow = "none"; }}
                        />

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14 }}>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              onClick={() => handleIPNavigate("prev")}
                              disabled={ipCurrentQ === 0}
                              style={{ padding: "7px 16px", background: "none", border: "1px solid rgba(0,0,0,0.12)", borderRadius: 20, fontFamily: "'Inter', sans-serif", fontSize: 13, color: ipCurrentQ === 0 ? "#D1D5DB" : "#555555", cursor: ipCurrentQ === 0 ? "not-allowed" : "pointer" }}
                            >← Prev</button>
                            <button
                              onClick={() => handleIPNavigate("next")}
                              disabled={ipCurrentQ === allQs.length - 1}
                              style={{ padding: "7px 16px", background: "none", border: "1px solid rgba(0,0,0,0.12)", borderRadius: 20, fontFamily: "'Inter', sans-serif", fontSize: 13, color: ipCurrentQ === allQs.length - 1 ? "#D1D5DB" : "#555555", cursor: ipCurrentQ === allQs.length - 1 ? "not-allowed" : "pointer" }}
                            >Next →</button>
                          </div>
                          <button
                            onClick={handleIPSubmitAnswer}
                            disabled={!ipAnswer.trim() || ipSubmitting}
                            style={{ padding: "8px 22px", background: !ipAnswer.trim() || ipSubmitting ? "rgba(10,102,194,0.4)" : "#0A66C2", border: "none", borderRadius: 20, fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600, color: "#fff", cursor: !ipAnswer.trim() || ipSubmitting ? "not-allowed" : "pointer", display: "inline-flex", alignItems: "center", gap: 8, transition: "background 150ms" }}
                          >
                            {ipSubmitting ? (<><div style={{ width: 11, height: 11, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 600ms linear infinite" }} />Evaluating...</>) : "Get Feedback"}
                          </button>
                        </div>
                      </div>

                      {/* Answer Coach */}
                      {(ipFeedback || ipAnsweredMap[ipCurrentQ]) && (
                        <div style={{ width: "100%" }}>
                          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 10 }}>Answer Coach</div>
                          <FeedbackCard
                            feedback={ipFeedback ?? ipAnsweredMap[ipCurrentQ]}
                            onHearImproved={() => {
                              const fb = ipFeedback ?? ipAnsweredMap[ipCurrentQ];
                              if (fb.improved_answer) speakText(fb.improved_answer);
                            }}
                            ttsPlaying={ipTtsPlaying}
                          />
                        </div>
                      )}
                    </div>
                  );
                })()}
              </>
            )}

            {/* Section C: Questions to Ask */}
            {ipSubTab === "ask-back" && (
              <div style={{ background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, padding: "24px 28px", boxShadow: "0 1px 8px rgba(0,0,0,0.04)" }}>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 6 }}>Questions to ask the interviewer</div>
                {!ipQuestionSet ? (
                  <div style={{ textAlign: "center", padding: "32px 0" }}>
                    <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: "#9CA3AF", margin: "0 0 14px" }}>Generate a question set first to see tailored closing questions.</p>
                    <button onClick={() => setIpSubTab("generate")} style={{ padding: "7px 18px", background: "#0A66C2", border: "none", borderRadius: 20, fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer" }}>Generate Questions</button>
                  </div>
                ) : (
                  <>
                    <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#555555", margin: "0 0 18px", lineHeight: 1.65 }}>
                      For <strong>{ipQuestionSet.job_position}</strong> at <strong>{ipQuestionSet.company}</strong>. These show genuine interest and strategic thinking.
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {(ipQuestionSet.closing_questions as ClosingQuestion[]).map((q, i) => (
                        <div key={i} style={{ padding: "14px 18px", background: "#FAFAFA", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 10 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 6 }}>
                            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 600, color: "#191919", margin: 0, lineHeight: 1.5, flex: 1 }}>{q.question}</p>
                            <span style={{ padding: "2px 9px", borderRadius: 20, fontSize: 10, fontWeight: 600, fontFamily: "'Inter', sans-serif", background: "rgba(10,102,194,0.06)", color: "#0A66C2", flexShrink: 0, whiteSpace: "nowrap" }}>{CLOSING_CATEGORY_LABELS[q.category] ?? q.category}</span>
                          </div>
                          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#9CA3AF", margin: 0, lineHeight: 1.55, fontStyle: "italic" }}>{q.why_ask}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </>
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

      </div>
      <style>{`@keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </main>
  );
}
