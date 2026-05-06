"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PixelGrid } from "@/components/PixelGrid";
import { SectionModal } from "@/components/SectionModal";
import { ProfileCarousel } from "@/components/ProfileCarousel";
import { fetchGridSections, fetchSection } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { GridSection, PixelSection } from "@/types";
import { PAGE_PRICES } from "@/types";

// ── Scroll-fade hook ──────────────────────────────────────────────────────────

function useFadeIn() {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.12 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

// ── Billboard preview ─────────────────────────────────────────────────────────

const BILLBOARD_CELLS = [
  "T","T","E","M","T","E","F","T","E","T","T","M",
  "E","T","M","T","E","T","T","E","M","F","E","T",
  "F","E","T","E","M","E","T","F","T","E","M","E",
  "T","M","E","T","T","E","M","E","T","M","F","T",
  "E","T","F","E","T","M","E","T","E","F","T","E",
];

const CELL_CFG: Record<string, { bg: string; border: string; glow: string }> = {
  T: { bg: "rgba(34,211,238,0.28)",  border: "rgba(34,211,238,0.5)",  glow: "rgba(34,211,238,0.22)" },
  M: { bg: "rgba(192,132,252,0.28)", border: "rgba(192,132,252,0.5)", glow: "rgba(192,132,252,0.22)" },
  F: { bg: "rgba(52,211,153,0.28)",  border: "rgba(52,211,153,0.5)",  glow: "rgba(52,211,153,0.22)" },
  E: { bg: "rgba(255,255,255,0.03)", border: "rgba(255,255,255,0.07)", glow: "transparent" },
};

function BillboardPreview() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(12, 22px)",
        gap: 4,
        padding: 16,
        background: "rgba(7,8,15,0.6)",
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.07)",
        backdropFilter: "blur(12px)",
        boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
        animation: "scaleIn 0.8s cubic-bezier(0.16,1,0.3,1) 0.4s both",
      }}
    >
      {BILLBOARD_CELLS.map((cell, i) => {
        const c = CELL_CFG[cell];
        return (
          <div
            key={i}
            style={{
              width: 22, height: 22,
              borderRadius: 4,
              background: c.bg,
              border: `1px solid ${c.border}`,
              boxShadow: cell !== "E" ? `0 0 6px ${c.glow}` : "none",
              animation: cell !== "E" ? `cell-pop 0.4s ease ${i * 18}ms both` : "none",
            }}
          />
        );
      })}
      {/* Legend */}
      <div style={{ gridColumn: "1 / -1", marginTop: 8, display: "flex", gap: 14, justifyContent: "center" }}>
        {[
          { label: "Technical", color: "#22d3ee" },
          { label: "Marketing", color: "#c084fc" },
          { label: "Finance",   color: "#34d399" },
        ].map((cat) => (
          <div key={cat.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 6, height: 6, borderRadius: 2, background: cat.color }} />
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#4a5578", letterSpacing: "0.06em" }}>
              {cat.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── How it works step ─────────────────────────────────────────────────────────

function Step({ num, icon, title, body }: { num: string; icon: React.ReactNode; title: string; body: string }) {
  return (
    <div style={{ flex: "1 1 0", minWidth: 0 }}>
      <div style={{
        width: 52, height: 52, borderRadius: 14,
        background: "rgba(99,102,241,0.10)",
        border: "1px solid rgba(99,102,241,0.22)",
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 20, color: "#818cf8",
      }}>
        {icon}
      </div>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#4a5578", letterSpacing: "0.10em", marginBottom: 10 }}>
        {num}
      </div>
      <h3 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 18, color: "#f0f2fa", lineHeight: 1.3, marginBottom: 10 }}>
        {title}
      </h3>
      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: "#8492b8", lineHeight: 1.75 }}>
        {body}
      </p>
    </div>
  );
}

// ── Countdown ─────────────────────────────────────────────────────────────────

const HIRING_DATE = new Date("2026-07-01T00:00:00Z");

function useCountdown(target: Date) {
  const [diff, setDiff] = useState(() => Math.max(0, target.getTime() - Date.now()));
  useEffect(() => {
    const id = setInterval(() => setDiff(Math.max(0, target.getTime() - Date.now())), 1000);
    return () => clearInterval(id);
  }, [target]);
  const d = Math.floor(diff / 86_400_000);
  const h = Math.floor((diff % 86_400_000) / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1_000);
  return { d, h, m, s, done: diff === 0 };
}

