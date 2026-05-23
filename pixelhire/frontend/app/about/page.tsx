"use client";

import React, { useRef, useState, useEffect } from "react";
import Link from "next/link";

function useFadeIn(threshold = 0.10) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

const FX = {
  visible:    { opacity: 1, transform: "translateY(0)"   },
  hidden:     { opacity: 0, transform: "translateY(28px)" },
  transition: "opacity 0.7s ease, transform 0.7s cubic-bezier(0.16,1,0.3,1)",
};

const FEATURES = [
  {
    num: "01",
    title: "Limited, exclusive spots",
    body: "No overcrowded job boards. Every profile gets real visibility because scarcity forces quality. When space is finite, presence is meaningful.",
    color: "#0A66C2",
  },
  {
    num: "02",
    title: "Hiring countdowns",
    body: "Know exactly when opportunities open. Prepare, position yourself, and be ready on day one — not scrambling after the fact.",
    color: "#057642",
  },
  {
    num: "03",
    title: "Real transparency",
    body: "See who gets selected and hired. No more black boxes. No more mystery rejections. The process becomes visible for everyone.",
    color: "#B45309",
  },
  {
    num: "04",
    title: "A new hiring approach",
    body: "Built in direct collaboration with tech companies. The full details are coming soon. The direction is already clear.",
    color: "#7C3AED",
  },
];

