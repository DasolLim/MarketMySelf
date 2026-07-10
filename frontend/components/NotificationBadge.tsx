"use client";

import React from "react";

interface Props {
  count: number;
}

export default function NotificationBadge({ count }: Props) {
  if (count <= 0) return null;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 18,
        height: 18,
        padding: "0 5px",
        background: "#DC2626",
        borderRadius: 100,
        fontFamily: "'Inter', sans-serif",
        fontSize: 10,
        fontWeight: 700,
        color: "#fff",
        lineHeight: 1,
      }}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
