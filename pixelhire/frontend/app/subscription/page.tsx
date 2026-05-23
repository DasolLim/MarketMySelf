"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { fetchMySubscription } from "@/lib/api";
import { Subscription } from "@/types";

const TIER_COLORS: Record<string, string> = {
  pro: "#0A66C2",
  enterprise: "#B45309",
};

const TIER_LABELS: Record<string, string> = {
  pro: "Pro",
  enterprise: "Enterprise",
};

export default function SubscriptionPage() {
  const { accessToken, isLoading } = useAuth();
  const router = useRouter();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!isLoading && !accessToken) router.push("/login");
  }, [isLoading, accessToken, router]);

  useEffect(() => {
    if (!accessToken) return;
    fetchMySubscription(accessToken)
      .then(setSubscription)
      .catch(() => setSubscription(null))
      .finally(() => setFetching(false));
  }, [accessToken]);

  if (isLoading || fetching) {
    return (
      <main style={{ minHeight: "100vh", background: "#F3F2EF", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 18, height: 18, border: "2px solid rgba(10,102,194,0.2)", borderTopColor: "#0A66C2", borderRadius: "50%", animation: "spin 600ms linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </main>
    );
  }

  const tierColor = subscription ? (TIER_COLORS[subscription.tier] ?? "#0A66C2") : "#9CA3AF";
  const tierLabel = subscription ? (TIER_LABELS[subscription.tier] ?? subscription.tier) : null;

  return (
    <main style={{ minHeight: "100vh", background: "#F3F2EF", padding: "80px clamp(20px, 5vw, 60px) 60px", position: "relative" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "#0A66C2" }} />
      <div style={{ maxWidth: 600, margin: "0 auto", animation: "fadeInUp 0.55s cubic-bezier(0.16,1,0.3,1) both" }}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#0A66C2", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 6 }}>Account</div>
            <h1 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: "clamp(22px, 4vw, 32px)", color: "#191919", letterSpacing: "-0.03em" }}>Subscription</h1>
          </div>
          <Link href="/dashboard" style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#555555", textDecoration: "none", display: "flex", alignItems: "center", gap: 5 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
            Dashboard
          </Link>
        </div>

        <div style={{ background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, padding: "28px 32px", marginBottom: 14, boxShadow: "0 1px 8px rgba(0,0,0,0.04)", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: tierColor }} />

          {subscription && subscription.status === "active" ? (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase" }}>Current plan</div>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", background: "rgba(5,118,66,0.07)", border: "1px solid rgba(5,118,66,0.22)", borderRadius: 100, fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 700, color: "#057642", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#057642", animation: "glow-pulse 2s ease infinite" }} />
                  Active
                </span>
              </div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 28, color: "#191919", letterSpacing: "-0.02em", marginBottom: 6 }}>
                {tierLabel}
              </div>
              {subscription.current_period_end && (
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#9CA3AF" }}>
                  Renews {new Date(subscription.current_period_end).toLocaleDateString()}
                </div>
              )}
              <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                <Link href="/subscription/manage" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 20px", background: "transparent", border: "1px solid rgba(0,0,0,0.18)", borderRadius: 20, color: "#555555", fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13, textDecoration: "none" }}>
                  Manage subscription
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
                </Link>
              </div>
            </>
          ) : (
            <>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 20 }}>Current plan</div>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
                <div style={{ width: 48, height: 48, borderRadius: 10, background: "rgba(0,0,0,0.04)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
                </div>
                <div>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 16, color: "#191919", marginBottom: 3 }}>No active subscription</div>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#9CA3AF" }}>Upgrade to unlock premium features.</div>
                </div>
              </div>
              <Link href="/subscription/manage" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 22px", background: "#0A66C2", borderRadius: 20, color: "#fff", fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 14, textDecoration: "none" }}>
                View plans
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
              </Link>
            </>
          )}
        </div>
      </div>
      <style>{`@keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } } @keyframes glow-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </main>
  );
}
