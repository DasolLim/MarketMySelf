"use client";

import React, { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { fetchGridSections } from "@/lib/api";
import type { GridSection } from "@/types";

type CarouselProfile = GridSection & {
  bio?: string | null;
  skills?: string[];
  portfolio_url?: string | null;
};

const CAT: Record<string, { color: string; bg: string; border: string }> = {
  Technical: { color: "#22d3ee", bg: "rgba(34,211,238,0.07)",  border: "rgba(34,211,238,0.28)" },
  Marketing: { color: "#c084fc", bg: "rgba(192,132,252,0.07)", border: "rgba(192,132,252,0.28)" },
  Finance:   { color: "#34d399", bg: "rgba(52,211,153,0.07)",  border: "rgba(52,211,153,0.28)"  },
};

const MOCK_PROFILES: CarouselProfile[] = [
  { id: "m1", owner_id: "mock", full_name: "Alex Rivera", job_title: "Senior Engineer", job_category: "Technical", bio: "10 years building distributed systems at scale. Prev: Google, Stripe. Open to senior IC or staff roles.", skills: ["Go", "Kubernetes", "PostgreSQL"], is_published: true, image_url: null, page_number: 1, row: 0, col: 0, portfolio_url: "alexrivera.dev" },
  { id: "m2", owner_id: "mock", full_name: "Priya Mehta",  job_title: "Growth Lead",      job_category: "Marketing", bio: "Scaled three B2B SaaS products from 0 to $5M ARR. Obsessed with PLG and retention loops.", skills: ["SEO", "Lifecycle", "A/B Testing"], is_published: true, image_url: null, page_number: 1, row: 0, col: 1, portfolio_url: "priyamehta.co" },
  { id: "m3", owner_id: "mock", full_name: "Jordan Lee",   job_title: "FP&A Manager",     job_category: "Finance",   bio: "Built financial models for $200M+ portfolios. Ex-McKinsey. Looking for Series B+ ops role.", skills: ["Excel", "SQL", "Forecasting"], is_published: true, image_url: null, page_number: 1, row: 0, col: 2, portfolio_url: "jordanlee.io" },
  { id: "m4", owner_id: "mock", full_name: "Sam Okafor",   job_title: "ML Engineer",      job_category: "Technical", bio: "Shipped production ML models serving 50M+ users. Python, PyTorch, and a love for good data.", skills: ["Python", "PyTorch", "MLOps"], is_published: true, image_url: null, page_number: 2, row: 0, col: 0, portfolio_url: "samokafor.dev" },
  { id: "m5", owner_id: "mock", full_name: "Dana Cruz",    job_title: "Brand Strategist",  job_category: "Marketing", bio: "Rebranded Fortune 500 companies and 0-1 startups. Words and visuals, no filler.", skills: ["Branding", "Copy", "Figma"], is_published: true, image_url: null, page_number: 2, row: 0, col: 1, portfolio_url: "danacruz.work" },
  { id: "m6", owner_id: "mock", full_name: "Riley Park",   job_title: "CFO (Fractional)",  job_category: "Finance",   bio: "Fractional CFO for early-stage startups. Fundraising, runway management, and board decks.", skills: ["Fundraising", "Runway", "GAAP"], is_published: true, image_url: null, page_number: 2, row: 0, col: 2, portfolio_url: "rileypark.finance" },
];

function ProfileCard({ profile }: { profile: CarouselProfile }) {
  const cfg = profile.job_category ? CAT[profile.job_category] : null;
  const initials = profile.full_name
    ? profile.full_name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()
    : "?";

  return (
    <div
      style={{
        background: cfg ? `linear-gradient(160deg, #0d1117 55%, ${cfg.bg})` : "#0d1117",
        border: `1px solid ${cfg ? cfg.border : "#1e2d45"}`,
        borderTop: `3px solid ${cfg ? cfg.color : "#1e2d45"}`,
        borderRadius: 12,
        padding: "20px",
        flex: "1 1 0",
        minWidth: 0,
        boxShadow: cfg ? `0 4px 28px ${cfg.bg}` : "none",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <div
          style={{
            width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
            overflow: "hidden", position: "relative",
            border: `2px solid ${cfg ? cfg.border : "#1e2d45"}`,
            background: cfg ? `${cfg.color}18` : "#111827",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          {profile.image_url ? (
            <Image src={profile.image_url} alt={profile.full_name ?? ""} fill style={{ objectFit: "cover" }} sizes="40px" />
          ) : (
            <span style={{ fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700, fontSize: 13, color: cfg?.color ?? "#4a5568" }}>
              {initials}
            </span>
          )}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700, fontSize: 14, color: "#e2e8f0", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {profile.full_name}
          </div>
          <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, color: "#64748b", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {[profile.job_title, profile.job_category].filter(Boolean).join(" · ")}
          </div>
        </div>
      </div>

      {/* Bio */}
      {profile.bio && (
        <p style={{
          fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, color: "#94a3b8",
          lineHeight: 1.65, margin: "0 0 12px",
          display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>
          {profile.bio}
        </p>
      )}

      {/* Skills */}
      {profile.skills && profile.skills.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {profile.skills.slice(0, 3).map((s) => (
            <span key={s} style={{
              padding: "3px 8px", background: "transparent",
              border: `1px solid ${cfg ? cfg.border : "#1e2d45"}`,
              borderRadius: 4, color: cfg?.color ?? "#94a3b8",
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: "0.02em",
            }}>
              {s}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function ProfileCarousel() {
  const [profiles, setProfiles] = useState<CarouselProfile[]>([]);
  const [slide, setSlide] = useState(0);
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    Promise.all([
      fetchGridSections(1),
      fetchGridSections(2),
      fetchGridSections(3),
    ])
      .then(([p1, p2, p3]) => {
        const all = [...p1, ...p2, ...p3].filter(
          (s) => s.owner_id && s.is_published && s.full_name,
        );
        setProfiles(all.length >= 3 ? all : MOCK_PROFILES);
      })
      .catch(() => setProfiles(MOCK_PROFILES));
  }, []);

  const pool = profiles.length >= 3 ? profiles : MOCK_PROFILES;
  const chunks: CarouselProfile[][] = [];
  for (let i = 0; i < pool.length; i += 3) {
    const chunk = pool.slice(i, i + 3);
    if (chunk.length === 3) chunks.push(chunk);
  }
  if (chunks.length === 0) return null;

  function goTo(idx: number) {
    setVisible(false);
    setTimeout(() => {
      setSlide(idx);
      setVisible(true);
    }, 280);
  }

  useEffect(() => {
    if (chunks.length <= 1) return;
    timerRef.current = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setSlide((s) => (s + 1) % chunks.length);
        setVisible(true);
      }, 280);
    }, 4000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [chunks.length]);

  const current = chunks[slide % chunks.length];

  return (
    <section style={{ padding: "0 24px 72px", maxWidth: 960, margin: "0 auto" }}>
      {/* Section header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{
            fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700, fontSize: "clamp(18px, 3vw, 24px)",
            color: "#e2e8f0", margin: 0, letterSpacing: "-0.01em",
          }}>
            Talent on the board
          </h2>
          <p style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, color: "#475569", margin: "6px 0 0" }}>
            Professionals already making themselves visible
          </p>
        </div>
        {chunks.length > 1 && (
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {chunks.map((_, i) => (
              <button
                key={i}
                onClick={() => { if (timerRef.current) clearInterval(timerRef.current); goTo(i); }}
                style={{
                  width: i === slide % chunks.length ? 20 : 6,
                  height: 6,
                  borderRadius: 3,
                  background: i === slide % chunks.length ? "#22d3ee" : "#1e2d45",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  transition: "all 300ms",
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Cards */}
      <div
        style={{
          display: "flex",
          gap: 14,
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(8px)",
          transition: "opacity 280ms ease-out, transform 280ms ease-out",
        }}
      >
        {current.map((profile) => (
          <ProfileCard key={profile.id} profile={profile} />
        ))}
      </div>
    </section>
  );
}
