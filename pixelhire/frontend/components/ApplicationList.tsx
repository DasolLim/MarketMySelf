"use client";

import React from "react";
import { Application, ApplicationStatus, STATUS_LABELS } from "@/types";

const STATUS_CONFIG: Record<ApplicationStatus, { bg: string; border: string; color: string }> = {
  applied:     { bg: "rgba(10,102,194,0.07)", border: "rgba(10,102,194,0.20)", color: "#0A66C2" },
  viewed:      { bg: "rgba(181,90,8,0.07)",   border: "rgba(181,90,8,0.20)",   color: "#B45309" },
  shortlisted: { bg: "rgba(5,118,66,0.07)",   border: "rgba(5,118,66,0.20)",   color: "#057642" },
  rejected:    { bg: "rgba(220,38,38,0.07)",  border: "rgba(220,38,38,0.20)",  color: "#DC2626" },
};

interface Props {
  applications: Application[];
  getJobTitle?: (jobPostId: string) => string;
}

export default function ApplicationList({ applications, getJobTitle }: Props) {
  if (applications.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "40px 20px" }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.2" style={{ display: "block", margin: "0 auto 12px" }}>
          <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 10h8M8 14h5"/>
        </svg>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, fontWeight: 600, color: "#191919", marginBottom: 6 }}>No applications yet</div>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#9CA3AF" }}>Your applications to job posts will appear here.</div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {applications.map((app) => {
        const cfg = STATUS_CONFIG[app.status as ApplicationStatus] ?? STATUS_CONFIG.applied;
        const jobTitle = getJobTitle ? getJobTitle(app.job_post_id) : app.job_post_id.slice(0, 8);
        return (
          <div
            key={app.id}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 18px",
              background: "#FFFFFF",
              border: "1px solid rgba(0,0,0,0.08)",
              borderRadius: 10,
              gap: 12,
              flexWrap: "wrap",
              boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
            }}
          >
            <div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 14, color: "#191919", marginBottom: 3 }}>
                {jobTitle}
              </div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#9CA3AF" }}>
                {new Date(app.created_at).toLocaleDateString()}
              </div>
            </div>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "4px 12px",
                background: cfg.bg,
                border: `1px solid ${cfg.border}`,
                borderRadius: 100,
                fontFamily: "'Inter', sans-serif",
                fontSize: 11,
                fontWeight: 700,
                color: cfg.color,
                letterSpacing: "0.04em",
                flexShrink: 0,
              }}
            >
              {STATUS_LABELS[app.status as ApplicationStatus] ?? app.status}
            </span>
          </div>
        );
      })}
    </div>
  );
}
