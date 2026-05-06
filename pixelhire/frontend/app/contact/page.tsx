"use client";

import React from "react";
import Link from "next/link";

export default function ContactPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#07080f",
        color: "#f0f2fa",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "100px 24px 60px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(255,255,255,0.02) 1px, transparent 1px)", backgroundSize: "36px 36px", pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: "20%", left: "50%", transform: "translateX(-50%)", width: 700, height: 500, background: "radial-gradient(ellipse, rgba(99,102,241,0.06) 0%, transparent 65%)", pointerEvents: "none" }} />

      <div style={{ maxWidth: 560, width: "100%", position: "relative", animation: "fadeInUp 0.7s cubic-bezier(0.16,1,0.3,1) both" }}>

        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#6366f1", letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 20 }}>
          Get in touch
        </div>

        <h1
          style={{
            fontFamily: "'Inter', sans-serif",
            fontWeight: 800,
            fontSize: "clamp(36px, 6vw, 56px)",
            lineHeight: 1.05,
            letterSpacing: "-0.03em",
            color: "#f0f2fa",
            marginBottom: 18,
          }}
        >
          Let's talk.
        </h1>

        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 16,
            color: "#8492b8",
            lineHeight: 1.75,
            marginBottom: 40,
            maxWidth: "48ch",
          }}
        >
          Whether you're a company looking to hire from the billboard, a professional with questions about your section, or just curious — reach out directly.
        </p>

        {/* Email card */}
        <a
          href="mailto:mybusinessemail@gmail.com"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            padding: "20px 24px",
            background: "#0c0f1d",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 14,
            textDecoration: "none",
            transition: "border-color 160ms, transform 150ms",
            marginBottom: 12,
            position: "relative",
            overflow: "hidden",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(99,102,241,0.35)";
            (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-2px)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(255,255,255,0.08)";
            (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(0)";
          }}
        >
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, #6366f1, #818cf8)" }} />
          <div
            style={{
              width: 44, height: 44, borderRadius: 10, flexShrink: 0,
              background: "rgba(99,102,241,0.10)",
              border: "1px solid rgba(99,102,241,0.22)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#818cf8",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </div>
          <div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 15, color: "#818cf8" }}>
              mybusinessemail@gmail.com
            </div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#4a5578", marginTop: 3 }}>
              For companies, partnerships, and general inquiries
            </div>
          </div>
          <svg style={{ marginLeft: "auto", flexShrink: 0, color: "#4a5578" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
        </a>

        {/* Response badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 14px",
            background: "rgba(245,158,11,0.06)",
            border: "1px solid rgba(245,158,11,0.16)",
            borderRadius: 8,
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11,
            color: "#f59e0b",
            letterSpacing: "0.06em",
            marginBottom: 40,
          }}
        >
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#f59e0b" }} />
          Typically responds within 24 hours on business days
        </div>

        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontFamily: "'Inter', sans-serif",
            fontSize: 14,
            color: "#4a5578",
            textDecoration: "none",
            transition: "color 150ms",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5"/><path d="M12 5l-7 7 7 7"/></svg>
          Back to PixelHire
        </Link>
      </div>
    </main>
  );
}
