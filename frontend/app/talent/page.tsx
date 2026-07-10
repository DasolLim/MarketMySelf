"use client";

import React, { useEffect, useMemo, useState } from "react";
import { fetchPublicTalent } from "@/lib/api";
import { PixelSection, JobCategory, EXPERIENCE_LEVEL_LABELS } from "@/types";
import { JOB_CATEGORIES, CATEGORY_COLORS } from "@/types/job-categories";

const LEVEL_OPTIONS = [
  { value: "",       label: "All levels" },
  { value: "junior", label: "Junior" },
  { value: "mid",    label: "Mid-level" },
  { value: "senior", label: "Senior" },
];

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0] ?? "")
    .join("")
    .toUpperCase();
}

const TalentShowcaseCard = React.memo(function TalentShowcaseCard({ profile }: { profile: PixelSection }) {
  const catColor = profile.job_category
    ? CATEGORY_COLORS[profile.job_category as JobCategory] ?? "#9CA3AF"
    : "#9CA3AF";
  const expLabel = profile.experience_level ? EXPERIENCE_LEVEL_LABELS[profile.experience_level] : null;
  const allSkills = useMemo(
    () => [...(profile.tech_skills ?? []), ...(profile.soft_skills ?? [])].slice(0, 6),
    [profile.tech_skills, profile.soft_skills],
  );
  const initials = getInitials(profile.full_name);

  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "1px solid rgba(0,0,0,0.08)",
        borderRadius: 12,
        padding: "24px 22px 20px",
        boxShadow: "0 1px 8px rgba(0,0,0,0.05)",
        position: "relative",
        overflow: "hidden",
        transition: "border-color 150ms, transform 150ms, box-shadow 150ms",
        display: "flex",
        flexDirection: "column",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = "rgba(0,0,0,0.16)";
        el.style.transform = "translateY(-2px)";
        el.style.boxShadow = "0 6px 24px rgba(0,0,0,0.09)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = "rgba(0,0,0,0.08)";
        el.style.transform = "translateY(0)";
        el.style.boxShadow = "0 1px 8px rgba(0,0,0,0.05)";
      }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: catColor }} />

      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 14 }}>
        {profile.image_url ? (
          <img
            src={profile.image_url}
            alt={profile.full_name ?? ""}
            style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", border: `2px solid ${catColor}35`, flexShrink: 0 }}
          />
        ) : (
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: `${catColor}18`, border: `2px solid ${catColor}30`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 18, color: catColor, lineHeight: 1 }}>
              {initials}
            </span>
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 16, color: "#191919", marginBottom: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {profile.full_name ?? "Anonymous"}
          </div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#555555", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {profile.job_title ?? "—"}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        {profile.job_category && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", background: `${catColor}14`, border: `1px solid ${catColor}35`, borderRadius: 100, fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 600, color: catColor }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: catColor, flexShrink: 0 }} />
            {profile.job_category}
          </span>
        )}
        {expLabel && (
          <span style={{ display: "inline-block", padding: "3px 10px", background: "rgba(10,102,194,0.06)", border: "1px solid rgba(10,102,194,0.18)", borderRadius: 100, fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 600, color: "#0A66C2" }}>
            {expLabel}
          </span>
        )}
      </div>

      {profile.bio ? (
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#555555", lineHeight: 1.72, marginBottom: 14, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden", flex: 1 }}>
          {profile.bio}
        </p>
      ) : (
        <div style={{ flex: 1 }} />
      )}

      {allSkills.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: "auto", paddingTop: 4 }}>
          {allSkills.map((skill) => (
            <span key={skill} style={{ display: "inline-block", padding: "3px 9px", background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.10)", borderRadius: 100, fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#555555" }}>
              {skill}
            </span>
          ))}
        </div>
      )}
    </div>
  );
});

