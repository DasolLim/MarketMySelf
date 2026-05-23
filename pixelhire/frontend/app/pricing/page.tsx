"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { createSubscriptionCheckout } from "@/lib/api";

interface Feature {
  text: string;
  included: boolean;
}

interface Plan {
  name: string;
  tier: string;
  price: number;
  description: string;
  trial: { days: number; label: string } | null;
  popular: boolean;
  cta: string;
  accentColor: string;
  features: Feature[];
}

const ALL_FEATURES = [
  "Name display on profile",
  "Resume upload",
  "Tech skills listing",
  "Profile picture",
  "Portfolio & social links",
  "Soft skills listing",
  "Branding bio",
  "See who viewed your profile",
  "Recruiter notifications",
  "Boosted search ranking",
  "Featured on hire category pages",
  "Interview % indicator",
];

const PLANS: Plan[] = [
  {
    name: "Basic",
    tier: "basic",
    price: 4.99,
    description: "Build a complete profile with a photo, links, and your full skill set.",
    trial: { days: 3, label: "3-day free trial" },
    popular: false,
    cta: "Start free trial",
    accentColor: "#22d3ee",
    features: ALL_FEATURES.map((text, i) => ({ text, included: i < 6 })),
  },
  {
    name: "Standard",
    tier: "standard",
    price: 14.99,
    description: "Brand yourself with a bio and know exactly who's viewing your profile.",
    trial: { days: 1, label: "1-day free trial" },
    popular: true,
    cta: "Start free trial",
    accentColor: "#0A66C2",
    features: ALL_FEATURES.map((text, i) => ({ text, included: i < 8 })),
  },
  {
    name: "Premium",
    tier: "premium",
    price: 24.99,
    description: "Maximum visibility. Get found first, notified by recruiters, and featured.",
    trial: null,
    popular: false,
    cta: "Get Premium",
    accentColor: "#c084fc",
    features: ALL_FEATURES.map((text) => ({ text, included: true })),
  },
];

