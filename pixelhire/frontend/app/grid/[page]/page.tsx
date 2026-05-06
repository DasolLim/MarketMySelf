"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PixelGrid } from "@/components/PixelGrid";
import { SectionModal } from "@/components/SectionModal";
import { fetchGridSections, fetchSection } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { GridSection, PixelSection } from "@/types";
import { PAGE_PRICES, TOTAL_SECTIONS } from "@/types";

const CAT_COLORS: Record<string, string> = {
  Technical: "#22d3ee",
  Marketing: "#c084fc",
  Finance:   "#34d399",
};

interface PageProps {
  params: { page: string };
}

export default function GridPage({ params }: PageProps) {
  const { page } = params;
  const pageNumber = Number(page) as 1 | 2 | 3 | 4 | 5;
  const { accessToken } = useAuth();
  const router = useRouter();

  const [sections, setSections] = useState<GridSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSection, setSelectedSection] = useState<PixelSection | null>(null);

  function handlePurchase(id: string) {
    if (!accessToken) { router.push("/login"); return; }
    console.log("purchase", id);
  }

  useEffect(() => {
    if (![1, 2, 3, 4, 5].includes(pageNumber)) return;
    setLoading(true);
    fetchGridSections(pageNumber)
      .then(setSections)
      .finally(() => setLoading(false));
  }, [pageNumber]);

  const { occupied, byCategory } = useMemo(() => {
    let occupied = 0;
    const byCategory: Record<string, number> = { Technical: 0, Marketing: 0, Finance: 0 };
    for (const s of sections) {
      if (s.owner_id) {
        occupied++;
        if (s.job_category && byCategory[s.job_category] !== undefined) {
          byCategory[s.job_category]++;
        }
      }
    }
    return { occupied, byCategory };
  }, [sections]);

  if (![1, 2, 3, 4, 5].includes(pageNumber)) {
    return (
      <main style={{ padding: 40, textAlign: "center", color: "#64748b" }}>
        Invalid page. Choose 1–5.
      </main>
    );
  }

  const available = TOTAL_SECTIONS - occupied;

  return (
    <>
      {/* ── Full-window grid — fills the entire browser viewport ─────── */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          overflow: "hidden",
        }}
      >
        <PixelGrid
          sections={sections}
          onSectionClick={async (section) => {
            try {
              const full = await fetchSection(section.id);
              setSelectedSection(full);
            } catch {
              setSelectedSection(section as unknown as PixelSection);
            }
          }}
          pageNumber={pageNumber}
          loading={loading}
        />
      </div>

      {/* ── Floating HUD — top-left ───────────────────────────────────── */}
      <div
        style={{
          position: "fixed",
          top: 14,
          left: 14,
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          gap: 12,
          background: "rgba(6,8,16,0.82)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 7,
          padding: "7px 14px",
        }}
      >
        <Link
          href="/"
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11,
            color: "#475569",
            textDecoration: "none",
            letterSpacing: "0.04em",
            whiteSpace: "nowrap",
          }}
        >
          ← PixelHire
        </Link>

        <div style={{ width: 1, height: 16, background: "#1e2d45", flexShrink: 0 }} />

        <span
          style={{
            fontFamily: "'Chakra Petch', sans-serif",
            fontWeight: 700,
            fontSize: 13,
            color: "#e2e8f0",
            letterSpacing: "0.06em",
            whiteSpace: "nowrap",
          }}
        >
          Page {pageNumber}
        </span>

        <span
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 12,
            color: "#f59e0b",
            letterSpacing: "0.04em",
            textShadow: "0 0 10px rgba(245,158,11,0.4)",
            whiteSpace: "nowrap",
          }}
        >
          ${PAGE_PRICES[pageNumber].toFixed(2)}/section
        </span>
      </div>

      {/* ── Floating HUD — top-right ──────────────────────────────────── */}
      <div
        style={{
          position: "fixed",
          top: 14,
          right: 14,
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          gap: 14,
          background: "rgba(6,8,16,0.82)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 7,
          padding: "7px 14px",
        }}
      >
        {/* Per-category dot counts */}
        {Object.entries(CAT_COLORS).map(([key, color]) => (
          <div key={key} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: color,
                boxShadow: `0 0 6px ${color}`,
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 11,
                color: "#475569",
                whiteSpace: "nowrap",
              }}
            >
              {byCategory[key]}
            </span>
          </div>
        ))}

        <div style={{ width: 1, height: 16, background: "#1e2d45", flexShrink: 0 }} />

        <span
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11,
            color: "#475569",
            whiteSpace: "nowrap",
          }}
        >
          {available} open
        </span>
      </div>

      {/* ── Page nav — bottom-center ──────────────────────────────────── */}
      <div
        style={{
          position: "fixed",
          bottom: 14,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 100,
          display: "flex",
          gap: 6,
          background: "rgba(6,8,16,0.82)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 7,
          padding: "6px 10px",
        }}
      >
        {([1, 2, 3, 4, 5] as const).map((p) => (
          <Link
            key={p}
            href={`/grid/${p}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 28,
              height: 28,
              borderRadius: 5,
              background: p === pageNumber ? "rgba(34,211,238,0.12)" : "transparent",
              border: `1px solid ${p === pageNumber ? "#22d3ee50" : "transparent"}`,
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11,
              color: p === pageNumber ? "#22d3ee" : "#475569",
              textDecoration: "none",
              letterSpacing: "0.04em",
              transition: "all 120ms",
            }}
          >
            {p}
          </Link>
        ))}
      </div>

      <SectionModal
        section={selectedSection}
        onClose={() => setSelectedSection(null)}
        onPurchase={handlePurchase}
      />
    </>
  );
}
