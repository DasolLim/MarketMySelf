"use client";

import React from "react";
import Link from "next/link";
import { ScrapedJob, WORK_TYPE_LABELS, EXP_LEVEL_LABELS, EMPLOYMENT_TYPE_LABELS } from "@/types";
import { formatSalary, formatRelativeDate, formatSource } from "@/lib/job-utils";

interface Props {
  job: ScrapedJob;
  onClick?: () => void;
}

export default function ScrapedJobCard({ job, onClick }: Props) {
  const displayLocation =
    job.work_type === "remote" ? "Remote" : job.location_city ?? null;

  const sourceLabel = formatSource(job.source);
  const salaryText = formatSalary(job.salary_min, job.salary_max, job.salary_currency);
  const hasSalary = !!(job.salary_min || job.salary_max);

  const visibleSkills = job.skills.slice(0, 5);
  const extraSkills = job.skills.length > 5 ? job.skills.length - 5 : 0;

  return (
    <Link
      href={`/find-work/jobs/${job.id}`}
      onClick={onClick}
      style={{
        display: "block",
        textDecoration: "none",
        background: "#FFFFFF",
        border: "1px solid rgba(0,0,0,0.08)",
        borderRadius: 12,
        padding: "22px 24px",
        position: "relative",
        overflow: "hidden",
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
        transition: "border-color 150ms, transform 150ms, box-shadow 150ms",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(0,0,0,0.18)";
        (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-1px)";
        (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 4px 14px rgba(0,0,0,0.08)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(0,0,0,0.08)";
        (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(0)";
        (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 1px 4px rgba(0,0,0,0.04)";
      }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "#0A66C2" }} />

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
        <h3 style={{
          fontFamily: "'Inter', sans-serif",
          fontWeight: 700,
          fontSize: 15,
          color: "#191919",
          margin: 0,
          lineHeight: 1.3,
          flex: 1,
          minWidth: 0,
        }}>
          {job.title}
        </h3>
        <span style={{
          flexShrink: 0,
          padding: "3px 10px",
          background: "rgba(10,102,194,0.06)",
          border: "1px solid rgba(10,102,194,0.16)",
          borderRadius: 100,
          fontFamily: "'Inter', sans-serif",
          fontSize: 11,
          color: "#0A66C2",
          fontWeight: 600,
          whiteSpace: "nowrap" as const,
        }}>
          {sourceLabel}
        </span>
      </div>

      <div style={{
        fontFamily: "'Inter', sans-serif",
        fontSize: 13,
        display: "flex",
        alignItems: "center",
        gap: 6,
        flexWrap: "wrap" as const,
        marginBottom: 12,
      }}>
        <span style={{ color: "#0A66C2", fontWeight: 600 }}>{job.company}</span>
        {displayLocation && (
          <>
            <span style={{ color: "#D1D5DB" }}>·</span>
            <span style={{ color: "#9CA3AF" }}>{displayLocation}</span>
          </>
        )}
      </div>

      {(job.work_type || job.experience_level || job.employment_type) && (
        <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6, marginBottom: 12 }}>
          {job.work_type && (
            <span style={badge("#0A66C2", "rgba(10,102,194,0.08)", "rgba(10,102,194,0.20)")}>
              {WORK_TYPE_LABELS[job.work_type] ?? job.work_type}
            </span>
          )}
          {job.experience_level && (
            <span style={badge("#555555", "rgba(0,0,0,0.04)", "rgba(0,0,0,0.12)")}>
              {EXP_LEVEL_LABELS[job.experience_level] ?? job.experience_level}
            </span>
          )}
          {job.employment_type && (
            <span style={badge("#555555", "rgba(0,0,0,0.04)", "rgba(0,0,0,0.12)")}>
              {EMPLOYMENT_TYPE_LABELS[job.employment_type] ?? job.employment_type}
            </span>
          )}
        </div>
      )}

      {hasSalary && (
        <div style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 12,
          color: "#057642",
          fontWeight: 600,
          letterSpacing: "0.02em",
          marginBottom: job.skills.length > 0 ? 12 : 10,
        }}>
          {salaryText}
        </div>
      )}

      {job.skills.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 5, marginBottom: 12 }}>
          {visibleSkills.map((skill) => (
            <span key={skill} style={{
              padding: "2px 9px",
              background: "rgba(0,0,0,0.04)",
              border: "1px solid rgba(0,0,0,0.10)",
              borderRadius: 100,
              fontFamily: "'Inter', sans-serif",
              fontSize: 11,
              color: "#555555",
            }}>
              {skill}
            </span>
          ))}
          {extraSkills > 0 && (
            <span style={{
              padding: "2px 8px",
              fontFamily: "'Inter', sans-serif",
              fontSize: 11,
              color: "#9CA3AF",
            }}>
              +{extraSkills} more
            </span>
          )}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#9CA3AF" }}>
          {formatRelativeDate(job.posted_at)}
        </span>
        <span style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 12,
          fontWeight: 600,
          color: "#0A66C2",
          letterSpacing: "0.01em",
        }}>
          View details →
        </span>
      </div>
    </Link>
  );
}

function badge(color: string, bg: string, border: string): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    padding: "2px 9px",
    background: bg,
    border: `1px solid ${border}`,
    borderRadius: 100,
    fontFamily: "'Inter', sans-serif",
    fontSize: 11,
    color,
    fontWeight: 600,
  };
}
