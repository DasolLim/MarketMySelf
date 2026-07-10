"use client";

import React from "react";
import Link from "next/link";

export default function ContactPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#F3F2EF",
        color: "#191919",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "100px 24px 60px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "#0A66C2" }} />

      <div style={{ maxWidth: 560, width: "100%", position: "relative", animation: "fadeInUp 0.6s cubic-bezier(0.16,1,0.3,1) both" }}>

        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#0A66C2", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 18 }}>
          Get in touch
        </div>

        <h1
          style={{
            fontFamily: "'Inter', sans-serif",
            fontWeight: 800,
            fontSize: "clamp(32px, 6vw, 52px)",
            lineHeight: 1.06,
            letterSpacing: "-0.03em",
            color: "#191919",
            marginBottom: 16,
          }}
        >
          Let&apos;s talk.
        </h1>

        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 16,
            color: "#555555",
            lineHeight: 1.75,
            marginBottom: 36,
            maxWidth: "48ch",
          }}
        >
          Whether you&apos;re a company looking to hire from the talent board, a professional with questions about your section, or just curious — reach out directly.
        </p>

        {/* Email card */}
        <a
          href="mailto:mybusinessemail@gmail.com"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            padding: "20px 24px",
            background: "#FFFFFF",
            border: "1px solid rgba(0,0,0,0.10)",
            borderRadius: 12,
            textDecoration: "none",
            transition: "border-color 160ms, transform 150ms, box-shadow 150ms",
            marginBottom: 14,
            position: "relative",
            overflow: "hidden",
            boxShadow: "0 1px 8px rgba(0,0,0,0.05)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.borderColor = "#0A66C2";
            (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-2px)";
            (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 4px 20px rgba(10,102,194,0.10)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(0,0,0,0.10)";
            (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(0)";
            (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 1px 8px rgba(0,0,0,0.05)";
          }}
        >
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "#0A66C2" }} />
          <div
            style={{
              width: 44, height: 44, borderRadius: 10, flexShrink: 0,
              background: "rgba(10,102,194,0.08)",
              border: "1px solid rgba(10,102,194,0.18)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#0A66C2",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </div>
          <div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 15, color: "#0A66C2" }}>
              mybusinessemail@gmail.com
            </div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#9CA3AF", marginTop: 3 }}>
              For companies, partnerships, and general inquiries
            </div>
          </div>
          <svg style={{ marginLeft: "auto", flexShrink: 0, color: "#9CA3AF" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
        </a>

        {/* Response badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 14px",
            background: "rgba(5,118,66,0.06)",
            border: "1px solid rgba(5,118,66,0.18)",
            borderRadius: 8,
            fontFamily: "'Inter', sans-serif",
            fontSize: 12,
            color: "#057642",
            fontWeight: 600,
            marginBottom: 40,
          }}
        >
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#057642" }} />
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
            color: "#9CA3AF",
            textDecoration: "none",
            fontWeight: 500,
            transition: "color 150ms",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#191919"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#9CA3AF"; }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5"/><path d="M12 5l-7 7 7 7"/></svg>
          Back to MarketMySelf
        </Link>
      </div>
      <style>{`@keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </main>
  );
}
