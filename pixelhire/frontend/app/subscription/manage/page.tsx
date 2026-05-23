"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { fetchMySubscription, cancelSubscription } from "@/lib/api";
import { Subscription } from "@/types";

const TIER_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  basic:    { label: "Basic",    color: "#0A66C2", bg: "rgba(10,102,194,0.07)",  border: "rgba(10,102,194,0.20)"  },
  standard: { label: "Standard", color: "#7C3AED", bg: "rgba(124,58,237,0.07)", border: "rgba(124,58,237,0.20)" },
  premium:  { label: "Premium",  color: "#B45309", bg: "rgba(180,83,9,0.07)",   border: "rgba(180,83,9,0.20)"   },
};

const TIER_PRICES: Record<string, string> = {
  basic: "$4.99/mo", standard: "$14.99/mo", premium: "$24.99/mo",
};

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export default function ManageSubscriptionPage() {
  const { accessToken, isLoading } = useAuth();
  const router = useRouter();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [fetching, setFetching] = useState(true);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !accessToken) router.push("/login");
  }, [isLoading, accessToken, router]);

  useEffect(() => {
    if (!accessToken) return;
    fetchMySubscription(accessToken)
      .catch(() => null)
      .then((s) => setSubscription(s))
      .finally(() => setFetching(false));
  }, [accessToken]);

  async function handleCancel() {
    if (!accessToken) return;
    setError(null);
    setCancelling(true);
    try {
      await cancelSubscription(accessToken);
      setCancelled(true);
      setSubscription((s) => (s ? { ...s, status: "cancelled" } : s));
      setShowCancelConfirm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel subscription");
    } finally {
      setCancelling(false);
    }
  }

  if (isLoading || fetching) {
    return (
      <main style={{ minHeight: "100vh", background: "#F3F2EF", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 18, height: 18, border: "2px solid rgba(10,102,194,0.2)", borderTopColor: "#0A66C2", borderRadius: "50%", animation: "spin 600ms linear infinite" }} />
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: "#9CA3AF", fontWeight: 500 }}>Loading...</span>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </main>
    );
  }

  const isActive = subscription?.status === "active";
  const tier = subscription?.tier ?? null;
  const cfg = tier && tier !== "free" ? TIER_CONFIG[tier] : null;

  return (
    <main style={{ minHeight: "100vh", background: "#F3F2EF", color: "#191919", padding: "80px clamp(20px, 5vw, 60px) 80px" }}>
      <div style={{ maxWidth: 600, margin: "0 auto", animation: "fadeInUp 0.55s cubic-bezier(0.16,1,0.3,1) both" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 32, flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#0A66C2", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>
              Account
            </div>
            <h1 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: "clamp(22px, 4vw, 32px)", color: "#191919", letterSpacing: "-0.03em", lineHeight: 1.1 }}>
              Manage Subscription
            </h1>
          </div>
          <Link
            href="/dashboard"
            style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#555555", textDecoration: "none", paddingTop: 4 }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#191919"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#555555"; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>
            </svg>
            Dashboard
          </Link>
        </div>

        {/* Error banner */}
        {error && (
          <div style={{ padding: "12px 18px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.22)", borderRadius: 10, fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#DC2626", marginBottom: 20 }}>
            {error}
          </div>
        )}

        {/* Cancellation success */}
        {cancelled && (
          <div style={{ padding: "12px 18px", background: "rgba(5,118,66,0.06)", border: "1px solid rgba(5,118,66,0.22)", borderRadius: 10, fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#057642", marginBottom: 20 }}>
            Subscription cancelled. You keep full access until {formatDate(subscription?.current_period_end)}.
          </div>
        )}

        {/* No subscription */}
        {!subscription && !cancelled && (
          <div style={{ background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, padding: "32px", boxShadow: "0 1px 8px rgba(0,0,0,0.04)", textAlign: "center" }}>
            <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 16, color: "#191919", marginBottom: 8 }}>
              No active subscription
            </div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#9CA3AF", marginBottom: 24 }}>
              Choose a plan to unlock profile features and get discovered by companies.
            </div>
            <Link
              href="/pricing"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 24px", background: "#0A66C2", borderRadius: 20, color: "#fff", fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 14, textDecoration: "none" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "#004182"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "#0A66C2"; }}
            >
              View plans
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
            </Link>
          </div>
        )}

        {/* Plan card */}
        {subscription && cfg && (
          <div
            style={{
              background: "#FFFFFF",
              border: `1px solid ${cfg.border}`,
              borderRadius: 14,
              padding: "28px 32px",
              marginBottom: 16,
              boxShadow: `0 4px 20px ${cfg.color}10`,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: cfg.color }} />

            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 12 }}>
              Current plan
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
              <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 26, color: "#191919", letterSpacing: "-0.025em" }}>
                {cfg.label}
              </span>
              {isActive && (
                <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", background: "rgba(5,118,66,0.08)", border: "1px solid rgba(5,118,66,0.22)", borderRadius: 100, fontFamily: "'Inter', sans-serif", fontSize: 10, color: "#057642", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#057642", display: "inline-block", animation: "glow-pulse 2s ease infinite" }} />
                  Active
                </div>
              )}
              {subscription.status === "cancelled" && (
                <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.22)", borderRadius: 100, fontFamily: "'Inter', sans-serif", fontSize: 10, color: "#DC2626", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  Cancelled
                </div>
              )}
            </div>

            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: "#9CA3AF" }}>
              {TIER_PRICES[tier!] ?? ""}
            </div>
          </div>
        )}

        {/* Billing dates */}
        {subscription && cfg && (
          <div
            style={{
              background: "#FFFFFF",
              border: "1px solid rgba(0,0,0,0.08)",
              borderRadius: 12,
              padding: "24px 32px",
              marginBottom: 16,
              boxShadow: "0 1px 8px rgba(0,0,0,0.04)",
            }}
          >
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 20 }}>
              Billing
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              <div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#9CA3AF", fontWeight: 500, marginBottom: 6 }}>
                  Last payment
                </div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, fontWeight: 600, color: "#191919" }}>
                  {formatDate(subscription.current_period_start)}
                </div>
              </div>
              <div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#9CA3AF", fontWeight: 500, marginBottom: 6 }}>
                  {isActive ? "Next payment" : "Access ends"}
                </div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, fontWeight: 600, color: "#191919" }}>
                  {formatDate(subscription.current_period_end)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Danger zone — cancel */}
        {isActive && !cancelled && (
          <div style={{ background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, padding: "24px 32px", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 18 }}>
              Danger zone
            </div>

            {!showCancelConfirm ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 14, color: "#191919", marginBottom: 4 }}>
                    Cancel subscription
                  </div>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#9CA3AF" }}>
                    You&apos;ll retain full access until the end of your billing period.
                  </div>
                </div>
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  style={{ padding: "8px 22px", background: "transparent", border: "1px solid rgba(239,68,68,0.30)", borderRadius: 20, color: "#DC2626", fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13, cursor: "pointer", flexShrink: 0, transition: "border-color 150ms" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(239,68,68,0.65)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(239,68,68,0.30)"; }}
                >
                  Cancel plan
                </button>
              </div>
            ) : (
              <div style={{ background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.16)", borderRadius: 10, padding: "20px 24px" }}>
                <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 14, color: "#191919", marginBottom: 6 }}>
                  Are you sure you want to cancel?
                </div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#555555", lineHeight: 1.7, marginBottom: 20 }}>
                  Your plan benefits continue until {formatDate(subscription?.current_period_end)}.
                  After that you&apos;ll be moved to the Free plan.
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button
                    onClick={handleCancel}
                    disabled={cancelling}
                    style={{ padding: "9px 22px", background: "#DC2626", border: "none", borderRadius: 20, color: "#fff", fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13, cursor: cancelling ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 8, opacity: cancelling ? 0.7 : 1 }}
                  >
                    {cancelling ? (
                      <><div style={{ width: 13, height: 13, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 600ms linear infinite" }} />Cancelling...</>
                    ) : "Yes, cancel plan"}
                  </button>
                  <button
                    onClick={() => setShowCancelConfirm(false)}
                    style={{ padding: "9px 22px", background: "transparent", border: "1px solid rgba(0,0,0,0.20)", borderRadius: 20, color: "#555555", fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13, cursor: "pointer", transition: "border-color 150ms, color 150ms" }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(0,0,0,0.40)"; e.currentTarget.style.color = "#191919"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(0,0,0,0.20)"; e.currentTarget.style.color = "#555555"; }}
                  >
                    Keep plan
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Upgrade nudge after cancel */}
        {cancelled && (
          <div style={{ marginTop: 24, textAlign: "center" }}>
            <Link
              href="/pricing"
              style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#0A66C2", fontWeight: 600, textDecoration: "none" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.textDecoration = "underline"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.textDecoration = "none"; }}
            >
              Compare plans →
            </Link>
          </div>
        )}

      </div>

      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes glow-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </main>
  );
}
