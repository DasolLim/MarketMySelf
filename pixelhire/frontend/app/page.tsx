"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";

function useFadeIn() {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.10 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

function ProfileCardPreview({ name, role, category, color, delay }: {
  name: string; role: string; category: string; color: string; delay: number;
}) {
  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "1px solid rgba(0,0,0,0.10)",
        borderRadius: 12,
        padding: "16px 18px",
        boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
        animation: `fadeInUp 0.6s cubic-bezier(0.16,1,0.3,1) ${delay}ms both`,
        minWidth: 220,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: color + "22", border: `2px solid ${color}44`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8">
            <circle cx="12" cy="7" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
          </svg>
        </div>
        <div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 13, color: "#191919" }}>{name}</div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#555555" }}>{role}</div>
        </div>
      </div>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", background: color + "18", borderRadius: 100, marginBottom: 8 }}>
        <div style={{ width: 5, height: 5, borderRadius: "50%", background: color }} />
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 600, color: color }}>{category}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", background: "rgba(5,118,66,0.06)", border: "1px solid rgba(5,118,66,0.18)", borderRadius: 6 }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#057642" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#057642", fontWeight: 500 }}>Interview scheduled</span>
      </div>
    </div>
  );
}

function Step({ num, icon, title, body }: { num: string; icon: React.ReactNode; title: string; body: string }) {
  return (
    <div
      style={{
        flex: "1 1 0",
        minWidth: 0,
        background: "#FFFFFF",
        border: "1px solid rgba(0,0,0,0.08)",
        borderRadius: 12,
        padding: "28px 24px",
        boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
        position: "relative",
      }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "#0A66C2", borderRadius: "12px 12px 0 0" }} />
      <div style={{
        width: 44, height: 44, borderRadius: 10,
        background: "rgba(10,102,194,0.08)",
        border: "1px solid rgba(10,102,194,0.16)",
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 16, color: "#0A66C2",
      }}>
        {icon}
      </div>
      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#0A66C2", fontWeight: 700, letterSpacing: "0.10em", marginBottom: 8, textTransform: "uppercase" }}>
        Step {num}
      </div>
      <h3 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 17, color: "#191919", lineHeight: 1.35, marginBottom: 10 }}>
        {title}
      </h3>
      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: "#555555", lineHeight: 1.75 }}>
        {body}
      </p>
    </div>
  );
}


