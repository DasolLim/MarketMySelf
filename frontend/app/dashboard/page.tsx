"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { fetchMySubscription } from "@/lib/api";
import type { Subscription } from "@/types";

const TIER_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  free:     { label: "Free",     color: "#9CA3AF", bg: "rgba(156,163,175,0.08)", border: "rgba(156,163,175,0.22)" },
  basic:    { label: "Basic",    color: "#0A66C2", bg: "rgba(10,102,194,0.08)",  border: "rgba(10,102,194,0.22)"  },
  standard: { label: "Standard", color: "#7C3AED", bg: "rgba(124,58,237,0.08)", border: "rgba(124,58,237,0.22)"  },
  premium:  { label: "Premium",  color: "#B45309", bg: "rgba(180,83,9,0.08)",   border: "rgba(180,83,9,0.22)"    },
};

const TIER_PRICES: Record<string, string> = {
  basic: "$4.99/mo", standard: "$14.99/mo", premium: "$24.99/mo",
};

export default function DashboardPage() {
  const { accessToken, userId, isLoading, role, logout } = useAuth();
  const router = useRouter();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [subLoading, setSubLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !accessToken) router.push("/login");
    if (!isLoading && accessToken && role && role !== "seeker") router.push("/recruiter");
  }, [isLoading, accessToken, role, router]);

  useEffect(() => {
    if (!accessToken) return;
    fetchMySubscription(accessToken)
      .then(setSubscription)
      .catch(() => setSubscription(null))
      .finally(() => setSubLoading(false));
  }, [accessToken]);

  if (isLoading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#F3F2EF",
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
              border: "2px solid rgba(10,102,194,0.2)",
              borderTopColor: "#0A66C2",
              borderRadius: "50%",
              animation: "spin 600ms linear infinite",
            }}
          />
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: "#9CA3AF", fontWeight: 500 }}>
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
      href: "/dashboard/profile",
      label: "My Profile",
      desc: "Edit your billboard section",
      color: "#0A66C2",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <circle cx="12" cy="7" r="4"/>
          <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
        </svg>
      ),
    },
    {
      href: "/dashboard/applications",
      label: "Applications",
      desc: "Track your job applications",
      color: "#0A66C2",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 10h8M8 14h5"/>
        </svg>
      ),
    },
    {
      href: "/dashboard/coaching",
      label: "AI Coaching",
      desc: "Resume review and interview prep",
      color: "#0A66C2",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
        </svg>
      ),
    },
    {
      href: "/dashboard/settings",
      label: "Settings",
      desc: "Password and account options",
      color: "#555555",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
        </svg>
      ),
    },
  ];

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#F3F2EF",
        color: "#191919",
        padding: "80px clamp(20px, 5vw, 60px) 60px",
        position: "relative",
      }}
    >
      {/* Top accent */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "#0A66C2" }} />

      <div style={{ maxWidth: 800, margin: "0 auto", position: "relative", animation: "fadeInUp 0.55s cubic-bezier(0.16,1,0.3,1) both" }}>

        {/* Page header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#0A66C2", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>
              Your account
            </div>
            <h1
              style={{
                fontFamily: "'Inter', sans-serif",
                fontWeight: 800,
                fontSize: "clamp(26px, 4vw, 36px)",
                color: "#191919",
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
              border: "1px solid rgba(0,0,0,0.20)",
              borderRadius: 20,
              color: "#555555",
              fontFamily: "'Inter', sans-serif",
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
              transition: "border-color 150ms, color 150ms",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(0,0,0,0.40)";
              e.currentTarget.style.color = "#191919";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(0,0,0,0.20)";
              e.currentTarget.style.color = "#555555";
            }}
          >
            Sign out
          </button>
        </div>

        {/* Account info card */}
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid rgba(0,0,0,0.08)",
            borderRadius: 12,
            padding: "24px 28px",
            marginBottom: 16,
            position: "relative",
            overflow: "hidden",
            boxShadow: "0 1px 8px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "#0A66C2" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                background: "rgba(10,102,194,0.08)",
                border: "2px solid rgba(10,102,194,0.20)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0A66C2" strokeWidth="1.6">
                <circle cx="12" cy="7" r="4"/>
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
              </svg>
            </div>
            <div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 16, color: "#191919", marginBottom: 3 }}>
                Your MarketMySelf Account
              </div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#9CA3AF" }}>
                ID: <span style={{ color: "#555555", fontWeight: 500 }}>{shortId}</span>
              </div>
            </div>
            <div
              style={{
                marginLeft: "auto",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 12px",
                background: "rgba(5,118,66,0.08)",
                border: "1px solid rgba(5,118,66,0.22)",
                borderRadius: 100,
                fontFamily: "'Inter', sans-serif",
                fontSize: 11,
                color: "#057642",
                fontWeight: 600,
                letterSpacing: "0.04em",
              }}
            >
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#057642", animation: "glow-pulse 2s ease infinite" }} />
              Active
            </div>
          </div>
        </div>

        {/* Subscription card */}
        {(() => {
          const activeTier = subscription?.status === "active" ? subscription.tier : null;
          const cfg = TIER_CONFIG[activeTier ?? "free"];
          const isActive = subscription?.status === "active";
          const isCancelled = subscription?.status === "cancelled";
          const renewalDate = subscription?.current_period_end
            ? new Date(subscription.current_period_end).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
            : null;

          return (
            <div
              style={{
                background: "#FFFFFF",
                border: "1px solid rgba(0,0,0,0.08)",
                borderRadius: 12,
                padding: "24px 28px",
                marginBottom: 24,
                boxShadow: "0 1px 8px rgba(0,0,0,0.05)",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: cfg.color }} />
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 16 }}>
                Manage Subscription
              </div>

              {subLoading ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10, height: 48 }}>
                  <div style={{ width: 16, height: 16, border: "2px solid rgba(10,102,194,0.2)", borderTopColor: "#0A66C2", borderRadius: "50%", animation: "spin 600ms linear infinite" }} />
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#9CA3AF" }}>Loading...</span>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                  <div style={{ width: 48, height: 48, borderRadius: 10, background: cfg.bg, border: `1px solid ${cfg.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={cfg.color} strokeWidth="1.6">
                      {activeTier === "premium" ? (
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      ) : activeTier === "standard" ? (
                        <><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/><path d="M16 3.13a4 4 0 010 7.75"/></>
                      ) : activeTier === "basic" ? (
                        <><circle cx="12" cy="7" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></>
                      ) : (
                        <><circle cx="12" cy="7" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></>
                      )}
                    </svg>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 3, flexWrap: "wrap" }}>
                      <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 16, color: "#191919" }}>
                        {cfg.label} Plan
                      </span>
                      {isActive && (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 10px", background: "rgba(5,118,66,0.08)", border: "1px solid rgba(5,118,66,0.22)", borderRadius: 100, fontFamily: "'Inter', sans-serif", fontSize: 10, color: "#057642", fontWeight: 700, letterSpacing: "0.04em" }}>
                          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#057642", display: "inline-block", animation: "glow-pulse 2s ease infinite" }} />
                          Active
                        </span>
                      )}
                      {isCancelled && (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 10px", background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.22)", borderRadius: 100, fontFamily: "'Inter', sans-serif", fontSize: 10, color: "#DC2626", fontWeight: 700, letterSpacing: "0.04em" }}>
                          Cancelled
                        </span>
                      )}
                    </div>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#9CA3AF" }}>
                      {isActive && activeTier
                        ? `${TIER_PRICES[activeTier] ?? ""}${renewalDate ? ` · Renews ${renewalDate}` : ""}`
                        : isCancelled && renewalDate
                        ? `Access until ${renewalDate}`
                        : "Upgrade to unlock premium profile features"}
                    </div>
                  </div>

                  <Link
                    href="/subscription/manage"
                    style={{
                      marginLeft: "auto",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "9px 22px",
                      background: "#0A66C2",
                      border: "1px solid #0A66C2",
                      borderRadius: 20,
                      color: "#fff",
                      fontFamily: "'Inter', sans-serif",
                      fontWeight: 600,
                      fontSize: 13,
                      textDecoration: "none",
                      flexShrink: 0,
                      transition: "background 150ms, border-color 150ms",
                    }}
                    onMouseEnter={(e) => {
                      const el = e.currentTarget as HTMLAnchorElement;
                      el.style.background = "#004182";
                      el.style.borderColor = "#004182";
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget as HTMLAnchorElement;
                      el.style.background = "#0A66C2";
                      el.style.borderColor = "#0A66C2";
                    }}
                  >
                    {isActive ? "Manage" : "Upgrade"}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
                  </Link>
                </div>
              )}
            </div>
          );
        })()}

        {/* Interview rate callout */}
        <div
          style={{
            background: "rgba(5,118,66,0.06)",
            border: "1px solid rgba(5,118,66,0.18)",
            borderRadius: 12,
            padding: "18px 24px",
            marginBottom: 24,
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(5,118,66,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#057642" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          </div>
          <div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 14, color: "#057642", marginBottom: 3 }}>
              87% interview callback rate
            </div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#555555" }}>
              Members with an active subscription get discovered 3× more than traditional applicants.
            </div>
          </div>
        </div>

        {/* Quick links */}
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 12 }}>
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
                background: "#FFFFFF",
                border: "1px solid rgba(0,0,0,0.08)",
                borderRadius: 10,
                textDecoration: "none",
                transition: "border-color 150ms, transform 150ms, box-shadow 150ms",
                boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(0,0,0,0.18)";
                (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-1px)";
                (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(0,0,0,0.08)";
                (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(0)";
                (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 1px 4px rgba(0,0,0,0.04)";
              }}
            >
              <div style={{ color: link.color, flexShrink: 0, marginTop: 1 }}>{link.icon}</div>
              <div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 14, color: "#191919", marginBottom: 3 }}>
                  {link.label}
                </div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#9CA3AF" }}>
                  {link.desc}
                </div>
              </div>
            </Link>
          ))}
        </div>

      </div>

      <style>{`@keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } } @keyframes glow-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </main>
  );
}
