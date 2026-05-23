"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { JOB_CATEGORIES } from "@/types/job-categories";

function CategoryDropdown({ label, basePath, align = "left" }: {
  label: string;
  basePath: string;
  align?: "left" | "center";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          fontFamily: "'Inter', sans-serif",
          fontSize: 14,
          fontWeight: 400,
          color: open ? "#0A66C2" : "#555555",
          background: open ? "rgba(10,102,194,0.05)" : "transparent",
          border: "none",
          padding: "6px 14px",
          borderRadius: 6,
          cursor: "pointer",
          transition: "color 150ms, background 150ms",
          borderBottom: open ? "2px solid #0A66C2" : "2px solid transparent",
        }}
        onMouseEnter={(e) => {
          if (!open) {
            e.currentTarget.style.color = "#191919";
            e.currentTarget.style.background = "rgba(0,0,0,0.04)";
          }
        }}
        onMouseLeave={(e) => {
          if (!open) {
            e.currentTarget.style.color = "#555555";
            e.currentTarget.style.background = "transparent";
          }
        }}
      >
        {label}
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          style={{ transition: "transform 150ms", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            ...(align === "center" ? { left: "50%", transform: "translateX(-50%)" } : { left: 0 }),
            background: "#FFFFFF",
            border: "1px solid rgba(0,0,0,0.10)",
            borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,0.10)",
            minWidth: 200,
            overflow: "hidden",
            zIndex: 300,
            animation: "dropdownIn 0.15s ease both",
          }}
        >
          {JOB_CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              href={`${basePath}/${cat.slug}`}
              onClick={() => setOpen(false)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "11px 16px",
                textDecoration: "none",
                transition: "background 120ms",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(0,0,0,0.03)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "transparent"; }}
            >
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: cat.color, flexShrink: 0 }} />
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: "#191919", fontWeight: 500 }}>
                {cat.label}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { accessToken, role, logout, isLoading } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const staticLinks = [
    { href: "/", label: "Home" },
    { href: "/about", label: "About" },
    { href: "/pricing", label: "Pricing" },
    { href: "/find-work/jobs", label: "Find Work" },
    { href: "/talent", label: "Talent" },
    { href: "/contact", label: "Contact" },
  ];

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname?.startsWith(href);

  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 60,
        zIndex: 200,
        background: "#FFFFFF",
        borderBottom: scrolled
          ? "1px solid rgba(0,0,0,0.12)"
          : "1px solid rgba(0,0,0,0.08)",
        boxShadow: scrolled ? "0 1px 6px rgba(0,0,0,0.08)" : "none",
        transition: "box-shadow 220ms, border-color 220ms",
        display: "flex",
        alignItems: "center",
        padding: "0 clamp(16px, 4vw, 40px)",
      }}
    >
      {/* Logo */}
      <Link
        href="/"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          textDecoration: "none",
          flexShrink: 0,
          marginRight: "auto",
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 7,
            background: "#0A66C2",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="1" y="1" width="5" height="5" rx="1.5" fill="white" opacity="0.95" />
            <rect x="8" y="1" width="5" height="5" rx="1.5" fill="white" opacity="0.65" />
            <rect x="1" y="8" width="5" height="5" rx="1.5" fill="white" opacity="0.65" />
            <rect x="8" y="8" width="5" height="5" rx="1.5" fill="white" opacity="0.35" />
          </svg>
        </div>
        <span
          style={{
            fontFamily: "'Chakra Petch', sans-serif",
            fontWeight: 700,
            fontSize: 16,
            color: "#191919",
            letterSpacing: "0.02em",
          }}
        >
          PixelHire
        </span>
      </Link>

      {/* Center links */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          position: "absolute",
          left: "50%",
          transform: "translateX(-50%)",
        }}
      >
        {staticLinks.map((link) => {
          const active = isActive(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 14,
                fontWeight: active ? 600 : 400,
                color: active ? "#0A66C2" : "#555555",
                textDecoration: "none",
                padding: "6px 14px",
                borderRadius: 6,
                background: "transparent",
                transition: "color 150ms, background 150ms",
                borderBottom: active ? "2px solid #0A66C2" : "2px solid transparent",
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLAnchorElement).style.color = "#191919";
                  (e.currentTarget as HTMLAnchorElement).style.background = "rgba(0,0,0,0.04)";
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLAnchorElement).style.color = "#555555";
                  (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
                }
              }}
            >
              {link.label}
            </Link>
          );
        })}

        {/* Role-aware recruiter link */}
        {!isLoading && role === "recruiter" && (
          <CategoryDropdown label="Hire Talent" basePath="/recruiter/hire" />
        )}
      </div>

      {/* Right — auth */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginLeft: "auto",
        }}
      >
        {accessToken ? (
          <>
            <Link
              href={role === "recruiter" ? "/recruiter" : "/dashboard"}
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 14,
                fontWeight: 500,
                color: "#555555",
                textDecoration: "none",
                padding: "6px 14px",
                borderRadius: 6,
                transition: "color 150ms, background 150ms",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.color = "#191919";
                (e.currentTarget as HTMLAnchorElement).style.background = "rgba(0,0,0,0.04)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.color = "#555555";
                (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
              }}
            >
              Dashboard
            </Link>
            <button
              onClick={() => { logout(); router.push("/"); }}
              style={{
                padding: "7px 18px",
                background: "transparent",
                border: "1px solid rgba(0,0,0,0.20)",
                borderRadius: 20,
                color: "#555555",
                fontFamily: "'Inter', sans-serif",
                fontWeight: 600,
                fontSize: 13,
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
          </>
        ) : (
          <>
            <Link
              href="/login"
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 14,
                fontWeight: 600,
                color: "#0A66C2",
                textDecoration: "none",
                padding: "7px 16px",
                borderRadius: 20,
                border: "1px solid #0A66C2",
                transition: "background 150ms, color 150ms",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background = "rgba(10,102,194,0.06)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
              }}
            >
              Sign in
            </Link>
            <Link
              href="/register"
              style={{
                fontFamily: "'Inter', sans-serif",
                fontWeight: 600,
                fontSize: 14,
                color: "#fff",
                textDecoration: "none",
                padding: "8px 20px",
                borderRadius: 20,
                background: "#0A66C2",
                transition: "background 150ms",
                letterSpacing: "0.01em",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background = "#004182";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background = "#0A66C2";
              }}
            >
              Get started
            </Link>
          </>
        )}
      </div>
      <style>{`@keyframes dropdownIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </nav>
  );
}