export default function AboutPage() {
  const s1  = useFadeIn();
  const s2  = useFadeIn();
  const s3  = useFadeIn();
  const s4  = useFadeIn();
  const s5  = useFadeIn();
  const s6  = useFadeIn();
  const s7  = useFadeIn();

  return (
    <main style={{ background: "#F3F2EF", color: "#191919", overflowX: "hidden", paddingTop: 60 }}>
      {/* Top accent */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 3, background: "#0A66C2", zIndex: 199 }} />

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section
        style={{
          minHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: "clamp(60px, 10vh, 120px) clamp(24px, 6vw, 100px) clamp(52px, 8vh, 96px)",
          position: "relative",
          overflow: "hidden",
          background: "linear-gradient(170deg, #FFFFFF 0%, #F3F2EF 70%)",
        }}
      >
        {/* Ghost text */}
        <div
          style={{
            position: "absolute",
            top: "2%", right: "-0.02em",
            fontFamily: "'Inter', sans-serif",
            fontWeight: 800,
            fontSize: "clamp(80px, 18vw, 240px)",
            color: "rgba(10,102,194,0.04)",
            letterSpacing: "-0.05em",
            lineHeight: 0.88,
            userSelect: "none",
            pointerEvents: "none",
            textAlign: "right",
            lineBreak: "anywhere" as never,
          }}
        >
          INVIS<br />IBLE.
        </div>

        <div style={{ position: "relative", maxWidth: 760, animation: "fadeInUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.1s both" }}>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#B45309", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 28 }}>
            The story behind PixelHire
          </div>
          <h1
            style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 800,
              fontSize: "clamp(32px, 5.5vw, 66px)",
              color: "#191919",
              lineHeight: 1.05,
              letterSpacing: "-0.035em",
              marginBottom: 28,
            }}
          >
            Tired of sending<br />100+ applications<br />just to get ignored?
          </h1>
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "clamp(15px, 1.7vw, 18px)",
              color: "#555555",
              lineHeight: 1.8,
              maxWidth: "52ch",
            }}
          >
            What if recruiters could actually see who you are — not just a piece of paper? Your personality, passion, and real value?
          </p>
        </div>
      </section>

      {/* ── THE PROBLEM ───────────────────────────────────────────────────── */}
      <section
        ref={s1.ref as React.RefObject<HTMLElement>}
        style={{
          padding: "0 clamp(24px, 6vw, 100px) clamp(64px, 9vh, 120px)",
          ...(s1.visible ? FX.visible : FX.hidden),
          transition: FX.transition,
        }}
      >
        <div style={{ width: "100%", height: 1, background: "rgba(0,0,0,0.08)", marginBottom: "clamp(44px, 7vh, 88px)" }} />
        <div style={{ display: "grid", gridTemplateColumns: "minmax(60px, 140px) 1fr", gap: "clamp(32px, 6vw, 96px)", alignItems: "start" }}>
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", paddingTop: 8 }}>
            The problem
          </span>
          <div>
            <div style={{ marginBottom: 36 }}>
              <h2 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: "clamp(20px, 3.2vw, 42px)", color: "#191919", lineHeight: 1.15, letterSpacing: "-0.025em", marginBottom: 6 }}>
                Your resume reduces you to bullet points.
              </h2>
              <h2 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: "clamp(20px, 3.2vw, 42px)", color: "#191919", lineHeight: 1.15, letterSpacing: "-0.025em", marginBottom: 6 }}>
                Your personality, passion, real value?
              </h2>
              <h2 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: "clamp(20px, 3.2vw, 42px)", color: "#B45309", lineHeight: 1.15, letterSpacing: "-0.025em" }}>
                Hidden.
              </h2>
            </div>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "clamp(15px, 1.5vw, 17px)", color: "#555555", lineHeight: 1.85, maxWidth: "56ch" }}>
              The hiring system was built for efficiency — not for people. It filters, ranks, and discards without ever asking what you can actually do, or who you genuinely are.
            </p>
          </div>
        </div>
      </section>

      {/* ── FOUNDER QUOTE ─────────────────────────────────────────────────── */}
      <section
        ref={s2.ref as React.RefObject<HTMLElement>}
        style={{
          padding: "0 clamp(24px, 6vw, 100px) clamp(64px, 9vh, 120px)",
          ...(s2.visible ? FX.visible : FX.hidden),
          transition: FX.transition,
        }}
      >
        <div style={{ maxWidth: 640, marginLeft: "auto" }}>
          <div style={{ borderTop: "1px solid rgba(0,0,0,0.08)", paddingTop: "clamp(32px, 5vh, 56px)" }}>
            <blockquote
              style={{
                margin: 0,
                padding: "28px 36px",
                background: "#FFFFFF",
                border: "1px solid rgba(0,0,0,0.08)",
                borderRadius: 12,
                borderLeft: "4px solid #0A66C2",
                boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
              }}
            >
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontStyle: "italic",
                  fontWeight: 400,
                  fontSize: "clamp(16px, 2vw, 22px)",
                  color: "#555555",
                  lineHeight: 1.85,
                  marginBottom: 20,
                }}
              >
                &ldquo;I&apos;ve been there. Endless rejections. No replies. Confidence dropping every day. Feeling invisible in a saturated job market.&rdquo;
              </p>
              <cite style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#9CA3AF", fontWeight: 600, letterSpacing: "0.10em", textTransform: "uppercase", fontStyle: "normal" }}>
                — The founder of PixelHire
              </cite>
            </blockquote>
          </div>
        </div>
      </section>

      {/* ── THE TURN ──────────────────────────────────────────────────────── */}
      <section
        ref={s3.ref as React.RefObject<HTMLElement>}
        style={{
          padding: "0 clamp(24px, 6vw, 100px) clamp(64px, 9vh, 120px)",
          ...(s3.visible ? FX.visible : FX.hidden),
          transition: FX.transition,
        }}
      >
        <div style={{ position: "relative", maxWidth: 760 }}>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#0A66C2", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 24 }}>
            The difference
          </div>
          <h2 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: "clamp(26px, 4.5vw, 58px)", color: "#191919", lineHeight: 1.07, letterSpacing: "-0.03em", marginBottom: 28 }}>
            So I built something different.
          </h2>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "clamp(15px, 1.6vw, 17px)", color: "#555555", lineHeight: 1.85, maxWidth: "55ch", marginBottom: 18 }}>
            A platform where you don&apos;t just &ldquo;apply&rdquo; — you{" "}
            <span style={{ color: "#0A66C2", fontWeight: 700 }}>market yourself</span>. Where recruiters discover YOU — your story, your energy, your potential.
          </p>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "clamp(15px, 1.6vw, 17px)", color: "#555555", lineHeight: 1.85, maxWidth: "55ch" }}>
            Not another job board. A billboard. Your face, your name, your work — visible to every company that matters in your field.
          </p>
        </div>
      </section>

      {/* ── THE TRUTH ─────────────────────────────────────────────────────── */}
      <section
        ref={s4.ref as React.RefObject<HTMLElement>}
        style={{
          padding: "0 clamp(24px, 6vw, 100px) clamp(64px, 9vh, 120px)",
          ...(s4.visible ? FX.visible : FX.hidden),
          transition: FX.transition,
        }}
      >
        <div
          style={{
            padding: "clamp(32px, 4.5vw, 52px)",
            background: "rgba(180,83,9,0.04)",
            border: "1px solid rgba(180,83,9,0.18)",
            borderRadius: 16,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "#B45309" }} />
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, color: "#B45309", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 16 }}>
            The truth
          </div>
          <h2 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: "clamp(20px, 3vw, 36px)", color: "#191919", lineHeight: 1.15, letterSpacing: "-0.025em", marginBottom: 16 }}>
            This isn&apos;t easy.
          </h2>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "clamp(14px, 1.5vw, 16px)", color: "#555555", lineHeight: 1.85, maxWidth: "62ch" }}>
            It takes strategy, creativity, and effort. Because standing out should require more than clicking &ldquo;Apply.&rdquo; If you want to be seen, you have to show up — with intention, with substance, with a profile that earns attention. That&apos;s not a flaw in the system. That&apos;s the point.
          </p>
        </div>
      </section>

      {/* ── WHAT'S DIFFERENT ──────────────────────────────────────────────── */}
      <section
        ref={s5.ref as React.RefObject<HTMLElement>}
        style={{
          padding: "0 clamp(24px, 6vw, 100px) clamp(64px, 9vh, 120px)",
          ...(s5.visible ? FX.visible : FX.hidden),
          transition: FX.transition,
        }}
      >
        <div style={{ width: "100%", height: 1, background: "rgba(0,0,0,0.08)", marginBottom: "clamp(40px, 6vh, 80px)" }} />
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#0A66C2", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 14 }}>
          What makes this different
        </div>
        <h2 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: "clamp(22px, 3.5vw, 42px)", color: "#191919", letterSpacing: "-0.025em", marginBottom: "clamp(32px, 5vh, 52px)" }}>
          Four things you won&apos;t find elsewhere
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
          {FEATURES.map((f) => (
            <div
              key={f.num}
              style={{
                background: "#FFFFFF",
                border: "1px solid rgba(0,0,0,0.08)",
                borderRadius: 14,
                padding: "clamp(24px, 3.5vw, 40px)",
                position: "relative",
                overflow: "hidden",
                boxShadow: "0 1px 8px rgba(0,0,0,0.05)",
                transition: "border-color 200ms, transform 200ms, box-shadow 200ms",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(0,0,0,0.18)";
                (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
                (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 20px rgba(0,0,0,0.09)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(0,0,0,0.08)";
                (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
                (e.currentTarget as HTMLDivElement).style.boxShadow = "0 1px 8px rgba(0,0,0,0.05)";
              }}
            >
              <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: 3, background: f.color }} />
              <div
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 800,
                  fontSize: "clamp(36px, 5vw, 60px)",
                  color: f.color + "18",
                  letterSpacing: "-0.04em",
                  lineHeight: 1,
                  marginBottom: 20,
                }}
              >
                {f.num}
              </div>
              <h3 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: "clamp(15px, 1.5vw, 17px)", color: "#191919", letterSpacing: "-0.01em", marginBottom: 12 }}>
                {f.title}
              </h3>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: "#555555", lineHeight: 1.8 }}>
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── THE MISSION ───────────────────────────────────────────────────── */}
      <section
        ref={s6.ref as React.RefObject<HTMLElement>}
        style={{
          padding: "0 clamp(24px, 6vw, 100px) clamp(64px, 9vh, 120px)",
          position: "relative",
          overflow: "hidden",
          ...(s6.visible ? FX.visible : FX.hidden),
          transition: FX.transition,
        }}
      >
        <div
          style={{
            position: "absolute",
            bottom: "-0.08em", right: "-0.02em",
            fontFamily: "'Inter', sans-serif",
            fontWeight: 800,
            fontSize: "clamp(72px, 16vw, 200px)",
            color: "rgba(10,102,194,0.04)",
            letterSpacing: "-0.04em",
            lineHeight: 0.88,
            userSelect: "none",
            pointerEvents: "none",
          }}
        >
          SEEN.
        </div>
        <div style={{ position: "relative", maxWidth: 700 }}>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#0A66C2", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 24 }}>
            The mission
          </div>
          <h2 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: "clamp(24px, 4.2vw, 52px)", color: "#191919", lineHeight: 1.08, letterSpacing: "-0.03em", marginBottom: 24 }}>
            This isn&apos;t just about getting hired faster.
          </h2>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "clamp(15px, 1.6vw, 17px)", color: "#555555", lineHeight: 1.85, maxWidth: "54ch", marginBottom: 18 }}>
            It&apos;s about being{" "}
            <span style={{ color: "#191919", fontWeight: 700 }}>seen for who you truly are</span> — and building your personal brand in the process.
          </p>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "clamp(15px, 1.6vw, 17px)", color: "#555555", lineHeight: 1.85, maxWidth: "54ch" }}>
            If you&apos;re tired of the old system, this might be your way out.
          </p>
        </div>
      </section>

      {/* ── FOR COMPANIES ─────────────────────────────────────────────────── */}
      <section
        ref={s7.ref as React.RefObject<HTMLElement>}
        style={{
          padding: "0 clamp(24px, 6vw, 100px) clamp(80px, 12vh, 140px)",
          ...(s7.visible ? FX.visible : FX.hidden),
          transition: FX.transition,
        }}
      >
        <div style={{ width: "100%", height: 1, background: "rgba(0,0,0,0.08)", marginBottom: "clamp(44px, 7vh, 80px)" }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "clamp(40px, 6vw, 80px)", alignItems: "center" }}>
          <div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 18 }}>
              For companies
            </div>
            <h2 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: "clamp(20px, 3vw, 38px)", color: "#191919", lineHeight: 1.12, letterSpacing: "-0.025em", marginBottom: 18 }}>
              Done with outdated hiring methods?
            </h2>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "clamp(14px, 1.4vw, 16px)", color: "#555555", lineHeight: 1.85, maxWidth: "44ch" }}>
              We&apos;re building a new approach to hiring in direct collaboration with tech companies. If you want in early — or just want to talk — reach out.
            </p>
          </div>

          <a
            href="mailto:mybusinessemail@gmail.com"
            style={{
              display: "block",
              padding: "clamp(28px, 4vw, 40px)",
              background: "#FFFFFF",
              border: "1px solid rgba(0,0,0,0.10)",
              borderRadius: 16,
              textDecoration: "none",
              transition: "border-color 200ms, transform 150ms, box-shadow 200ms",
              position: "relative",
              overflow: "hidden",
              boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.borderColor = "#0A66C2";
              (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-2px)";
              (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 6px 24px rgba(10,102,194,0.10)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(0,0,0,0.10)";
              (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(0)";
              (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 2px 12px rgba(0,0,0,0.06)";
            }}
          >
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "#0A66C2" }} />
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12 }}>
              Get in touch
            </div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: "clamp(14px, 1.4vw, 16px)", color: "#0A66C2", marginBottom: 8 }}>
              mybusinessemail@gmail.com
            </div>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: "#9CA3AF" }}>
              Let&apos;s change how hiring works.
            </p>
          </a>
        </div>

        {/* Final CTA */}
        <div
          style={{
            textAlign: "center",
            marginTop: "clamp(52px, 8vh, 100px)",
            padding: "clamp(40px, 6vw, 72px) clamp(24px, 5vw, 64px)",
            background: "#191919",
            borderRadius: 20,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "#0A66C2" }} />
          <h2 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: "clamp(28px, 5vw, 60px)", color: "#FFFFFF", lineHeight: 1.05, letterSpacing: "-0.03em", marginBottom: 32 }}>
            Stop being invisible.
          </h2>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link
              href="/register"
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "14px 36px",
                background: "#0A66C2",
                borderRadius: 24,
                color: "#fff",
                fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 15,
                textDecoration: "none",
                transition: "background 150ms, transform 120ms",
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
              Claim your section
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
            </Link>
            <Link href="/contact" style={{ display: "inline-flex", alignItems: "center", padding: "14px 32px", background: "transparent", border: "1px solid rgba(255,255,255,0.18)", borderRadius: 24, color: "rgba(255,255,255,0.70)", fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 15, textDecoration: "none" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#fff"; (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(255,255,255,0.40)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,0.70)"; (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(255,255,255,0.18)"; }}
            >
              Contact us
            </Link>
          </div>
        </div>
      </section>

      <style>{`@keyframes fadeInUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </main>
  );
}