function Check({ color }: { color: string }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function Cross() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function PlanCard({ plan, prevPlanName, onSelect, isLoading }: { plan: Plan; prevPlanName: string | null; onSelect: () => void; isLoading: boolean }) {
  return (
    <div
      style={{
        background: "#FFFFFF",
        border: plan.popular ? `2px solid ${plan.accentColor}` : "1px solid rgba(0,0,0,0.10)",
        borderRadius: 16,
        padding: "30px 26px 26px",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        boxShadow: plan.popular ? `0 8px 40px ${plan.accentColor}28` : "0 2px 8px rgba(0,0,0,0.05)",
        transition: "transform 150ms, box-shadow 150ms",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.transform = "translateY(-2px)";
        el.style.boxShadow = plan.popular ? `0 16px 56px ${plan.accentColor}35` : "0 8px 28px rgba(0,0,0,0.09)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.transform = "translateY(0)";
        el.style.boxShadow = plan.popular ? `0 8px 40px ${plan.accentColor}28` : "0 2px 8px rgba(0,0,0,0.05)";
      }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: plan.accentColor }} />

      {plan.popular && (
        <div style={{
          position: "absolute", top: 16, right: 16,
          background: plan.accentColor, color: "#fff",
          fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 700,
          letterSpacing: "0.12em", textTransform: "uppercase",
          padding: "4px 10px", borderRadius: 100,
        }}>
          Most popular
        </div>
      )}

      <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 18, color: "#191919", marginBottom: 6 }}>
        {plan.name}
      </div>
      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#555555", lineHeight: 1.65, marginBottom: 18, minHeight: 38 }}>
        {plan.description}
      </p>

      <div style={{ display: "flex", alignItems: "flex-end", gap: 4, marginBottom: 14 }}>
        <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 36, color: "#191919", letterSpacing: "-0.03em", lineHeight: 1 }}>
          ${plan.price}
        </span>
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#9CA3AF", marginBottom: 5 }}>/month</span>
      </div>

      {plan.trial ? (
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "4px 11px",
          background: "rgba(5,118,66,0.07)", border: "1px solid rgba(5,118,66,0.22)",
          borderRadius: 100, marginBottom: 18, alignSelf: "flex-start",
        }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#057642", flexShrink: 0 }} />
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 600, color: "#057642" }}>
            {plan.trial.label} — no card needed
          </span>
        </div>
      ) : (
        <div style={{ height: 30, marginBottom: 18 }} />
      )}

      <button
        onClick={onSelect}
        disabled={isLoading}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          width: "100%", textAlign: "center",
          padding: "11px 20px",
          background: plan.popular ? plan.accentColor : "transparent",
          border: `1px solid ${plan.popular ? plan.accentColor : "rgba(0,0,0,0.22)"}`,
          borderRadius: 20,
          fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 14,
          color: plan.popular ? "#fff" : "#191919",
          cursor: isLoading ? "not-allowed" : "pointer",
          opacity: isLoading ? 0.75 : 1,
          marginBottom: 24,
          transition: "background 150ms, border-color 150ms",
        }}
        onMouseEnter={(e) => {
          if (isLoading) return;
          const el = e.currentTarget as HTMLButtonElement;
          if (plan.popular) { el.style.background = "#004182"; el.style.borderColor = "#004182"; }
          else { el.style.background = "rgba(0,0,0,0.05)"; el.style.borderColor = "rgba(0,0,0,0.38)"; }
        }}
        onMouseLeave={(e) => {
          if (isLoading) return;
          const el = e.currentTarget as HTMLButtonElement;
          if (plan.popular) { el.style.background = plan.accentColor; el.style.borderColor = plan.accentColor; }
          else { el.style.background = "transparent"; el.style.borderColor = "rgba(0,0,0,0.22)"; }
        }}
      >
        {isLoading ? (
          <>
            <div style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.35)", borderTopColor: plan.popular ? "#fff" : "#191919", borderRadius: "50%", animation: "spin 600ms linear infinite", flexShrink: 0 }} />
            Redirecting to checkout...
          </>
        ) : plan.cta}
      </button>

      <div style={{ borderTop: "1px solid rgba(0,0,0,0.08)", paddingTop: 18, flex: 1 }}>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#9CA3AF", fontWeight: 600, letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 14 }}>
          {prevPlanName ? `Everything in ${prevPlanName}, plus:` : "What's included"}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {plan.features.map((feature) => (
            <div key={feature.text} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {feature.included ? <Check color={plan.accentColor} /> : <Cross />}
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: feature.included ? "#191919" : "#D1D5DB", lineHeight: 1.4 }}>
                {feature.text}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function PricingPage() {
  const { accessToken } = useAuth();
  const router = useRouter();
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  async function handleSelectPlan(tier: string) {
    if (!accessToken) {
      router.push("/register");
      return;
    }
    setCheckoutError(null);
    setCheckoutLoading(tier);
    try {
      const result = await createSubscriptionCheckout(
        tier,
        window.location.origin + "/dashboard",
        accessToken,
      );
      window.location.href = result.checkout_url;
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : "Could not start checkout. Please try again.");
      setCheckoutLoading(null);
    }
  }

  return (
    <main style={{ minHeight: "100vh", background: "#F3F2EF", color: "#191919", overflowX: "hidden" }}>

      <section style={{ background: "#FFFFFF", borderBottom: "1px solid rgba(0,0,0,0.08)", padding: "80px clamp(20px, 5vw, 80px) 56px" }}>
        <div style={{ maxWidth: 680, margin: "0 auto", textAlign: "center" }}>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#0A66C2", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 14 }}>
            Pricing
          </div>
          <h1 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: "clamp(28px, 5vw, 52px)", color: "#191919", letterSpacing: "-0.03em", lineHeight: 1.08, marginBottom: 16 }}>
            Flexible pricing that scales<br />with your ambition.
          </h1>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "clamp(14px, 1.6vw, 17px)", color: "#555555", lineHeight: 1.75, marginBottom: 28 }}>
            Every plan keeps you visible on the platform. Upgrade to unlock the branding and discovery tools that get you hired faster.
          </p>
          {!accessToken && (
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#9CA3AF" }}>
              Already have an account?{" "}
              <Link
                href="/login"
                style={{ color: "#0A66C2", textDecoration: "none", fontWeight: 600 }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.textDecoration = "underline"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.textDecoration = "none"; }}
              >
                Sign in
              </Link>
            </p>
          )}
        </div>
      </section>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "48px clamp(20px, 5vw, 80px) 80px" }}>

        {checkoutError && (
          <div style={{ padding: "12px 18px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.22)", borderRadius: 10, fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#DC2626", marginBottom: 24 }}>
            {checkoutError}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16, alignItems: "start" }}>
          {PLANS.map((plan, i) => (
            <PlanCard
              key={plan.name}
              plan={plan}
              prevPlanName={i === 0 ? null : PLANS[i - 1].name}
              onSelect={() => handleSelectPlan(plan.tier)}
              isLoading={checkoutLoading === plan.tier}
            />
          ))}
        </div>

        <div style={{
          marginTop: 48,
          padding: "28px 32px",
          background: "#FFFFFF",
          border: "1px solid rgba(0,0,0,0.08)",
          borderRadius: 14,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 24,
          flexWrap: "wrap",
          boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
        }}>
          <div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 16, color: "#191919", marginBottom: 6 }}>
              Not sure which plan is right for you?
            </div>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#555555", lineHeight: 1.65, maxWidth: "54ch" }}>
              Start with Basic — 3 days free, no credit card needed. Upgrade or cancel any time from your dashboard.
            </p>
          </div>
          <button
            onClick={() => handleSelectPlan("basic")}
            disabled={!!checkoutLoading}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "11px 28px",
              background: "#0A66C2",
              border: "none",
              borderRadius: 20,
              color: "#fff",
              fontFamily: "'Inter', sans-serif",
              fontWeight: 600,
              fontSize: 14,
              cursor: checkoutLoading ? "not-allowed" : "pointer",
              opacity: checkoutLoading ? 0.75 : 1,
              flexShrink: 0,
              transition: "background 150ms",
            }}
            onMouseEnter={(e) => { if (!checkoutLoading) e.currentTarget.style.background = "#004182"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#0A66C2"; }}
          >
            {checkoutLoading === "basic" ? (
              <><div style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.35)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 600ms linear infinite" }} />Redirecting...</>
            ) : "Start with Basic"}
          </button>
        </div>

        <div style={{ marginTop: 56 }}>
          <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 18, color: "#191919", marginBottom: 24, textAlign: "center" }}>
            Compare all features
          </div>
          <div style={{ background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr repeat(3, 110px)", borderBottom: "2px solid rgba(0,0,0,0.08)" }}>
              <div style={{ padding: "16px 20px", fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#9CA3AF", fontWeight: 600, letterSpacing: "0.10em", textTransform: "uppercase" }}>
                Feature
              </div>
              {PLANS.map((plan) => (
                <div key={plan.name} style={{ padding: "16px 10px", textAlign: "center", fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 700, color: plan.popular ? plan.accentColor : "#191919" }}>
                  {plan.name}
                </div>
              ))}
            </div>
            {ALL_FEATURES.map((feat, fi) => (
              <div
                key={feat}
                style={{ display: "grid", gridTemplateColumns: "1fr repeat(3, 110px)", borderBottom: fi < ALL_FEATURES.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none", background: fi % 2 === 1 ? "rgba(0,0,0,0.012)" : "transparent" }}
              >
                <div style={{ padding: "13px 20px", fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#191919" }}>
                  {feat}
                </div>
                {PLANS.map((plan) => (
                  <div key={plan.name} style={{ padding: "13px 10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {plan.features[fi].included ? <Check color={plan.accentColor} /> : <Cross />}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 40, textAlign: "center" }}>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#9CA3AF", lineHeight: 1.7 }}>
            Section ownership (your pixel space on the talent board) is a separate one-time fee starting from $2.99.{" "}
            <Link
              href={accessToken ? "/dashboard" : "/register"}
              style={{ color: "#0A66C2", fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600, textDecoration: "none" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.textDecoration = "underline"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.textDecoration = "none"; }}
            >
              {accessToken ? "Go to dashboard →" : "Create account →"}
            </Link>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes glow-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
      `}</style>
    </main>
  );
}
