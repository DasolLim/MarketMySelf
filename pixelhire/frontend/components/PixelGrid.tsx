"use client";

import React, { useState, useMemo, useCallback } from "react";
import type { GridSection } from "@/types";
import { GRID_ROWS, GRID_COLS, PAGE_PRICES } from "@/types";

const CAT: Record<string, { fill: string; glow: string; dim: string; label: string }> = {
  Technical: { fill: "#22d3ee", glow: "rgba(34,211,238,0.45)", dim: "rgba(34,211,238,0.10)", label: "Tech" },
  Marketing: { fill: "#c084fc", glow: "rgba(192,132,252,0.45)", dim: "rgba(192,132,252,0.10)", label: "Mktg" },
  Finance:   { fill: "#34d399", glow: "rgba(52,211,153,0.45)",  dim: "rgba(52,211,153,0.10)",  label: "Fin"  },
};

interface PixelGridProps {
  sections: GridSection[];
  onSectionClick: (section: GridSection) => void;
  pageNumber: 1 | 2 | 3 | 4 | 5;
  loading?: boolean;
}

// ── Owned showcase cell ───────────────────────────────────────────────────

function OwnedCell({
  section,
  isHovered,
}: {
  section: GridSection;
  isHovered: boolean;
}) {
  const cat = section.job_category ? CAT[section.job_category] : null;

  return (
    <>
      {/* Background image */}
      {section.image_url && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url(${section.image_url})`,
            backgroundSize: "cover",
            backgroundPosition: "center top",
            opacity: isHovered ? 0.6 : 0.4,
            transition: "opacity 200ms",
          }}
        />
      )}

      {/* Category colour wash */}
      {cat && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(160deg, ${cat.dim} 0%, transparent 65%)`,
          }}
        />
      )}

      {/* Bottom text overlay */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "clamp(4px, 0.8vh, 12px) clamp(4px, 0.6vw, 10px) clamp(4px, 0.7vh, 10px)",
          background:
            "linear-gradient(to top, rgba(6,8,16,0.96) 0%, rgba(6,8,16,0.55) 65%, transparent)",
        }}
      >
        {section.full_name && (
          <p
            style={{
              margin: 0,
              fontFamily: "'Chakra Petch', sans-serif",
              fontWeight: 600,
              fontSize: "clamp(8px, 0.85vw, 13px)",
              color: cat ? cat.fill : "#e2e8f0",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              lineHeight: 1.2,
              textShadow: cat ? `0 0 10px ${cat.glow}` : "none",
            }}
          >
            {section.full_name}
          </p>
        )}
        {section.job_title && (
          <p
            style={{
              margin: "2px 0 0",
              fontFamily: "'IBM Plex Sans', sans-serif",
              fontSize: "clamp(7px, 0.65vw, 11px)",
              color: "#64748b",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              lineHeight: 1.2,
            }}
          >
            {section.job_title}
          </p>
        )}
        {cat && (
          <span
            style={{
              display: "inline-block",
              marginTop: 3,
              padding: "1px 5px",
              borderRadius: 2,
              background: cat.dim,
              color: cat.fill,
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "clamp(6px, 0.55vw, 9px)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            {cat.label}
          </span>
        )}
      </div>
    </>
  );
}

// ── Empty / available cell ────────────────────────────────────────────────

function EmptyCell({
  isHovered,
  pageNumber,
}: {
  isHovered: boolean;
  pageNumber: 1 | 2 | 3 | 4 | 5;
}) {
  return isHovered ? (
    <>
      <span
        style={{
          fontFamily: "'Chakra Petch', sans-serif",
          fontWeight: 600,
          fontSize: "clamp(9px, 0.85vw, 12px)",
          color: "#22d3ee",
          letterSpacing: "0.04em",
        }}
      >
        + Claim
      </span>
      <span
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: "clamp(7px, 0.65vw, 10px)",
          color: "#475569",
          marginTop: 2,
        }}
      >
        ${PAGE_PRICES[pageNumber].toFixed(2)}
      </span>
    </>
  ) : (
    <span
      style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: "clamp(10px, 1vw, 16px)",
        color: "#1a2233",
        userSelect: "none",
      }}
    >
      +
    </span>
  );
}

