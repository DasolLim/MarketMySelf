"use client";

import React, { useRef, useState, useEffect } from "react";
import Link from "next/link";

function useFadeIn(threshold = 0.12) {
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
  visible:   { opacity: 1, transform: "translateY(0)"  },
  hidden:    { opacity: 0, transform: "translateY(28px)" },
  transition: "opacity 0.7s ease, transform 0.7s cubic-bezier(0.16,1,0.3,1)",
};

const FEATURES = [
  {
    num: "01",
    title: "Limited, exclusive spots",
    body: "No overcrowded job boards. Every profile gets real visibility because scarcity forces quality. When space is finite, presence is meaningful.",
    color: "#6366f1",
  },
  {
    num: "02",
    title: "Hiring countdowns",
    body: "Know exactly when opportunities open. Prepare, position yourself, and be ready on day one — not scrambling after the fact.",
    color: "#22d3ee",
  },
  {
    num: "03",
    title: "Real transparency",
    body: "See who gets selected and hired. No more black boxes. No more mystery rejections. The process becomes visible for everyone.",
    color: "#34d399",
  },
  {
    num: "04",
    title: "A new hiring approach",
    body: "Built in direct collaboration with tech companies. The full details are coming soon. The direction is already clear.",
    color: "#c084fc",
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
    <main style={{ background: "#07080f", color: "#f0f2fa", overflowX: "hidden", paddingTop: 60 }}>

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
        }}
      >
        {/* Background */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(255,255,255,0.02) 1px, transparent 1px)", backgroundSize: "36px 36px", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: "15%", right: "8%", width: 600, height: 600, background: "radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 65%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "10%", left: "10%", width: 400, height: 400, background: "radial-gradient(circle, rgba(245,158,11,0.05) 0%, transparent 65%)", pointerEvents: "none" }} />

        {/* Ghost text texture */}
        <div
          style={{
            position: "absolute",
            top: "2%", right: "-0.02em",
            fontFamily: "'Inter', sans-serif",
            fontWeight: 800,
            fontSize: "clamp(80px, 18vw, 240px)",
            color: "rgba(255,255,255,0.018)",
            letterSpacing: "-0.05em",
            lineHeight: 0.88,
            userSelect: "none",
            pointerEvents: "none",
            textAlign: "right",
            lineBreak: "anywhere" as any,
          }}
        >
          INVIS<br />IBLE.
        </div>

        <div style={{ position: "relative", maxWidth: 760, animation: "fadeInUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.1s both" }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#f59e0b", letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 28 }}>
            The story behind PixelHire
          </div>
          <h1
            style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 800,
              fontSize: "clamp(34px, 5.5vw, 68px)",
              color: "#f0f2fa",
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
              fontSize: "clamp(15px, 1.7vw, 19px)",
              color: "#8492b8",
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
        <div style={{ width: "100%", height: 1, background: "rgba(255,255,255,0.06)", marginBottom: "clamp(44px, 7vh, 88px)" }} />
        <div style={{ display: "grid", gridTemplateColumns: "minmax(60px, 140px) 1fr", gap: "clamp(32px, 6vw, 96px)", alignItems: "start" }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#232b42", letterSpacing: "0.16em", textTransform: "uppercase", paddingTop: 8 }}>
            The problem
          </span>
          <div>
            <div style={{ marginBottom: 36 }}>
              <h2 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: "clamp(22px, 3.2vw, 44px)", color: "#f0f2fa", lineHeight: 1.15, letterSpacing: "-0.025em", marginBottom: 6 }}>
                Your resume reduces you to bullet points.
              </h2>
              <h2 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: "clamp(22px, 3.2vw, 44px)", color: "#f0f2fa", lineHeight: 1.15, letterSpacing: "-0.025em", marginBottom: 6 }}>
                Your personality, passion, real value?
              </h2>
              <h2 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: "clamp(22px, 3.2vw, 44px)", color: "#f59e0b", lineHeight: 1.15, letterSpacing: "-0.025em" }}>
                Hidden.
              </h2>
            </div>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "clamp(15px, 1.5vw, 18px)", color: "#8492b8", lineHeight: 1.85, maxWidth: "56ch" }}>
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
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "clamp(32px, 5vh, 56px)" }}>
            <blockquote style={{ margin: 0 }}>
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontStyle: "italic",
                  fontWeight: 300,
                  fontSize: "clamp(17px, 2vw, 24px)",
                  color: "#8492b8",
                  lineHeight: 1.85,
                  marginBottom: 24,
                }}
              >
                "I've been there. Endless rejections. No replies. Confidence dropping every day. Feeling invisible in a saturated job market."
              </p>
              <cite style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#4a5578", letterSpacing: "0.14em", textTransform: "uppercase", fontStyle: "normal" }}>
                The founder of PixelHire
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
          position: "relative",
          overflow: "hidden",
          ...(s3.visible ? FX.visible : FX.hidden),
          transition: FX.transition,
        }}
      >
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 700, height: 500, background: "radial-gradient(ellipse, rgba(99,102,241,0.04) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "relative", maxWidth: 760 }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#6366f1", letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 24 }}>
            The difference
          </div>
          <h2 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: "clamp(28px, 4.5vw, 60px)", color: "#f0f2fa", lineHeight: 1.07, letterSpacing: "-0.03em", marginBottom: 28 }}>
            So I built something different.
          </h2>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "clamp(15px, 1.6vw, 18px)", color: "#8492b8", lineHeight: 1.85, maxWidth: "55ch", marginBottom: 18 }}>
            A platform where you don't just "apply" — you{" "}
            <span style={{ color: "#818cf8", fontWeight: 600 }}>market yourself</span>. Where recruiters discover YOU — your story, your energy, your potential.
          </p>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "clamp(15px, 1.6vw, 18px)", color: "#8492b8", lineHeight: 1.85, maxWidth: "55ch" }}>
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
            padding: "clamp(32px, 4.5vw, 56px)",
            background: "rgba(245,158,11,0.04)",
            border: "1px solid rgba(245,158,11,0.16)",
            borderRadius: 16,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, #f59e0b, transparent)" }} />
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#f59e0b", letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 18 }}>
            The truth
          </div>
          <h2 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: "clamp(22px, 3vw, 38px)", color: "#f0f2fa", lineHeight: 1.15, letterSpacing: "-0.025em", marginBottom: 18 }}>
            This isn't easy.
          </h2>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "clamp(14px, 1.5vw, 17px)", color: "#8492b8", lineHeight: 1.85, maxWidth: "62ch" }}>
            It takes strategy, creativity, and effort. Because standing out should require more than clicking "Apply." If you want to be seen, you have to show up — with intention, with substance, with a profile that earns attention. That's not a flaw in the system. That's the point.
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
        <div style={{ width: "100%", height: 1, background: "rgba(255,255,255,0.06)", marginBottom: "clamp(40px, 6vh, 80px)" }} />
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#6366f1", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 16 }}>
          What makes this different
        </div>
        <h2 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: "clamp(24px, 3.5vw, 44px)", color: "#f0f2fa", letterSpacing: "-0.025em", marginBottom: "clamp(32px, 5vh, 52px)" }}>
          Four things you won't find elsewhere
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
          {FEATURES.map((f) => (
            <div
              key={f.num}
              style={{
                background: "#0c0f1d",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 14,
                padding: "clamp(24px, 3.5vw, 44px)",
                position: "relative",
                overflow: "hidden",
                transition: "border-color 200ms",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.14)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.07)"; }}
            >
              <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: 2, background: `linear-gradient(90deg, ${f.color}, transparent)` }} />
              <div
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 800,
                  fontSize: "clamp(40px, 5vw, 64px)",
                  color: "rgba(255,255,255,0.04)",
                  letterSpacing: "-0.04em",
                  lineHeight: 1,
                  marginBottom: 20,
                }}
              >
                {f.num}
              </div>
              <h3 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: "clamp(15px, 1.5vw, 18px)", color: "#f0f2fa", letterSpacing: "-0.01em", marginBottom: 12 }}>
                {f.title}
              </h3>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: "#8492b8", lineHeight: 1.8 }}>
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
        <div style={{ position: "absolute", bottom: "-0.08em", right: "-0.02em", fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: "clamp(72px, 16vw, 200px)", color: "rgba(255,255,255,0.02)", letterSpacing: "-0.04em", lineHeight: 0.88, userSelect: "none", pointerEvents: "none" }}>
          SEEN.
        </div>
        <div style={{ position: "relative", maxWidth: 700 }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#6366f1", letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 24 }}>
            The mission
          </div>
          <h2 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: "clamp(26px, 4.2vw, 54px)", color: "#f0f2fa", lineHeight: 1.08, letterSpacing: "-0.03em", marginBottom: 24 }}>
            This isn't just about getting hired faster.
          </h2>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "clamp(15px, 1.6vw, 18px)", color: "#8492b8", lineHeight: 1.85, maxWidth: "54ch", marginBottom: 18 }}>
            It's about being{" "}
            <span style={{ color: "#f0f2fa", fontWeight: 600 }}>seen for who you truly are</span> — and building your personal brand in the process.
          </p>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "clamp(15px, 1.6vw, 18px)", color: "#8492b8", lineHeight: 1.85, maxWidth: "54ch" }}>
            If you're tired of the old system, this might be your way out.
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
        <div style={{ width: "100%", height: 1, background: "rgba(255,255,255,0.06)", marginBottom: "clamp(44px, 7vh, 80px)" }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "clamp(40px, 6vw, 96px)", alignItems: "center" }}>
          <div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#232b42", letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 18 }}>
              For companies
            </div>
            <h2 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: "clamp(22px, 3vw, 40px)", color: "#f0f2fa", lineHeight: 1.12, letterSpacing: "-0.025em", marginBottom: 18 }}>
              Done with outdated hiring methods?
            </h2>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "clamp(14px, 1.4vw, 17px)", color: "#8492b8", lineHeight: 1.85, maxWidth: "44ch" }}>
              We're building a new approach to hiring in direct collaboration with tech companies. If you want in early — or just want to talk — reach out.
            </p>
          </div>

          <a
            href="mailto:mybusinessemail@gmail.com"
            style={{
              display: "block",
              padding: "clamp(28px, 4vw, 44px)",
              background: "#0c0f1d",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 16,
              textDecoration: "none",
              transition: "border-color 200ms, transform 150ms",
              position: "relative",
              overflow: "hidden",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(99,102,241,0.30)";
              (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(255,255,255,0.07)";
              (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(0)";
            }}
          >
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, #6366f1, transparent)" }} />
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#4a5578", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>
              Get in touch
            </div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: "clamp(14px, 1.4vw, 17px)", color: "#818cf8", marginBottom: 10 }}>
              mybusinessemail@gmail.com
            </div>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: "#4a5578" }}>
              Let's change how hiring works.
            </p>
          </a>
        </div>

        {/* Final CTA */}
        <div style={{ textAlign: "center", marginTop: "clamp(52px, 8vh, 100px)" }}>
          <h2 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: "clamp(30px, 5vw, 64px)", color: "#f0f2fa", lineHeight: 1.05, letterSpacing: "-0.03em", marginBottom: 36 }}>
            Stop being invisible.
          </h2>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link
              href="/register"
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "14px 36px",
                background: "#6366f1",
                borderRadius: 10,
                color: "#fff",
                fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 15,
                textDecoration: "none",
                boxShadow: "0 0 36px rgba(99,102,241,0.35)",
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
              Claim your section
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
            </Link>
            <Link href="/grid/1" style={{ display: "inline-flex", alignItems: "center", padding: "14px 32px", background: "transparent", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 10, color: "#8492b8", fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: 15, textDecoration: "none" }}>
              Browse the billboard
            </Link>
          </div>
        </div>
      </section>

    </main>
  );
}
