"use client";

import React from "react";
import { JobPost, EXPERIENCE_LEVEL_LABELS } from "@/types";

interface Props {
  job: JobPost;
  onApply?: (jobId: string) => void;
  applying?: boolean;
}

export default function JobListingCard({ job, onApply, applying }: Props) {
  const posted = new Date(job.created_at);
  const daysAgo = Math.floor((Date.now() - posted.getTime()) / 86_400_000);
  const timeLabel = daysAgo === 0 ? "Today" : daysAgo === 1 ? "Yesterday" : `${daysAgo}d ago`;

  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "1px solid rgba(0,0,0,0.08)",
        borderRadius: 12,
        padding: "22px 24px",
        boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
        position: "relative",
        overflow: "hidden",
        transition: "border-color 150ms, transform 150ms",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(0,0,0,0.16)";
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(0,0,0,0.08)";
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
      }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "#0A66C2" }} />

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 16, color: "#191919", marginBottom: 4, lineHeight: 1.3 }}>
            {job.title}
          </h3>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {job.experience_level && (
              <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 8px", background: "rgba(10,102,194,0.08)", border: "1px solid rgba(10,102,194,0.18)", borderRadius: 100, fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#0A66C2", fontWeight: 600 }}>
                {EXPERIENCE_LEVEL_LABELS[job.experience_level] ?? job.experience_level}
              </span>
            )}
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#9CA3AF" }}>{timeLabel}</span>
          </div>
        </div>
        {onApply && (
          <button
            onClick={() => onApply(job.id)}
            disabled={applying}
            style={{
              padding: "8px 18px",
              background: applying ? "rgba(10,102,194,0.5)" : "#0A66C2",
              border: "none",
              borderRadius: 20,
              color: "#fff",
              fontFamily: "'Inter', sans-serif",
              fontWeight: 600,
              fontSize: 13,
              cursor: applying ? "not-allowed" : "pointer",
              transition: "background 150ms",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
            onMouseEnter={(e) => { if (!applying) e.currentTarget.style.background = "#004182"; }}
            onMouseLeave={(e) => { if (!applying) e.currentTarget.style.background = "#0A66C2"; }}
          >
            {applying ? (
              <>
                <div style={{ width: 12, height: 12, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 600ms linear infinite" }} />
                Applying…
              </>
            ) : "Apply"}
          </button>
        )}
      </div>

      {job.description && (
        <p style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 13,
          color: "#555555",
          lineHeight: 1.7,
          marginBottom: 14,
          display: "-webkit-box",
          WebkitLineClamp: 3,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}>
          {job.description}
        </p>
      )}

      {(job.required_tech_skills?.length > 0 || job.required_soft_skills?.length > 0) && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {[...(job.required_tech_skills ?? []), ...(job.required_soft_skills ?? [])].slice(0, 7).map((skill) => (
            <span key={skill} style={{ display: "inline-block", padding: "2px 8px", background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.10)", borderRadius: 100, fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#555555" }}>
              {skill}
            </span>
          ))}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
