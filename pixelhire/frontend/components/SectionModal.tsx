"use client";

import React, { useEffect, useCallback } from "react";
import type { PixelSection } from "@/types";
import { FilledSectionCard, EmptySectionCard } from "./SectionCard";

interface SectionModalProps {
  section: PixelSection | null;
  onClose: () => void;
  onPurchase?: (sectionId: string) => void;
  onEdit?: (sectionId: string) => void;
  isOwner?: boolean;
}

export function SectionModal({
  section,
  onClose,
  onPurchase,
  onEdit,
  isOwner = false,
}: SectionModalProps) {
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!section) return;
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [section, handleKey]);

  if (!section) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px 16px",
      }}
      onClick={onClose}
    >
      {/* Backdrop */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(7,8,15,0.88)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      />

      {/* Card */}
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 440,
          animation: "float-up 180ms ease forwards",
          zIndex: 1,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: "absolute",
            top: -12,
            right: -12,
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "#0c0f1d",
            border: "1px solid rgba(255,255,255,0.10)",
            color: "#8492b8",
            fontSize: 18,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10,
            lineHeight: 1,
            transition: "border-color 150ms, color 150ms",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.24)";
            e.currentTarget.style.color = "#f0f2fa";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)";
            e.currentTarget.style.color = "#8492b8";
          }}
        >
          ×
        </button>

        {section.owner_id ? (
          <FilledSectionCard
            section={section}
            variant="full"
            onEdit={onEdit}
            isOwner={isOwner}
          />
        ) : (
          <EmptySectionCard section={section} onPurchase={onPurchase} />
        )}
      </div>
    </div>
  );
}