function ClockUnit({ value, label }: { value: number; label: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{
        fontFamily: "'Inter', sans-serif", fontWeight: 800,
        fontSize: "clamp(28px, 4vw, 44px)", color: "#f0f2fa",
        lineHeight: 1, letterSpacing: "-0.03em",
        background: "#0c0f1d",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 10, padding: "12px 18px",
        minWidth: 70, display: "inline-block",
      }}>
        {String(value).padStart(2, "0")}
      </div>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#4a5578", letterSpacing: "0.12em", textTransform: "uppercase", marginTop: 8 }}>
        {label}
      </div>
    </div>
  );
}

// ── Pricing tier ──────────────────────────────────────────────────────────────

const TIERS = [
  { page: 1 as const, label: "Premier",  price: PAGE_PRICES[1], desc: "Front page. Maximum visibility.", highlight: true },
  { page: 2 as const, label: "Standard", price: PAGE_PRICES[2], desc: "Page 2. Great reach.",           highlight: false },
  { page: 3 as const, label: "Starter",  price: PAGE_PRICES[3], desc: "Page 3. Same grid, less.",       highlight: false },
  { page: 4 as const, label: "Value",    price: PAGE_PRICES[4], desc: "Page 4. Budget-friendly.",       highlight: false },
  { page: 5 as const, label: "Economy",  price: PAGE_PRICES[5], desc: "Page 5. Best price.",            highlight: false },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [sections, setSections]   = useState<GridSection[]>([]);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState<PixelSection | null>(null);
  const countdown = useCountdown(HIRING_DATE);
  const { accessToken } = useAuth();
  const router = useRouter();

  const howRef   = useFadeIn();
  const forRef   = useFadeIn();
  const pricingRef = useFadeIn();
  const ctaRef   = useFadeIn();

  useEffect(() => {
    setLoading(true);
    fetchGridSections(activeTab).then(setSections).finally(() => setLoading(false));
  }, [activeTab]);

  function handlePurchase(id: string) {
    if (!accessToken) { router.push("/login"); return; }
    console.log("purchase", id);
  }

  async function handleSectionClick(section: GridSection) {
    try { setSelected(await fetchSection(section.id)); }
    catch { setSelected(section as unknown as PixelSection); }
  }

  return (
    <main style={{ minHeight: "100vh", background: "#07080f", color: "#f0f2fa", overflowX: "hidden" }}>

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          padding: "80px clamp(20px, 5vw, 80px) 60px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background treatment */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(255,255,255,0.025) 1px, transparent 1px)", backgroundSize: "36px 36px", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: "-10%", left: "50%", transform: "translateX(-50%)", width: 900, height: 700, background: "radial-gradient(ellipse, rgba(99,102,241,0.09) 0%, transparent 62%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "5%", right: "5%", width: 500, height: 500, background: "radial-gradient(circle, rgba(245,158,11,0.05) 0%, transparent 65%)", pointerEvents: "none" }} />

        <div style={{ maxWidth: 1120, margin: "0 auto", width: "100%", display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", gap: "clamp(40px, 6vw, 100px)" }}>

          {/* Left: copy */}
          <div>
            {/* Badge */}
            <div
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "6px 14px", borderRadius: 100,
                background: "rgba(99,102,241,0.10)",
                border: "1px solid rgba(99,102,241,0.28)",
                marginBottom: 28,
                animation: "fadeIn 0.6s ease both",
              }}
            >
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#6366f1", animation: "glow-pulse 2s ease infinite" }} />
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#818cf8", letterSpacing: "0.06em" }}>
                Premium Talent Billboard · Now Open
              </span>
            </div>

            {/* Headline */}
            <h1
              style={{
                fontFamily: "'Inter', sans-serif",
                fontWeight: 800,
                fontSize: "clamp(40px, 6.5vw, 78px)",
                lineHeight: 1.02,
                letterSpacing: "-0.035em",
                color: "#f0f2fa",
                marginBottom: 24,
                animation: "fadeInUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.1s both",
              }}
            >
              Stop Applying.<br />
              <span style={{ color: "#6366f1" }}>Start Being Found.</span>
            </h1>

            {/* Subheadline */}
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "clamp(15px, 1.8vw, 19px)",
                color: "#8492b8",
                lineHeight: 1.75,
                maxWidth: "50ch",
                marginBottom: 40,
                animation: "fadeInUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.2s both",
              }}
            >
              PixelHire is a talent billboard where professionals own premium sections and get discovered directly by companies hiring for Technical, Marketing, and Finance roles.
            </p>

            {/* CTAs */}
            <div
              style={{
                display: "flex", gap: 12, flexWrap: "wrap",
                marginBottom: 52,
                animation: "fadeInUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.3s both",
              }}
            >
              <Link
                href="/register"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "13px 28px",
                  background: "#6366f1",
                  borderRadius: 10,
                  color: "#fff",
                  fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 15,
                  textDecoration: "none",
                  boxShadow: "0 0 32px rgba(99,102,241,0.35)",
                  transition: "background 150ms, transform 120ms, box-shadow 150ms",
                  border: "1px solid #6366f1",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.background = "#5254cc";
                  (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-1px)";
                  (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 0 44px rgba(99,102,241,0.48)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.background = "#6366f1";
                  (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(0)";
                  (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 0 32px rgba(99,102,241,0.35)";
                }}
              >
                Claim Your Section
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
              </Link>

              <Link
                href="/grid/1"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "13px 28px",
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 10,
                  color: "#8492b8",
                  fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: 15,
                  textDecoration: "none",
                  transition: "border-color 150ms, color 150ms, transform 120ms",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(255,255,255,0.25)";
                  (e.currentTarget as HTMLAnchorElement).style.color = "#f0f2fa";
                  (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(255,255,255,0.12)";
                  (e.currentTarget as HTMLAnchorElement).style.color = "#8492b8";
                  (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(0)";
                }}
              >
                Browse the Billboard
              </Link>
            </div>

            {/* Trust stats */}
            <div
              style={{
                display: "flex", gap: 32, flexWrap: "wrap",
                animation: "fadeInUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.4s both",
              }}
            >
              {[
                { value: "9,000+", label: "Talent sections" },
                { value: "340+",   label: "Companies hiring" },
                { value: "3",      label: "Role categories" },
              ].map((s) => (
                <div key={s.label}>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 22, color: "#f0f2fa", lineHeight: 1 }}>
                    {s.value}
                  </div>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#4a5578", marginTop: 4 }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: billboard visual */}
          <div style={{ display: "flex", justifyContent: "center", flexShrink: 0 }}>
            <BillboardPreview />
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────────────────── */}
      <section
        ref={howRef.ref as React.RefObject<HTMLElement>}
        style={{
          padding: "80px clamp(20px, 5vw, 80px)",
          maxWidth: 1120,
          margin: "0 auto",
          opacity: howRef.visible ? 1 : 0,
          transform: howRef.visible ? "translateY(0)" : "translateY(32px)",
          transition: "opacity 0.7s ease, transform 0.7s cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#6366f1", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 14 }}>
            How it works
          </div>
          <h2 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: "clamp(28px, 4vw, 44px)", color: "#f0f2fa", lineHeight: 1.1, letterSpacing: "-0.025em" }}>
            Three steps to visibility
          </h2>
        </div>

        <div style={{ display: "flex", gap: "clamp(24px, 4vw, 56px)", alignItems: "flex-start", flexWrap: "wrap" }}>
          {/* Step connector lines */}
          <Step
            num="01"
            title="Build your profile"
            body="Write your bio, add your skills, upload a photo, and link your portfolio. You control the narrative — not a resume template."
            icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="7" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>}
          />

          <div style={{ width: 1, alignSelf: "stretch", background: "rgba(255,255,255,0.06)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 100 }}>
            <div style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#6366f1" }} />
            </div>
          </div>

          <Step
            num="02"
            title="Own your section"
            body="Purchase a premium section on the talent billboard. Choose your page tier — Page 1 gets maximum visibility, every page gets real exposure."
            icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>}
          />

          <div style={{ width: 1, alignSelf: "stretch", background: "rgba(255,255,255,0.06)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 100 }}>
            <div style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#6366f1" }} />
            </div>
          </div>

          <Step
            num="03"
            title="Get discovered"
            body="Companies browse the billboard and reach out to you directly. No more ignored applications — you are the ad."
            icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>}
          />
        </div>
      </section>

      {/* ── FOR WHO ───────────────────────────────────────────────────────── */}
      <section
        ref={forRef.ref as React.RefObject<HTMLElement>}
        style={{
          padding: "0 clamp(20px, 5vw, 80px) 80px",
          maxWidth: 1120,
          margin: "0 auto",
          opacity: forRef.visible ? 1 : 0,
          transform: forRef.visible ? "translateY(0)" : "translateY(32px)",
          transition: "opacity 0.7s ease, transform 0.7s cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {/* For Job Seekers */}
          <div
            style={{
              padding: "clamp(28px, 3.5vw, 48px)",
              background: "#0c0f1d",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 16,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, #6366f1, #818cf8)" }} />
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(99,102,241,0.10)", border: "1px solid rgba(99,102,241,0.20)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20, color: "#818cf8" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M20 7H4a2 2 0 00-2 2v6a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"/><circle cx="12" cy="12" r="2"/></svg>
            </div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#6366f1", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12 }}>
              For Job Seekers
            </div>
            <h3 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: "clamp(20px, 2.5vw, 28px)", color: "#f0f2fa", lineHeight: 1.2, marginBottom: 16, letterSpacing: "-0.02em" }}>
              Market yourself,<br />not your resume.
            </h3>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: "#8492b8", lineHeight: 1.8, marginBottom: 24 }}>
              Tired of sending 100 applications into the void? Own your section, tell your real story, and let companies find you. Limited spots mean real visibility.
            </p>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                "Full creative control over your profile",
                "Visible to 340+ actively hiring companies",
                "Category-specific exposure (Tech / Marketing / Finance)",
                "Personal brand that works while you sleep",
              ].map((item) => (
                <li key={item} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#8492b8", lineHeight: 1.5 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5" style={{ flexShrink: 0, marginTop: 1 }}><polyline points="20 6 9 17 4 12"/></svg>
                  {item}
                </li>
              ))}
            </ul>
            <Link href="/register" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 28, fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 14, color: "#818cf8", textDecoration: "none" }}>
              Claim your section
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
            </Link>
          </div>

          {/* For Companies */}
          <div
            style={{
              padding: "clamp(28px, 3.5vw, 48px)",
              background: "#0c0f1d",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 16,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, #f59e0b, #fbbf24)" }} />
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.20)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20, color: "#f59e0b" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>
            </div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#f59e0b", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12 }}>
              For Companies
            </div>
            <h3 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: "clamp(20px, 2.5vw, 28px)", color: "#f0f2fa", lineHeight: 1.2, marginBottom: 16, letterSpacing: "-0.02em" }}>
              Skip the stack.<br />Find the person.
            </h3>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: "#8492b8", lineHeight: 1.8, marginBottom: 24 }}>
              Done with outdated hiring pipelines? Browse high-intent professionals by category, see their real story, and reach out directly. No intermediaries.
            </p>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                "Browse curated talent by Technical, Marketing, or Finance",
                "See real profiles — not just keywords on a resume",
                "Direct contact with candidates who stand out",
                "Built with tech companies for a new hiring model",
              ].map((item) => (
                <li key={item} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#8492b8", lineHeight: 1.5 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" style={{ flexShrink: 0, marginTop: 1 }}><polyline points="20 6 9 17 4 12"/></svg>
                  {item}
                </li>
              ))}
            </ul>
            <a href="mailto:mybusinessemail@gmail.com" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 28, fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 14, color: "#f59e0b", textDecoration: "none" }}>
              Get early access
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
            </a>
          </div>
        </div>
      </section>

      {/* ── PROFILE CAROUSEL ──────────────────────────────────────────────── */}
      <div style={{ maxWidth: 1120, margin: "0 auto" }}>
        <ProfileCarousel />
      </div>

      {/* ── PRICING + COUNTDOWN ───────────────────────────────────────────── */}
      <section
        ref={pricingRef.ref as React.RefObject<HTMLElement>}
        style={{
          padding: "0 clamp(20px, 5vw, 80px) 80px",
          maxWidth: 1120,
          margin: "0 auto",
          opacity: pricingRef.visible ? 1 : 0,
          transform: pricingRef.visible ? "translateY(0)" : "translateY(32px)",
          transition: "opacity 0.7s ease, transform 0.7s cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        {/* Countdown */}
        <div
          style={{
            padding: "36px 32px",
            background: "#0c0f1d",
            border: "1px solid rgba(245,158,11,0.18)",
            borderRadius: 16,
            marginBottom: 32,
            textAlign: "center",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 60% 80% at 50% 120%, rgba(245,158,11,0.04) 0%, transparent 70%)", pointerEvents: "none" }} />
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#f59e0b", letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 20 }}>
            {countdown.done ? "Active hiring window open now" : "Active hiring begins in"}
          </div>
          {!countdown.done && (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-start", gap: "clamp(12px, 3vw, 32px)", marginBottom: 16 }}>
              <ClockUnit value={countdown.d} label="Days" />
              <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 36, color: "#232b42", paddingTop: 8 }}>:</span>
              <ClockUnit value={countdown.h} label="Hours" />
              <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 36, color: "#232b42", paddingTop: 8 }}>:</span>
              <ClockUnit value={countdown.m} label="Min" />
              <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 36, color: "#232b42", paddingTop: 8 }}>:</span>
              <ClockUnit value={countdown.s} label="Sec" />
            </div>
          )}
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: "#4a5578" }}>
            Secure your section before companies start browsing on July 1, 2026
          </p>
        </div>

        {/* Pricing header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#6366f1", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 12 }}>
            Choose your page
          </div>
          <h2 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: "clamp(24px, 3.5vw, 40px)", color: "#f0f2fa", letterSpacing: "-0.025em" }}>
            One-time section fee
          </h2>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, color: "#8492b8", marginTop: 10 }}>
            No subscription. Pay once, stay visible.
          </p>
        </div>

        {/* Tier cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
          {TIERS.map((tier) => (
            <Link
              key={tier.page}
              href={`/grid/${tier.page}`}
              style={{
                display: "block",
                padding: "24px 18px",
                background: tier.highlight ? "rgba(99,102,241,0.10)" : "#0c0f1d",
                border: tier.highlight ? "1px solid rgba(99,102,241,0.35)" : "1px solid rgba(255,255,255,0.07)",
                borderRadius: 12,
                textDecoration: "none",
                position: "relative",
                overflow: "hidden",
                transition: "border-color 160ms, transform 160ms",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.borderColor = tier.highlight ? "rgba(99,102,241,0.6)" : "rgba(255,255,255,0.18)";
                (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.borderColor = tier.highlight ? "rgba(99,102,241,0.35)" : "rgba(255,255,255,0.07)";
                (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(0)";
              }}
            >
              {tier.highlight && (
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, #6366f1, #818cf8)" }} />
              )}
              {tier.highlight && (
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: "#818cf8", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>
                  Most visible
                </div>
              )}
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: tier.highlight ? "#818cf8" : "#4a5578", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
                Page {tier.page}
              </div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 28, color: "#f0f2fa", letterSpacing: "-0.03em", lineHeight: 1, marginBottom: 6 }}>
                ${tier.price.toFixed(2)}
              </div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13, color: tier.highlight ? "#818cf8" : "#f0f2fa", marginBottom: 8 }}>
                {tier.label}
              </div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#4a5578", lineHeight: 1.5 }}>
                {tier.desc}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── LIVE GRID PREVIEW ─────────────────────────────────────────────── */}
      <section style={{ padding: "0 clamp(20px, 5vw, 80px) 80px", maxWidth: 1120, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#6366f1", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>
              Live billboard
            </div>
            <h2 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 22, color: "#f0f2fa", letterSpacing: "-0.02em" }}>
              See who's already on the board
            </h2>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {([1, 2, 3, 4, 5] as const).map((p) => (
              <button
                key={p}
                onClick={() => setActiveTab(p)}
                style={{
                  padding: "7px 18px",
                  background: activeTab === p ? "rgba(99,102,241,0.15)" : "transparent",
                  border: `1px solid ${activeTab === p ? "rgba(99,102,241,0.4)" : "rgba(255,255,255,0.07)"}`,
                  borderRadius: 8,
                  color: activeTab === p ? "#818cf8" : "#4a5578",
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 11,
                  cursor: "pointer",
                  letterSpacing: "0.06em",
                  transition: "all 150ms",
                }}
              >
                Page {p}
              </button>
            ))}
          </div>
        </div>

        <div style={{ height: "clamp(280px, 45vh, 520px)", width: "100%", borderRadius: 14, overflow: "hidden", border: "1px solid rgba(255,255,255,0.06)" }}>
          <PixelGrid sections={sections} onSectionClick={handleSectionClick} pageNumber={activeTab} loading={loading} />
        </div>

        <div style={{ textAlign: "center", marginTop: 20 }}>
          <Link href={`/grid/${activeTab}`} style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: "#4a5578", textDecoration: "none", letterSpacing: "0.06em", transition: "color 150ms" }}>
            Open full billboard — Page {activeTab} →
          </Link>
        </div>
      </section>

      {/* ── FINAL CTA ─────────────────────────────────────────────────────── */}
      <section
        ref={ctaRef.ref as React.RefObject<HTMLElement>}
        style={{
          margin: "0 clamp(20px, 5vw, 80px) 80px",
          maxWidth: 1080,
          marginLeft: "auto",
          marginRight: "auto",
          padding: "clamp(48px, 7vw, 80px) clamp(32px, 6vw, 80px)",
          background: "linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(7,8,15,0) 60%)",
          border: "1px solid rgba(99,102,241,0.22)",
          borderRadius: 20,
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
          opacity: ctaRef.visible ? 1 : 0,
          transform: ctaRef.visible ? "translateY(0)" : "translateY(32px)",
          transition: "opacity 0.7s ease, transform 0.7s cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 600, height: 400, background: "radial-gradient(ellipse, rgba(99,102,241,0.07) 0%, transparent 70%)", pointerEvents: "none" }} />

        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#6366f1", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 20 }}>
          Ready to get visible?
        </div>
        <h2 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: "clamp(30px, 5vw, 60px)", color: "#f0f2fa", lineHeight: 1.05, letterSpacing: "-0.03em", marginBottom: 20 }}>
          Your section is waiting.
        </h2>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "clamp(14px, 1.6vw, 17px)", color: "#8492b8", lineHeight: 1.75, maxWidth: "50ch", margin: "0 auto 36px" }}>
          Stop being invisible. Create your free account, choose your section, and let companies discover exactly who you are.
        </p>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link
            href="/register"
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "14px 36px",
              background: "#6366f1",
              borderRadius: 10,
              color: "#fff",
              fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 16,
              textDecoration: "none",
              boxShadow: "0 0 40px rgba(99,102,241,0.38)",
              letterSpacing: "-0.01em",
              transition: "background 150ms, transform 120ms",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background = "#5254cc";
              (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background = "#6366f1";
              (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(0)";
            }}
          >
            Create free account
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
          </Link>
          <Link href="/about" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "14px 28px", background: "transparent", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 10, color: "#8492b8", fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: 15, textDecoration: "none" }}>
            Read our story
          </Link>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer style={{ padding: "32px clamp(20px, 5vw, 80px)", borderTop: "1px solid rgba(255,255,255,0.05)", maxWidth: 1120, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 22, height: 22, borderRadius: 6, background: "linear-gradient(135deg, #6366f1, #818cf8)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
                <rect x="1" y="1" width="5" height="5" rx="1.5" fill="white" opacity="0.9" />
                <rect x="8" y="1" width="5" height="5" rx="1.5" fill="white" opacity="0.55" />
                <rect x="1" y="8" width="5" height="5" rx="1.5" fill="white" opacity="0.55" />
                <rect x="8" y="8" width="5" height="5" rx="1.5" fill="white" opacity="0.25" />
              </svg>
            </div>
            <span style={{ fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700, fontSize: 13, color: "#f0f2fa", letterSpacing: "0.04em" }}>PixelHire</span>
          </div>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            {[
              { href: "/", label: "Home" },
              { href: "/about", label: "About" },
              { href: "/contact", label: "Contact" },
              { href: "/grid/1", label: "Browse" },
            ].map((l) => (
              <Link key={l.href} href={l.href} style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#4a5578", textDecoration: "none", transition: "color 150ms" }}>
                {l.label}
              </Link>
            ))}
          </div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#232b42" }}>
            © 2026 PixelHire
          </div>
        </div>
      </footer>

      <SectionModal section={selected} onClose={() => setSelected(null)} onPurchase={handlePurchase} />
    </main>
  );
}
