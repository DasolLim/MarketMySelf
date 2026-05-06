"use client";

import React from "react";
import Image from "next/image";
import type { PixelSection } from "@/types";
import { PAGE_PRICES } from "@/types";

const CAT: Record<string, { color: string; bg: string; border: string; glow: string }> = {
  Technical: { color: "#22d3ee", bg: "rgba(34,211,238,0.07)",  border: "rgba(34,211,238,0.22)", glow: "rgba(34,211,238,0.14)" },
  Marketing: { color: "#c084fc", bg: "rgba(192,132,252,0.07)", border: "rgba(192,132,252,0.22)", glow: "rgba(192,132,252,0.14)" },
  Finance:   { color: "#34d399", bg: "rgba(52,211,153,0.07)",  border: "rgba(52,211,153,0.22)",  glow: "rgba(52,211,153,0.14)"  },
};

function InitialsPhoto({ name, color, size }: { name: string | null; color?: string; size: number }) {
  const letters = name
    ? name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()
    : "?";
  return (
    <div
      style={{
        width: "100%",
        height: size,
        background: color ? `${color}10` : "#111620",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
    >
      <span
        style={{
          fontFamily: "'Inter', sans-serif",
          fontWeight: 800,
          fontSize: size * 0.28,
          color: color ? `${color}80` : "rgba(255,255,255,0.12)",
          letterSpacing: "-0.04em",
          userSelect: "none",
        }}
      >
        {letters}
      </span>
    </div>
  );
}

// ── Empty / available ─────────────────────────────────────────────────────────

interface EmptyCardProps {
  section: Pick<PixelSection, "id" | "page_number" | "row" | "col">;
  onPurchase?: (id: string) => void;
}

export function EmptySectionCard({ section, onPurchase }: EmptyCardProps) {
  const price = PAGE_PRICES[section.page_number as 1 | 2 | 3 | 4 | 5];

  return (
    <div
      style={{
        background: "#0c0f1d",
        border: "1px dashed rgba(255,255,255,0.08)",
        borderRadius: 14,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Photo placeholder */}
      <div
        style={{
          height: 200,
          background: "#0a0d18",
          borderBottom: "1px dashed rgba(255,255,255,0.06)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          position: "relative",
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: "50%",
            border: "1.5px dashed rgba(255,255,255,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1.4">
            <circle cx="12" cy="7" r="4" />
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
          </svg>
        </div>
        <span
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 12,
            color: "rgba(255,255,255,0.18)",
            letterSpacing: "0.01em",
          }}
        >
          Profile photo
        </span>

        {/* Available badge top-right */}
        <div
          style={{
            position: "absolute",
            top: 12,
            right: 12,
          }}
        >
          {onPurchase ? (
            <button
              onClick={() => onPurchase(section.id)}
              style={{
                padding: "5px 14px",
                background: "rgba(99,102,241,0.12)",
                border: "1px solid rgba(99,102,241,0.35)",
                borderRadius: 100,
                color: "#818cf8",
                fontFamily: "'IBM Plex Mono', monospace",
                fontWeight: 500,
                fontSize: 11,
                cursor: "pointer",
                letterSpacing: "0.04em",
                transition: "background 150ms, border-color 150ms",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(99,102,241,0.22)";
                e.currentTarget.style.borderColor = "rgba(99,102,241,0.60)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(99,102,241,0.12)";
                e.currentTarget.style.borderColor = "rgba(99,102,241,0.35)";
              }}
            >
              Claim · ${price?.toFixed(2)}
            </button>
          ) : (
            <span
              style={{
                padding: "5px 12px",
                background: "rgba(52,211,153,0.08)",
                border: "1px solid rgba(52,211,153,0.25)",
                borderRadius: 100,
                color: "#34d399",
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 10,
                letterSpacing: "0.06em",
              }}
            >
              Available
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "18px 20px 20px", flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Name + career */}
        <div>
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 700,
              fontSize: 17,
              color: "rgba(255,255,255,0.14)",
              marginBottom: 5,
            }}
          >
            Your name here
          </div>
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 13,
              color: "rgba(255,255,255,0.08)",
            }}
          >
            Career field · Category
          </div>
        </div>

        {/* Bio placeholder */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {[100, 88, 72].map((w, i) => (
            <div
              key={i}
              style={{
                height: 10,
                width: `${w}%`,
                background: "rgba(255,255,255,0.04)",
                borderRadius: 4,
              }}
            />
          ))}
        </div>

        {/* Skills placeholder */}
        <div style={{ display: "flex", gap: 6, marginTop: "auto" }}>
          {["skill", "skill", "skill"].map((_, i) => (
            <div
              key={i}
              style={{
                height: 26,
                width: 56,
                background: "rgba(255,255,255,0.03)",
                border: "1px dashed rgba(255,255,255,0.07)",
                borderRadius: 5,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Filled / owned ────────────────────────────────────────────────────────────

interface FilledCardProps {
  section: PixelSection;
  variant?: "compact" | "full";
  onEdit?: (id: string) => void;
  isOwner?: boolean;
}

export function FilledSectionCard({ section, variant = "full", onEdit, isOwner = false }: FilledCardProps) {
  const cfg = section.job_category ? CAT[section.job_category] : null;
  const photoHeight = variant === "compact" ? 140 : 200;

  return (
    <div
      style={{
        background: "#0c0f1d",
        border: `1px solid ${cfg ? cfg.border : "rgba(255,255,255,0.07)"}`,
        borderRadius: 14,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        boxShadow: cfg ? `0 4px 24px ${cfg.glow}` : "none",
        transition: "box-shadow 200ms",
      }}
    >
      {/* ── Single profile photo ───────────────────────────────────────────── */}
      <div
        style={{
          height: photoHeight,
          position: "relative",
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        {section.image_url ? (
          <Image
            src={section.image_url}
            alt={section.full_name ?? ""}
            fill
            style={{ objectFit: "cover", objectPosition: "top center" }}
            sizes="440px"
          />
        ) : (
          <InitialsPhoto name={section.full_name} color={cfg?.color} size={photoHeight} />
        )}

        {/* Category badge — top left */}
        {section.job_category && cfg && (
          <div
            style={{
              position: "absolute",
              top: 12,
              left: 12,
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "4px 10px",
              background: "rgba(7,8,15,0.75)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              border: `1px solid ${cfg.border}`,
              borderRadius: 100,
              color: cfg.color,
              fontFamily: "'IBM Plex Mono', monospace",
              fontWeight: 500,
              fontSize: 10,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            <div
              style={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: cfg.color,
                boxShadow: `0 0 5px ${cfg.color}`,
              }}
            />
            {section.job_category}
          </div>
        )}

        {/* Edit badge — top right (owner only) */}
        {isOwner && onEdit && (
          <button
            onClick={() => onEdit(section.id)}
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              padding: "4px 12px",
              background: "rgba(7,8,15,0.75)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(255,255,255,0.14)",
              borderRadius: 100,
              color: "#f0f2fa",
              fontFamily: "'Inter', sans-serif",
              fontWeight: 500,
              fontSize: 11,
              cursor: "pointer",
              letterSpacing: "0.02em",
              transition: "background 150ms",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(7,8,15,0.92)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(7,8,15,0.75)"; }}
          >
            Edit
          </button>
        )}

        {/* Bottom gradient for name readability */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 72,
            background: "linear-gradient(to top, rgba(12,15,29,0.95) 0%, transparent 100%)",
            pointerEvents: "none",
          }}
        />
      </div>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <div style={{ padding: "16px 20px 20px", flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>

        {/* Name + career field */}
        <div>
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 700,
              fontSize: variant === "compact" ? 15 : 18,
              color: "#f0f2fa",
              lineHeight: 1.2,
              letterSpacing: "-0.015em",
              marginBottom: 5,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {section.full_name ?? "—"}
          </div>
          {section.job_title && (
            <div
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 13,
                color: cfg?.color ?? "#8492b8",
                fontWeight: 500,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {section.job_title}
            </div>
          )}
        </div>

        {/* Marketing description / bio */}
        {section.bio && (
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 13,
              color: "#8492b8",
              lineHeight: 1.72,
              margin: 0,
              display: "-webkit-box",
              WebkitLineClamp: variant === "compact" ? 2 : 4,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {section.bio}
          </p>
        )}

        {/* Skills */}
        {section.skills && section.skills.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: "auto" }}>
            {section.skills.slice(0, 5).map((s) => (
              <span
                key={s}
                style={{
                  padding: "4px 10px",
                  background: cfg ? cfg.bg : "rgba(255,255,255,0.04)",
                  border: `1px solid ${cfg ? cfg.border : "rgba(255,255,255,0.09)"}`,
                  borderRadius: 5,
                  color: cfg?.color ?? "#8492b8",
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 11,
                  letterSpacing: "0.02em",
                }}
              >
                {s}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      {section.portfolio_url && (
        <div
          style={{
            borderTop: `1px solid ${cfg ? cfg.border : "rgba(255,255,255,0.06)"}`,
            padding: "10px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <a
            href={section.portfolio_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11,
              color: cfg?.color ?? "#4a5578",
              textDecoration: "none",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: "100%",
              transition: "opacity 150ms",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.opacity = "0.75"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.opacity = "1"; }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
              <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
            </svg>
            {section.portfolio_url.replace(/^https?:\/\//, "").replace(/\/$/, "").slice(0, 30)}
          </a>
        </div>
      )}
    </div>
  );
}

// ── Unified SectionCard ───────────────────────────────────────────────────────

interface SectionCardProps {
  section: PixelSection;
  variant?: "compact" | "full";
  onPurchase?: (id: string) => void;
  onEdit?: (id: string) => void;
  isOwner?: boolean;
}

export function SectionCard({ section, variant = "full", onPurchase, onEdit, isOwner = false }: SectionCardProps) {
  if (!section.owner_id) return <EmptySectionCard section={section} onPurchase={onPurchase} />;
  return <FilledSectionCard section={section} variant={variant} onEdit={onEdit} isOwner={isOwner} />;
}
