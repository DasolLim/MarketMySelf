"use client";

import React from "react";
import { SubscriptionTier } from "@/types";

const TIER_CONFIG: Record<SubscriptionTier, { label: string; bg: string; border: string; color: string }> = {
  free:     { label: "Free",     bg: "rgba(0,0,0,0.04)",          border: "rgba(0,0,0,0.14)",          color: "#555555" },
  basic:    { label: "Basic",    bg: "rgba(10,102,194,0.08)",      border: "rgba(10,102,194,0.22)",      color: "#0A66C2" },
  standard: { label: "Standard", bg: "rgba(124,58,237,0.08)",      border: "rgba(124,58,237,0.22)",      color: "#7C3AED" },
  premium:  { label: "Premium",  bg: "rgba(180,83,9,0.08)",        border: "rgba(180,83,9,0.22)",        color: "#B45309" },
};

interface Props {
  tier: SubscriptionTier;
}

export default function SubscriptionBadge({ tier }: Props) {
  const cfg = TIER_CONFIG[tier] ?? TIER_CONFIG.free;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "3px 10px",
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        borderRadius: 100,
        fontFamily: "'Inter', sans-serif",
        fontSize: 11,
        fontWeight: 700,
        color: cfg.color,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
      }}
    >
      {cfg.label}
    </span>
  );
}
