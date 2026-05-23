"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { getScrapedJobById } from "@/lib/api";
import { ScrapedJobDetail, WORK_TYPE_LABELS, EXP_LEVEL_LABELS, EMPLOYMENT_TYPE_LABELS } from "@/types";
import { formatSalary, formatRelativeDate, formatSource } from "@/lib/job-utils";
import { useEffect, useState } from "react";

// ── Description parser ────────────────────────────────────────────────────────

type Block =
  | { kind: "heading"; text: string }
  | { kind: "para"; text: string }
  | { kind: "list"; items: string[] };

function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<p[^>]*>/gi, "")
    .replace(/<\/div>/gi, "\n")
    .replace(/<div[^>]*>/gi, "")
    .replace(/<\/li>/gi, "")
    .replace(/<li[^>]*>/gi, "\n• ")
    .replace(/<\/[uo]l>/gi, "\n")
    .replace(/<[uo]l[^>]*>/gi, "")
    .replace(/<\/h[1-6]>/gi, "\n")
    .replace(/<h[1-6][^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/ /g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const SECTION_KEYWORDS = [
  "about the role", "about this role", "about the job", "about the position",
  "about you", "about us", "about the company", "about the team",
  "the role", "your role", "the position", "job summary", "summary", "overview",
  "responsibilities", "key responsibilities", "your responsibilities", "duties", "key duties",
  "what you'll do", "what you will do", "what you'd do", "role overview",
  "requirements", "key requirements", "minimum requirements", "basic requirements",
  "qualifications", "minimum qualifications", "preferred qualifications", "basic qualifications",
  "what we're looking for", "what we are looking for", "what you'll bring",
  "what you will bring", "who you are", "ideal candidate",
  "skills", "technical skills", "core skills", "key skills", "required skills",
  "experience", "background", "education",
  "nice to have", "preferred", "bonus", "good to have",
  "benefits", "what we offer", "perks", "compensation", "salary", "why join us",
  "what you get", "our offer",
];

function looksLikeHeading(line: string): boolean {
  const t = line.trim();
  if (!t || t.length > 100) return false;
  // Ends with colon and is reasonably short
  if (t.endsWith(":") && t.length <= 70) return true;
  // ALL CAPS (at least 4 chars)
  if (t.length >= 4 && t === t.toUpperCase() && /[A-Z]{3}/.test(t)) return true;
  // Matches known section keywords
  const low = t.toLowerCase().replace(/:$/, "").trim();
  return SECTION_KEYWORDS.some((kw) => low === kw || low.startsWith(kw + " ") || low.startsWith(kw + ":"));
}

function parseBullet(line: string): string | null {
  const m = line.match(/^[•–—−\-\*·]\s+(.+)/);
  if (m) return m[1].trim();
  const n = line.match(/^\d+[.)]\s+(.+)/);
  if (n) return n[1].trim();
  return null;
}

function parseDescription(raw: string): Block[] {
  const lines = raw.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
  const blocks: Block[] = [];

  for (const line of lines) {
    if (looksLikeHeading(line)) {
      blocks.push({ kind: "heading", text: line.replace(/:$/, "").trim() });
      continue;
    }
    const bulletText = parseBullet(line);
    if (bulletText) {
      const last = blocks[blocks.length - 1];
      if (last?.kind === "list") {
        last.items.push(bulletText);
      } else {
        blocks.push({ kind: "list", items: [bulletText] });
      }
      continue;
    }
    blocks.push({ kind: "para", text: line });
  }

  return blocks;
}

function StructuredDescription({ html, text }: { html: string | null; text: string | null }) {
  const raw = useMemo(() => {
    if (html) return htmlToText(html);
    return text ?? "";
  }, [html, text]);

  const blocks = useMemo(() => parseDescription(raw), [raw]);

  if (!raw.trim()) return null;

  return (
    <div>
      {blocks.map((block, i) => {
        if (block.kind === "heading") {
          return (
            <div key={i} style={{ marginTop: i === 0 ? 0 : 28, marginBottom: 12 }}>
              <h3 style={{
                fontFamily: "'Inter', sans-serif",
                fontWeight: 700,
                fontSize: 15,
                color: "#191919",
                margin: 0,
                marginBottom: 8,
                letterSpacing: "-0.01em",
              }}>
                {block.text}
              </h3>
              <div style={{ height: 1, background: "rgba(0,0,0,0.08)" }} />
            </div>
          );
        }

        if (block.kind === "list") {
          return (
            <ul key={i} style={{ paddingLeft: 20, margin: "0 0 14px", listStyle: "disc" }}>
              {block.items.map((item, j) => (
                <li key={j} style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 14,
                  color: "#555555",
                  lineHeight: 1.75,
                  marginBottom: 5,
                  paddingLeft: 2,
                }}>
                  {item}
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={i} style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 14,
            color: "#555555",
            lineHeight: 1.85,
            margin: "0 0 12px",
          }}>
            {block.text}
          </p>
        );
      })}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function JobDetailPage({ params }: { params: { id: string } }) {
  const [job, setJob] = useState<ScrapedJobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    getScrapedJobById(params.id)
      .then(setJob)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <main style={{ minHeight: "100vh", background: "#F3F2EF", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 36, height: 36,
            border: "3px solid rgba(10,102,194,0.15)",
            borderTopColor: "#0A66C2",
            borderRadius: "50%",
            animation: "spin 600ms linear infinite",
          }} />
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#9CA3AF", fontWeight: 500 }}>
            Loading job details…
          </span>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </main>
    );
  }

  if (notFound || !job) {
    return (
      <main style={{ minHeight: "100vh", background: "#F3F2EF", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 24px", position: "relative" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "#0A66C2" }} />
        <div style={{
          background: "#FFFFFF",
          border: "1px solid rgba(0,0,0,0.08)",
          borderRadius: 12,
          padding: "48px 40px",
          boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
          textAlign: "center",
          maxWidth: 420,
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: "50%",
            background: "rgba(10,102,194,0.06)",
            border: "1px solid rgba(10,102,194,0.16)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 20px",
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0A66C2" strokeWidth="1.6">
              <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/>
            </svg>
          </div>
          <h2 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 20, color: "#191919", marginBottom: 10 }}>
            Job not found
          </h2>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: "#9CA3AF", lineHeight: 1.7, marginBottom: 24 }}>
            This listing may have expired or been removed by the employer.
          </p>
          <Link
            href="/find-work/jobs"
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "10px 22px", background: "#0A66C2", borderRadius: 20,
              color: "#fff", fontFamily: "'Inter', sans-serif", fontWeight: 600,
              fontSize: 13, textDecoration: "none", transition: "background 150ms",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "#004182"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "#0A66C2"; }}
          >
            ← Back to jobs
          </Link>
        </div>
      </main>
    );
  }

  const applyUrl = job.source_urls[0] ?? null;
  const sourceLabel = formatSource(job.source);
  const hasSalary = !!(job.salary_min || job.salary_max);
  const salaryText = formatSalary(job.salary_min, job.salary_max, job.salary_currency);
  const displayLocation = job.work_type === "remote" && !job.location_city
    ? "Remote"
    : job.location_city ?? null;
  const hasDescription = !!(job.description_html || job.description_text);

  return (
    <main style={{
      minHeight: "100vh",
      background: "#F3F2EF",
      color: "#191919",
      padding: "80px clamp(20px, 5vw, 80px) 80px",
      position: "relative",
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "#0A66C2" }} />

      <div style={{ maxWidth: 860, margin: "0 auto", animation: "fadeInUp 0.5s cubic-bezier(0.16,1,0.3,1) both" }}>

        {/* Breadcrumb */}
        <Link
          href="/find-work/jobs"
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 500,
            color: "#9CA3AF", textDecoration: "none", marginBottom: 24, transition: "color 150ms",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#191919"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#9CA3AF"; }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>
          </svg>
          Find Work
        </Link>

        {/* ── Hero card ────────────────────────────────────────────────── */}
        <div style={{
          background: "#FFFFFF",
          border: "1px solid rgba(0,0,0,0.08)",
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
          marginBottom: 16,
        }}>
          <div style={{ height: 3, background: "#0A66C2" }} />
          <div style={{ padding: "32px 36px 28px" }}>

            {/* Title + source badge */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 14 }}>
              <h1 style={{
                fontFamily: "'Inter', sans-serif",
                fontWeight: 800,
                fontSize: "clamp(20px, 3vw, 28px)",
                color: "#191919",
                letterSpacing: "-0.025em",
                margin: 0,
                lineHeight: 1.2,
                flex: 1,
              }}>
                {job.title}
              </h1>
              <span style={{
                flexShrink: 0,
                padding: "4px 12px",
                background: "rgba(10,102,194,0.06)",
                border: "1px solid rgba(10,102,194,0.18)",
                borderRadius: 100,
                fontFamily: "'Inter', sans-serif",
                fontSize: 11,
                color: "#0A66C2",
                fontWeight: 700,
                letterSpacing: "0.04em",
                whiteSpace: "nowrap" as const,
              }}>
                via {sourceLabel}
              </span>
            </div>

            {/* Company + location */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" as const, marginBottom: 20 }}>
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 16, fontWeight: 700, color: "#0A66C2" }}>
                {job.company}
              </span>
              {displayLocation && (
                <>
                  <span style={{ color: "#D1D5DB" }}>·</span>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: "#9CA3AF" }}>
                    {displayLocation}
                  </span>
                </>
              )}
              {job.location_country && job.location_city && (
                <>
                  <span style={{ color: "#D1D5DB" }}>·</span>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: "#9CA3AF" }}>
                    {job.location_country}
                  </span>
                </>
              )}
            </div>

            {/* Badges */}
            {(job.work_type || job.experience_level || job.employment_type) && (
              <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 8, marginBottom: 20 }}>
                {job.work_type && (
                  <span style={badge("#0A66C2", "rgba(10,102,194,0.08)", "rgba(10,102,194,0.22)")}>
                    {WORK_TYPE_LABELS[job.work_type] ?? job.work_type}
                  </span>
                )}
                {job.experience_level && (
                  <span style={badge("#555555", "rgba(0,0,0,0.04)", "rgba(0,0,0,0.14)")}>
                    {EXP_LEVEL_LABELS[job.experience_level] ?? job.experience_level}
                  </span>
                )}
                {job.employment_type && (
                  <span style={badge("#555555", "rgba(0,0,0,0.04)", "rgba(0,0,0,0.14)")}>
                    {EMPLOYMENT_TYPE_LABELS[job.employment_type] ?? job.employment_type}
                  </span>
                )}
                {job.category && (
                  <span style={badge("#555555", "rgba(0,0,0,0.04)", "rgba(0,0,0,0.14)")} >
                    {job.category.charAt(0).toUpperCase() + job.category.slice(1)}
                  </span>
                )}
              </div>
            )}

            {/* Salary pill */}
            {hasSalary && (
              <div style={{ marginBottom: 24 }}>
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "8px 16px",
                  background: "rgba(5,118,66,0.06)",
                  border: "1px solid rgba(5,118,66,0.20)",
                  borderRadius: 8,
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#057642" strokeWidth="2">
                    <line x1="12" y1="1" x2="12" y2="23"/>
                    <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
                  </svg>
                  <span style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 13, color: "#057642", fontWeight: 600, letterSpacing: "0.02em",
                  }}>
                    {salaryText}
                  </span>
                  {job.salary_raw && job.salary_raw !== salaryText && (
                    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#9CA3AF" }}>
                      ({job.salary_raw})
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Skills */}
            {job.skills.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <div style={{
                  fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 700,
                  color: "#9CA3AF", letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 10,
                }}>
                  Skills required
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {job.skills.map((skill) => (
                    <span key={skill} style={{
                      padding: "4px 11px",
                      background: "rgba(0,0,0,0.04)",
                      border: "1px solid rgba(0,0,0,0.10)",
                      borderRadius: 100,
                      fontFamily: "'Inter', sans-serif",
                      fontSize: 12,
                      color: "#555555",
                      fontWeight: 500,
                    }}>
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Divider + Apply row */}
            <div style={{ height: 1, background: "rgba(0,0,0,0.06)", marginBottom: 20 }} />

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" as const, gap: 16 }}>
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#9CA3AF" }}>
                Posted {formatRelativeDate(job.posted_at)} · via {sourceLabel}
              </span>

              {applyUrl ? (
                <a
                  href={applyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 8,
                    padding: "12px 28px",
                    background: "#0A66C2", borderRadius: 24, color: "#fff",
                    fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 14,
                    textDecoration: "none", letterSpacing: "0.01em",
                    boxShadow: "0 2px 10px rgba(10,102,194,0.28)",
                    transition: "background 150ms, transform 150ms, box-shadow 150ms",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#004182";
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow = "0 4px 16px rgba(10,102,194,0.35)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#0A66C2";
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 2px 10px rgba(10,102,194,0.28)";
                  }}
                >
                  Apply on {sourceLabel}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
                    <polyline points="15 3 21 3 21 9"/>
                    <line x1="10" y1="14" x2="21" y2="3"/>
                  </svg>
                </a>
              ) : (
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#9CA3AF" }}>
                  No application link available
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Description card ──────────────────────────────────────────── */}
        {hasDescription && (
          <div style={{
            background: "#FFFFFF",
            border: "1px solid rgba(0,0,0,0.08)",
            borderRadius: 12,
            overflow: "hidden",
            boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
            marginBottom: 16,
          }}>
            <div style={{ padding: "28px 36px 32px" }}>
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                marginBottom: 24, paddingBottom: 16,
                borderBottom: "1px solid rgba(0,0,0,0.08)",
              }}>
                <span style={{
                  fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 700,
                  color: "#0A66C2", letterSpacing: "0.12em", textTransform: "uppercase",
                }}>
                  Job Description
                </span>
                {applyUrl && (
                  <a
                    href={applyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 600,
                      color: "#0A66C2", textDecoration: "none", transition: "color 150ms",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = "#004182"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "#0A66C2"; }}
                  >
                    Apply on {sourceLabel}
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
                      <polyline points="15 3 21 3 21 9"/>
                      <line x1="10" y1="14" x2="21" y2="3"/>
                    </svg>
                  </a>
                )}
              </div>

              <StructuredDescription
                html={job.description_html ?? null}
                text={job.description_text ?? null}
              />
            </div>
          </div>
        )}

        {/* Back link */}
        <Link
          href="/find-work/jobs"
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 500,
            color: "#9CA3AF", textDecoration: "none", transition: "color 150ms",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#191919"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#9CA3AF"; }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>
          </svg>
          Back to Find Work
        </Link>
      </div>

      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </main>
  );
}

function badge(color: string, bg: string, border: string): React.CSSProperties {
  return {
    display: "inline-flex", alignItems: "center",
    padding: "4px 12px",
    background: bg, border: `1px solid ${border}`, borderRadius: 100,
    fontFamily: "'Inter', sans-serif", fontSize: 12, color, fontWeight: 600,
  };
}
