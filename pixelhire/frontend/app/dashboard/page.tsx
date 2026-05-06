"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function DashboardPage() {
  const { accessToken, userId, isLoading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !accessToken) {
      router.push("/login");
    }
  }, [isLoading, accessToken, router]);

  if (isLoading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#07080f",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 18,
              height: 18,
              border: "2px solid rgba(99,102,241,0.3)",
              borderTopColor: "#6366f1",
              borderRadius: "50%",
              animation: "spin 600ms linear infinite",
            }}
          />
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: "#4a5578", letterSpacing: "0.08em" }}>
            Loading...
          </span>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </main>
    );
  }

  if (!accessToken) return null;

  const shortId = userId ? userId.slice(0, 8).toUpperCase() : "—";

  const quickLinks = [
    {
      href: "/grid/1",
      label: "Browse Billboard",
      desc: "Find and purchase a section",
      color: "#6366f1",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <rect x="3" y="3" width="7" height="7" rx="1"/>
          <rect x="14" y="3" width="7" height="7" rx="1"/>
          <rect x="3" y="14" width="7" height="7" rx="1"/>
          <rect x="14" y="14" width="7" height="7" rx="1"/>
        </svg>
      ),
    },
    {
      href: "/",
      label: "Home",
      desc: "Back to the main page",
      color: "#8492b8",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
          <polyline points="9,22 9,12 15,12 15,22"/>
        </svg>
      ),
    },
    {
      href: "/about",
      label: "About",
      desc: "Our story and mission",
      color: "#8492b8",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 16v-4M12 8h.01"/>
        </svg>
      ),
    },
    {
      href: "/contact",
      label: "Contact",
      desc: "Get in touch with us",
      color: "#8492b8",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
          <polyline points="22,6 12,13 2,6"/>
        </svg>
      ),
    },
  ];

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#07080f",
        color: "#f0f2fa",
        padding: "80px clamp(20px, 5vw, 60px) 60px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(255,255,255,0.02) 1px, transparent 1px)", backgroundSize: "36px 36px", pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 800, height: 500, background: "radial-gradient(ellipse, rgba(99,102,241,0.06) 0%, transparent 65%)", pointerEvents: "none" }} />

      <div style={{ maxWidth: 800, margin: "0 auto", position: "relative", animation: "fadeInUp 0.65s cubic-bezier(0.16,1,0.3,1) both" }}>

        {/* Page header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 40, flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#6366f1", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 10 }}>
              Your account
            </div>
            <h1
              style={{
                fontFamily: "'Inter', sans-serif",
                fontWeight: 800,
                fontSize: "clamp(28px, 4vw, 40px)",
                color: "#f0f2fa",
                letterSpacing: "-0.03em",
                lineHeight: 1.1,
              }}
            >
              Dashboard
            </h1>
          </div>
          <button
            onClick={() => { logout(); router.push("/"); }}
            style={{
              padding: "8px 20px",
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.09)",
              borderRadius: 8,
              color: "#8492b8",
              fontFamily: "'Inter', sans-serif",
              fontWeight: 500,
              fontSize: 14,
              cursor: "pointer",
              transition: "border-color 150ms, color 150ms",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.22)";
              e.currentTarget.style.color = "#f0f2fa";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)";
              e.currentTarget.style.color = "#8492b8";
            }}
          >
            Sign out
          </button>
        </div>

        {/* Account info card */}
        <div
          style={{
            background: "#0c0f1d",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 16,
            padding: "24px 28px",
            marginBottom: 24,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, #6366f1, #818cf8)" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            {/* Avatar */}
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                background: "rgba(99,102,241,0.12)",
                border: "1px solid rgba(99,102,241,0.28)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.6">
                <circle cx="12" cy="7" r="4"/>
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
              </svg>
            </div>
            <div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 16, color: "#f0f2fa", marginBottom: 4 }}>
                Your PixelHire Account
              </div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: "#4a5578" }}>
                ID: <span style={{ color: "#8492b8" }}>{shortId}</span>
              </div>
            </div>
            <div
              style={{
                marginLeft: "auto",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 12px",
                background: "rgba(52,211,153,0.08)",
                border: "1px solid rgba(52,211,153,0.22)",
                borderRadius: 100,
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 10,
                color: "#34d399",
                letterSpacing: "0.08em",
              }}
            >
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#34d399" }} />
              Active
            </div>
          </div>
        </div>

        {/* Section ownership placeholder */}
        <div
          style={{
            background: "#0c0f1d",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 16,
            padding: "28px",
            marginBottom: 24,
          }}
        >
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#4a5578", letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 14 }}>
            Your Sections
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width: 48, height: 48, borderRadius: 12,
                border: "1px dashed rgba(255,255,255,0.10)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4a5578" strokeWidth="1.4">
                <rect x="3" y="3" width="7" height="7" rx="1"/>
                <rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/>
                <rect x="14" y="14" width="7" height="7" rx="1"/>
              </svg>
            </div>
            <div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: "#8492b8", marginBottom: 4 }}>
                No sections purchased yet
              </div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#4a5578" }}>
                Browse the billboard and claim your spot
              </div>
            </div>
            <Link
              href="/grid/1"
              style={{
                marginLeft: "auto",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "9px 20px",
                background: "#6366f1",
                borderRadius: 8,
                color: "#fff",
                fontFamily: "'Inter', sans-serif",
                fontWeight: 600,
                fontSize: 13,
                textDecoration: "none",
                flexShrink: 0,
                transition: "background 150ms",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "#5254cc"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "#6366f1"; }}
            >
              Browse
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
            </Link>
          </div>
        </div>

        {/* Quick links */}
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#4a5578", letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 14 }}>
          Quick Links
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                padding: "18px 18px",
                background: "#0c0f1d",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 12,
                textDecoration: "none",
                transition: "border-color 150ms, transform 150ms",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(255,255,255,0.16)";
                (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(255,255,255,0.07)";
                (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(0)";
              }}
            >
              <div style={{ color: link.color, flexShrink: 0, marginTop: 1 }}>{link.icon}</div>
              <div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 14, color: "#f0f2fa", marginBottom: 3 }}>
                  {link.label}
                </div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#4a5578" }}>
                  {link.desc}
                </div>
              </div>
            </Link>
          ))}
        </div>

      </div>

      <style>{`@keyframes fadeInUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </main>
  );
}