function SkeletonCard() {
  return (
    <div style={{ background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, padding: "24px 22px", height: 240, animation: "pulse 1.4s ease infinite", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "rgba(0,0,0,0.08)" }} />
      <div style={{ display: "flex", gap: 14, marginBottom: 16 }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(0,0,0,0.06)", flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ height: 16, background: "rgba(0,0,0,0.06)", borderRadius: 4, marginBottom: 8, width: "65%" }} />
          <div style={{ height: 13, background: "rgba(0,0,0,0.04)", borderRadius: 4, width: "45%" }} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        <div style={{ height: 22, width: 80, background: "rgba(0,0,0,0.05)", borderRadius: 100 }} />
        <div style={{ height: 22, width: 64, background: "rgba(0,0,0,0.05)", borderRadius: 100 }} />
      </div>
      <div style={{ height: 13, background: "rgba(0,0,0,0.04)", borderRadius: 4, marginBottom: 6 }} />
      <div style={{ height: 13, background: "rgba(0,0,0,0.04)", borderRadius: 4, marginBottom: 6, width: "85%" }} />
      <div style={{ height: 13, background: "rgba(0,0,0,0.04)", borderRadius: 4, width: "60%" }} />
    </div>
  );
}

export default function TalentPage() {
  const [profiles, setProfiles] = useState<PixelSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState("");
  const [activeLevel, setActiveLevel] = useState("");

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchPublicTalent({
      job_category: activeCategory || undefined,
      experience_level: activeLevel || undefined,
      limit: 48,
    })
      .then(setProfiles)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load talent"))
      .finally(() => setLoading(false));
  }, [activeCategory, activeLevel]);

  return (
    <main style={{ minHeight: "100vh", background: "#F3F2EF", color: "#191919", overflowX: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "#0A66C2", zIndex: 10 }} />

      <section style={{ background: "#FFFFFF", borderBottom: "1px solid rgba(0,0,0,0.08)", padding: "80px clamp(20px, 5vw, 80px) 48px" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto" }}>
          <div style={{ textAlign: "center", maxWidth: "72ch", margin: "0 auto" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "5px 14px", background: "rgba(10,102,194,0.07)", border: "1px solid rgba(10,102,194,0.18)", borderRadius: 100, marginBottom: 20, animation: "fadeIn 0.5s ease both" }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#0A66C2", animation: "glow-pulse 2s ease infinite" }} />
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#0A66C2", fontWeight: 600, letterSpacing: "0.02em" }}>
                Premium talent pool
              </span>
            </div>

            <h1 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: "clamp(30px, 5vw, 52px)", color: "#191919", letterSpacing: "-0.03em", lineHeight: 1.08, marginBottom: 16, animation: "fadeInUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.05s both" }}>
              Discover the best<br />professionals.
            </h1>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "clamp(14px, 1.6vw, 17px)", color: "#555555", lineHeight: 1.75, marginBottom: 32, animation: "fadeInUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.12s both" }}>
              Every profile here is a professional who has invested in their visibility — premium members who are serious about being discovered.
            </p>

            <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap", animation: "fadeInUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.2s both" }}>
              {JOB_CATEGORIES.map((cat) => (
                <div
                  key={cat.slug}
                  style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 18px", background: "#FFFFFF", border: `1px solid ${cat.color}35`, borderRadius: 10, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}
                >
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: cat.color }} />
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600, color: "#191919" }}>{cat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "36px clamp(20px, 5vw, 80px) 80px" }}>

        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          <button
            onClick={() => setActiveCategory("")}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 18px", background: activeCategory === "" ? "#0A66C2" : "#FFFFFF", border: `1px solid ${activeCategory === "" ? "#0A66C2" : "rgba(0,0,0,0.12)"}`, borderRadius: 20, color: activeCategory === "" ? "#fff" : "#555555", fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 150ms" }}
            onMouseEnter={(e) => { if (activeCategory !== "") { e.currentTarget.style.borderColor = "rgba(0,0,0,0.25)"; e.currentTarget.style.color = "#191919"; } }}
            onMouseLeave={(e) => { if (activeCategory !== "") { e.currentTarget.style.borderColor = "rgba(0,0,0,0.12)"; e.currentTarget.style.color = "#555555"; } }}
          >
            All talent
          </button>
          {JOB_CATEGORIES.map((cat) => (
            <button
              key={cat.slug}
              onClick={() => setActiveCategory(activeCategory === cat.apiValue ? "" : cat.apiValue)}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 18px", background: activeCategory === cat.apiValue ? "#0A66C2" : "#FFFFFF", border: `1px solid ${activeCategory === cat.apiValue ? "#0A66C2" : "rgba(0,0,0,0.12)"}`, borderRadius: 20, color: activeCategory === cat.apiValue ? "#fff" : "#555555", fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 150ms" }}
              onMouseEnter={(e) => { if (activeCategory !== cat.apiValue) { e.currentTarget.style.borderColor = "rgba(0,0,0,0.25)"; e.currentTarget.style.color = "#191919"; } }}
              onMouseLeave={(e) => { if (activeCategory !== cat.apiValue) { e.currentTarget.style.borderColor = "rgba(0,0,0,0.12)"; e.currentTarget.style.color = "#555555"; } }}
            >
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: activeCategory === cat.apiValue ? "rgba(255,255,255,0.8)" : cat.color }} />
              {cat.label}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: 28, flexWrap: "wrap" }}>
          {LEVEL_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setActiveLevel(opt.value)}
              style={{ padding: "5px 14px", background: activeLevel === opt.value ? "#191919" : "transparent", border: `1px solid ${activeLevel === opt.value ? "#191919" : "rgba(0,0,0,0.14)"}`, borderRadius: 100, fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 500, color: activeLevel === opt.value ? "#fff" : "#555555", cursor: "pointer", transition: "all 150ms" }}
              onMouseEnter={(e) => { if (activeLevel !== opt.value) { e.currentTarget.style.borderColor = "rgba(0,0,0,0.30)"; e.currentTarget.style.color = "#191919"; } }}
              onMouseLeave={(e) => { if (activeLevel !== opt.value) { e.currentTarget.style.borderColor = "rgba(0,0,0,0.14)"; e.currentTarget.style.color = "#555555"; } }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {error && (
          <div style={{ padding: "12px 16px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.22)", borderRadius: 10, fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#DC2626", marginBottom: 20 }}>
            {error}
          </div>
        )}

        {!loading && !error && (
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#9CA3AF", marginBottom: 16 }}>
            {profiles.length} professional{profiles.length !== 1 ? "s" : ""}
            {activeCategory ? ` in ${activeCategory}` : ""}
            {activeLevel ? ` · ${EXPERIENCE_LEVEL_LABELS[activeLevel as keyof typeof EXPERIENCE_LEVEL_LABELS]}` : ""}
          </div>
        )}

        {loading && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
            {Array.from({ length: 9 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {!loading && !error && profiles.length === 0 && (
          <div style={{ textAlign: "center", padding: "80px 20px", background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12 }}>
            <div style={{ width: 60, height: 60, borderRadius: "50%", background: "rgba(10,102,194,0.08)", border: "1px solid rgba(10,102,194,0.18)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#0A66C2" strokeWidth="1.6"><circle cx="12" cy="7" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
            </div>
            <h3 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 18, color: "#191919", marginBottom: 8 }}>
              No profiles published yet
            </h3>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: "#9CA3AF", maxWidth: "36ch", margin: "0 auto" }}>
              {activeCategory || activeLevel
                ? "Try adjusting your filters to see more talent."
                : "Professionals are signing up. Check back soon as more profiles go live."}
            </p>
          </div>
        )}

        {!loading && !error && profiles.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
            {profiles.map((profile) => (
              <TalentShowcaseCard key={profile.id} profile={profile} />
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes glow-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
      `}</style>
    </main>
  );
}