export default function HomePage() {
  const howRef = useFadeIn();
  const whyRef = useFadeIn();
  const forRef = useFadeIn();
  return (
    <main style={{ minHeight: "100vh", background: "#F3F2EF", color: "#191919", overflowX: "hidden" }}>

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          padding: "80px clamp(20px, 5vw, 80px) 60px",
          position: "relative",
          overflow: "hidden",
          background: "linear-gradient(170deg, #FFFFFF 0%, #F3F2EF 60%)",
        }}
      >
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "#0A66C2" }} />

        <div style={{ maxWidth: 1120, margin: "0 auto", width: "100%", display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", gap: "clamp(40px, 6vw, 100px)" }}>

          <div>
            <div
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "6px 14px", borderRadius: 100,
                background: "rgba(5,118,66,0.08)",
                border: "1px solid rgba(5,118,66,0.22)",
                marginBottom: 28,
                animation: "fadeIn 0.6s ease both",
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#057642" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#057642", fontWeight: 600, letterSpacing: "0.02em" }}>
                3× more interview callbacks than traditional applications
              </span>
            </div>

            <h1
              style={{
                fontFamily: "'Inter', sans-serif",
                fontWeight: 800,
                fontSize: "clamp(38px, 6vw, 72px)",
                lineHeight: 1.04,
                letterSpacing: "-0.035em",
                color: "#191919",
                marginBottom: 22,
                animation: "fadeInUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.1s both",
              }}
            >
              Stop Applying.<br />
              <span style={{ color: "#0A66C2" }}>Start Getting Found.</span>
            </h1>

            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "clamp(15px, 1.7vw, 18px)",
                color: "#555555",
                lineHeight: 1.8,
                maxWidth: "52ch",
                marginBottom: 36,
                animation: "fadeInUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.2s both",
              }}
            >
              PixelHire is a talent billboard where professionals own premium profile sections and get discovered directly by hiring companies — resulting in higher interview rates and faster job placement.
            </p>

            <div
              style={{
                display: "flex", gap: 12, flexWrap: "wrap",
                marginBottom: 48,
                animation: "fadeInUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.3s both",
              }}
            >
              <Link
                href="/register"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "13px 28px",
                  background: "#0A66C2",
                  borderRadius: 24,
                  color: "#fff",
                  fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 15,
                  textDecoration: "none",
                  transition: "background 150ms, transform 120ms",
                  letterSpacing: "0.01em",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.background = "#004182";
                  (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.background = "#0A66C2";
                  (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(0)";
                }}
              >
                Get started free
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
              </Link>

              <Link
                href="/about"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "13px 24px",
                  background: "transparent",
                  border: "1px solid rgba(0,0,0,0.20)",
                  borderRadius: 24,
                  color: "#555555",
                  fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 15,
                  textDecoration: "none",
                  transition: "border-color 150ms, color 150ms, transform 120ms",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(0,0,0,0.40)";
                  (e.currentTarget as HTMLAnchorElement).style.color = "#191919";
                  (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(0,0,0,0.20)";
                  (e.currentTarget as HTMLAnchorElement).style.color = "#555555";
                  (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(0)";
                }}
              >
                Our story
              </Link>
            </div>

            <div
              style={{
                display: "flex", gap: "clamp(20px, 4vw, 40px)", flexWrap: "wrap",
                animation: "fadeInUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.4s both",
                paddingTop: 20,
                borderTop: "1px solid rgba(0,0,0,0.08)",
              }}
            >
              {[
                { value: "87%",    label: "Interview callback rate" },
                { value: "340+",   label: "Companies actively hiring" },
                { value: "3×",     label: "More interviews vs. job boards" },
              ].map((s) => (
                <div key={s.label}>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 24, color: "#0A66C2", lineHeight: 1, letterSpacing: "-0.02em" }}>
                    {s.value}
                  </div>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#555555", marginTop: 4, fontWeight: 500 }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              flexShrink: 0,
              animation: "fadeIn 0.9s ease 0.3s both",
            }}
          >
            <ProfileCardPreview name="Alex Chen" role="Senior Software Engineer" category="Technical" color="#0A66C2" delay={400} />
            <ProfileCardPreview name="Maya Patel" role="Growth Marketing Lead" category="Marketing" color="#7C3AED" delay={520} />
            <ProfileCardPreview name="Jordan Lee" role="Financial Analyst" category="Finance" color="#057642" delay={640} />
          </div>
        </div>
      </section>

      {/* ── WHY HIGHER INTERVIEW RATE ─────────────────────────────────────── */}
      <section
        ref={whyRef.ref as React.RefObject<HTMLElement>}
        style={{
          padding: "80px clamp(20px, 5vw, 80px)",
          background: "#0A66C2",
          opacity: whyRef.visible ? 1 : 0,
          transform: whyRef.visible ? "translateY(0)" : "translateY(32px)",
          transition: "opacity 0.7s ease, transform 0.7s cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        <div style={{ maxWidth: 1120, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.65)", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 14 }}>
              Why PixelHire works
            </div>
            <h2 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: "clamp(26px, 4vw, 42px)", color: "#FFFFFF", lineHeight: 1.1, letterSpacing: "-0.025em", marginBottom: 14 }}>
              The interview advantage
            </h2>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 16, color: "rgba(255,255,255,0.75)", maxWidth: "52ch", margin: "0 auto", lineHeight: 1.75 }}>
              Traditional job boards bury you in thousands of applications. PixelHire puts you in front of companies who are actively browsing — no more getting lost in the stack.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
            {[
              {
                stat: "3×",
                title: "More interview callbacks",
                body: "Members who own a PixelHire section receive 3× more direct interview invitations compared to traditional job board applicants.",
                icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.81a19.79 19.79 0 01-3.07-8.68A2 2 0 012 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.41 7.87a16 16 0 006.72 6.72l1.23-.82a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg>,
              },
              {
                stat: "87%",
                title: "Interview callback rate",
                body: "87% of PixelHire profile owners receive at least one company-initiated interview request. Your profile works for you around the clock.",
                icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
              },
              {
                stat: "340+",
                title: "Companies actively browsing",
                body: "Over 340 companies spanning tech startups to enterprise firms browse PixelHire for Technical, Marketing, and Finance talent every month.",
                icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>,
              },
              {
                stat: "1×",
                title: "One-time fee, lifelong visibility",
                body: "Pay once and stay visible until the hiring window closes. No subscription, no renewals. Your profile competes 24/7 without additional cost.",
                icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
              },
            ].map((item) => (
              <div
                key={item.stat}
                style={{
                  background: "rgba(255,255,255,0.10)",
                  border: "1px solid rgba(255,255,255,0.18)",
                  borderRadius: 12,
                  padding: "28px 24px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                  <div style={{ color: "rgba(255,255,255,0.85)" }}>{item.icon}</div>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 28, color: "#FFFFFF", letterSpacing: "-0.025em" }}>{item.stat}</div>
                </div>
                <h3 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 15, color: "#FFFFFF", marginBottom: 8, lineHeight: 1.3 }}>
                  {item.title}
                </h3>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.70)", lineHeight: 1.75 }}>
                  {item.body}
                </p>
              </div>
            ))}
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
        <div style={{ textAlign: "center", marginBottom: 52 }}>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#0A66C2", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 14 }}>
            How it works
          </div>
          <h2 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: "clamp(26px, 4vw, 42px)", color: "#191919", lineHeight: 1.1, letterSpacing: "-0.025em" }}>
            Three steps to your next interview
          </h2>
        </div>

        <div style={{ display: "flex", gap: 16, alignItems: "stretch", flexWrap: "wrap" }}>
          <Step
            num="01"
            title="Build your profile"
            body="Write your bio, add skills, upload a photo, and link your portfolio. You control the narrative — not a resume template."
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="7" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>}
          />
          <Step
            num="02"
            title="Own your section"
            body="Purchase a premium billboard section. Page 1 gets the highest company traffic — every page delivers real, direct exposure to hiring managers."
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>}
          />
          <Step
            num="03"
            title="Get interviewed"
            body="Companies browse by category and reach out to you directly. No more ignored applications — you become the candidate they found, not the one who applied."
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>}
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
          <div
            style={{
              padding: "clamp(28px, 3.5vw, 44px)",
              background: "#FFFFFF",
              border: "1px solid rgba(0,0,0,0.08)",
              borderRadius: 16,
              position: "relative",
              overflow: "hidden",
              boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
            }}
          >
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "#0A66C2" }} />
            <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(10,102,194,0.08)", border: "1px solid rgba(10,102,194,0.18)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18, color: "#0A66C2" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="7" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
            </div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, color: "#0A66C2", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>
              For Job Seekers
            </div>
            <h3 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: "clamp(18px, 2.5vw, 26px)", color: "#191919", lineHeight: 1.2, marginBottom: 14, letterSpacing: "-0.02em" }}>
              Market yourself,<br />not your resume.
            </h3>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: "#555555", lineHeight: 1.8, marginBottom: 22 }}>
              Stop sending 100 applications into the void. Own your section, tell your real story, and let hiring companies come to you.
            </p>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
              {[
                "Full creative control over your profile",
                "Visible to 340+ actively hiring companies",
                "Category-specific exposure (Tech / Marketing / Finance)",
                "87% average interview callback rate",
              ].map((item) => (
                <li key={item} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#555555", lineHeight: 1.5 }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#057642" strokeWidth="2.5" style={{ flexShrink: 0, marginTop: 2 }}><polyline points="20 6 9 17 4 12"/></svg>
                  {item}
                </li>
              ))}
            </ul>
            <Link href="/register" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 22px", background: "#0A66C2", borderRadius: 20, color: "#fff", fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 14, textDecoration: "none" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "#004182"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "#0A66C2"; }}
            >
              Claim your section
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
            </Link>
          </div>

          <div
            style={{
              padding: "clamp(28px, 3.5vw, 44px)",
              background: "#FFFFFF",
              border: "1px solid rgba(0,0,0,0.08)",
              borderRadius: 16,
              position: "relative",
              overflow: "hidden",
              boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
            }}
          >
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "#B45309" }} />
            <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(180,83,9,0.06)", border: "1px solid rgba(180,83,9,0.18)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18, color: "#B45309" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>
            </div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, color: "#B45309", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>
              For Companies
            </div>
            <h3 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: "clamp(18px, 2.5vw, 26px)", color: "#191919", lineHeight: 1.2, marginBottom: 14, letterSpacing: "-0.02em" }}>
              Skip the stack.<br />Find the person.
            </h3>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: "#555555", lineHeight: 1.8, marginBottom: 22 }}>
              Done with outdated hiring pipelines? Browse curated professionals by category, see their real story, and reach out directly.
            </p>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
              {[
                "Browse curated talent by Technical, Marketing, or Finance",
                "See real profiles — not just keywords on a resume",
                "Direct contact with pre-qualified candidates",
                "Hiring window opens July 1, 2026",
              ].map((item) => (
                <li key={item} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#555555", lineHeight: 1.5 }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#057642" strokeWidth="2.5" style={{ flexShrink: 0, marginTop: 2 }}><polyline points="20 6 9 17 4 12"/></svg>
                  {item}
                </li>
              ))}
            </ul>
            <a href="mailto:mybusinessemail@gmail.com"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 22px", background: "transparent", border: "1px solid rgba(0,0,0,0.20)", borderRadius: 20, color: "#555555", fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 14, textDecoration: "none" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(0,0,0,0.40)"; (e.currentTarget as HTMLAnchorElement).style.color = "#191919"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(0,0,0,0.20)"; (e.currentTarget as HTMLAnchorElement).style.color = "#555555"; }}
            >
              Get early access
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer style={{ padding: "28px clamp(20px, 5vw, 80px)", borderTop: "1px solid rgba(0,0,0,0.10)", maxWidth: 1120, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 22, height: 22, borderRadius: 6, background: "#0A66C2", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
                <rect x="1" y="1" width="5" height="5" rx="1.5" fill="white" opacity="0.95" />
                <rect x="8" y="1" width="5" height="5" rx="1.5" fill="white" opacity="0.65" />
                <rect x="1" y="8" width="5" height="5" rx="1.5" fill="white" opacity="0.65" />
                <rect x="8" y="8" width="5" height="5" rx="1.5" fill="white" opacity="0.35" />
              </svg>
            </div>
            <span style={{ fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700, fontSize: 13, color: "#191919", letterSpacing: "0.04em" }}>PixelHire</span>
          </div>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            {[
              { href: "/", label: "Home" },
              { href: "/about", label: "About" },
              { href: "/contact", label: "Contact" },
            ].map((l) => (
              <Link key={l.href} href={l.href} style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#9CA3AF", textDecoration: "none", transition: "color 150ms", fontWeight: 500 }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#191919"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#9CA3AF"; }}
              >
                {l.label}
              </Link>
            ))}
          </div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#D1D5DB", fontWeight: 500 }}>
            © 2026 PixelHire
          </div>
        </div>
      </footer>

      <style>{`@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } } @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </main>
  );
}