// ── Individual cell wrapper ───────────────────────────────────────────────

const ShowcaseCell = React.memo(function ShowcaseCell({
  section,
  isHovered,
  pageNumber,
  onEnter,
  onLeave,
  onClick,
}: {
  section: GridSection | undefined;
  isHovered: boolean;
  pageNumber: 1 | 2 | 3 | 4 | 5;
  onEnter: (s: GridSection) => void;
  onLeave: () => void;
  onClick: (s: GridSection) => void;
}) {
  const isOwned = !!section?.owner_id;
  const cat = section?.job_category ? CAT[section.job_category] : null;

  return (
    <div
      onMouseEnter={section ? () => onEnter(section) : undefined}
      onMouseLeave={onLeave}
      onClick={section ? () => onClick(section) : undefined}
      style={{
        position: "relative",
        overflow: "hidden",
        cursor: "pointer",
        background: "#060c18",
        border: isOwned
          ? `1px solid ${isHovered && cat ? cat.fill + "70" : cat ? cat.fill + "20" : "#1a2233"}`
          : `1px dashed ${isHovered ? "#2a3a55" : "#141c2e"}`,
        boxShadow:
          isOwned && isHovered && cat
            ? `0 0 28px ${cat.glow}, 0 0 8px ${cat.glow}`
            : "none",
        transition: "border-color 180ms, box-shadow 180ms, background 150ms",
        display: isOwned ? "block" : "flex",
        flexDirection: isOwned ? undefined : "column",
        alignItems: isOwned ? undefined : "center",
        justifyContent: isOwned ? undefined : "center",
        gap: isOwned ? undefined : 2,
        ...(isOwned ? {} : { background: isHovered ? "rgba(34,211,238,0.025)" : "transparent" }),
      }}
    >
      {isOwned && section ? (
        <OwnedCell section={section} isHovered={isHovered} />
      ) : (
        <EmptyCell isHovered={isHovered} pageNumber={pageNumber} />
      )}
    </div>
  );
});

// ── Main PixelGrid ────────────────────────────────────────────────────────

export function PixelGrid({
  sections,
  onSectionClick,
  pageNumber,
  loading = false,
}: PixelGridProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const sectionMap = useMemo(() => {
    const map = new Map<string, GridSection>();
    for (const s of sections) map.set(`${s.row},${s.col}`, s);
    return map;
  }, [sections]);

  const handleEnter = useCallback((s: GridSection) => setHoveredId(s.id), []);
  const handleLeave = useCallback(() => setHoveredId(null), []);

  const cells = useMemo(() => {
    const out: Array<{ row: number; col: number; section: GridSection | undefined }> = [];
    for (let r = 1; r <= GRID_ROWS; r++) {
      for (let c = 1; c <= GRID_COLS; c++) {
        out.push({ row: r, col: c, section: sectionMap.get(`${r},${c}`) });
      }
    }
    return out;
  }, [sectionMap]);

  const gridStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    display: "grid",
    gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
    gridTemplateRows: `repeat(${GRID_ROWS}, 1fr)`,
    gap: 1,
    background: "#060810",
  };

  if (loading) {
    return (
      <div style={gridStyle}>
        {Array.from({ length: GRID_ROWS * GRID_COLS }).map((_, i) => (
          <div
            key={i}
            style={{
              background:
                "linear-gradient(90deg, #0d1117 25%, #1c2333 50%, #0d1117 75%)",
              backgroundSize: "400px 100%",
              animation: "shimmer 1.4s ease infinite",
              animationDelay: `${(i % GRID_COLS) * 50}ms`,
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div style={gridStyle}>
      {cells.map(({ row, col, section }) => (
        <ShowcaseCell
          key={`${row}-${col}`}
          section={section}
          isHovered={!!section && hoveredId === section.id}
          pageNumber={pageNumber}
          onEnter={handleEnter}
          onLeave={handleLeave}
          onClick={onSectionClick}
        />
      ))}
    </div>
  );
}
