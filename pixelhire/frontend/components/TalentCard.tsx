"use client";

import React, { useState } from "react";
import { PixelSection, JobCategory } from "@/types";
import { CATEGORY_COLORS } from "@/types/job-categories";

interface Props {
  section: PixelSection;
  onNotify?: (sectionOwnerId: string) => Promise<void>;
}

export default function TalentCard({ section, onNotify }: Props) {
  const [notifying, setNotifying] = useState(false);
  const [notified, setNotified] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categoryColor = section.job_category
    ? CATEGORY_COLORS[section.job_category as JobCategory] ?? "#9CA3AF"
    : "#9CA3AF";

  async function handleNotify() {
    if (!onNotify || !section.owner_id) return;
    setNotifying(true);
    setError(null);
    try {
      await onNotify(section.owner_id);
      setNotified(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to notify");
    } finally {
      setNotifying(false);
    }
  }

  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "1px solid rgba(0,0,0,0.08)",
        borderRadius: 12,
        padding: "20px 22px",
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
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: categoryColor }} />

      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 14 }}>
        {section.image_url ? (
          <img
            src={section.image_url}
            alt={section.full_name ?? ""}
            style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(0,0,0,0.08)", flexShrink: 0 }}
          />
        ) : (
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(10,102,194,0.08)", border: "2px solid rgba(10,102,194,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0A66C2" strokeWidth="1.6"><circle cx="12" cy="7" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 15, color: "#191919", marginBottom: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {section.full_name ?? "Anonymous"}
          </div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#555555", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {section.job_title ?? "—"}
          </div>
        </div>
        {section.job_category && (
          <span style={{ display: "inline-block", padding: "3px 9px", background: `${categoryColor}18`, border: `1px solid ${categoryColor}40`, borderRadius: 100, fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 600, color: categoryColor, flexShrink: 0 }}>
            {section.job_category}
          </span>
        )}
      </div>

      {section.bio && (
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#555555", lineHeight: 1.65, marginBottom: 14, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {section.bio}
        </p>
      )}

      {(section.tech_skills?.length > 0 || section.soft_skills?.length > 0) && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 14 }}>
          {[...(section.tech_skills ?? []), ...(section.soft_skills ?? [])].slice(0, 6).map((skill) => (
            <span key={skill} style={{ display: "inline-block", padding: "2px 8px", background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.10)", borderRadius: 100, fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#555555" }}>
              {skill}
            </span>
          ))}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#9CA3AF" }}>
          {section.experience_level ? `${section.experience_level[0].toUpperCase()}${section.experience_level.slice(1)}` : ""}
          {section.experience_level && section.page_number ? " · " : ""}
          Page {section.page_number}
        </div>
        {onNotify && section.owner_id && (
          <button
            onClick={handleNotify}
            disabled={notifying || notified}
            style={{
              padding: "7px 16px",
              background: notified ? "#057642" : "#0A66C2",
              border: "none",
              borderRadius: 20,
              color: "#fff",
              fontFamily: "'Inter', sans-serif",
              fontWeight: 600,
              fontSize: 12,
              cursor: notifying || notified ? "default" : "pointer",
              transition: "background 150ms",
              display: "flex",
              alignItems: "center",
              gap: 6,
              flexShrink: 0,
            }}
          >
            {notifying ? (
              <>
                <div style={{ width: 12, height: 12, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 600ms linear infinite" }} />
                Sending...
              </>
            ) : notified ? "Notified!" : "Notify"}
          </button>
        )}
      </div>

      {error && (
        <div style={{ marginTop: 8, fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#DC2626" }}>{error}</div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
