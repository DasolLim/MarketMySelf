"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { accessToken, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (pathname?.startsWith("/grid/")) return null;

  const links = [
    { href: "/", label: "Home" },
    { href: "/about", label: "About" },
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
        background: scrolled
          ? "rgba(7,8,15,0.96)"
          : "rgba(7,8,15,0.70)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: scrolled
          ? "1px solid rgba(255,255,255,0.08)"
          : "1px solid transparent",
        transition: "background 220ms, border-color 220ms",
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
        {/* Icon mark */}
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 7,
            background: "linear-gradient(135deg, #6366f1, #818cf8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 16px rgba(99,102,241,0.40)",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="1" y="1" width="5" height="5" rx="1.5" fill="white" opacity="0.9" />
            <rect x="8" y="1" width="5" height="5" rx="1.5" fill="white" opacity="0.55" />
            <rect x="1" y="8" width="5" height="5" rx="1.5" fill="white" opacity="0.55" />
            <rect x="8" y="8" width="5" height="5" rx="1.5" fill="white" opacity="0.25" />
          </svg>
        </div>
        <span
          style={{
            fontFamily: "'Chakra Petch', sans-serif",
            fontWeight: 700,
            fontSize: 16,
            color: "#f0f2fa",
            letterSpacing: "0.03em",
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
        {links.map((link) => {
          const active = isActive(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 14,
                fontWeight: active ? 600 : 400,
                color: active ? "#f0f2fa" : "#8492b8",
                textDecoration: "none",
                padding: "6px 16px",
                borderRadius: 8,
                background: active ? "rgba(255,255,255,0.07)" : "transparent",
                transition: "color 150ms, background 150ms",
                position: "relative",
              }}
            >
              {link.label}
            </Link>
          );
        })}
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
              href="/dashboard"
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 14,
                fontWeight: 500,
                color: "#8492b8",
                textDecoration: "none",
                padding: "6px 14px",
                borderRadius: 8,
                transition: "color 150ms",
              }}
            >
              Dashboard
            </Link>
            <button
              onClick={() => { logout(); router.push("/"); }}
              style={{
                padding: "7px 18px",
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: 8,
                color: "#8492b8",
                fontFamily: "'Inter', sans-serif",
                fontWeight: 500,
                fontSize: 13,
                cursor: "pointer",
                transition: "border-color 150ms, color 150ms",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.22)";
                e.currentTarget.style.color = "#f0f2fa";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)";
                e.currentTarget.style.color = "#8492b8";
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
                fontWeight: 500,
                color: "#8492b8",
                textDecoration: "none",
                padding: "7px 16px",
                borderRadius: 8,
                transition: "color 150ms",
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
                borderRadius: 8,
                background: "#6366f1",
                boxShadow: "0 0 20px rgba(99,102,241,0.35)",
                transition: "background 150ms, box-shadow 150ms",
                letterSpacing: "0.01em",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background = "#5254cc";
                (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 0 28px rgba(99,102,241,0.5)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background = "#6366f1";
                (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 0 20px rgba(99,102,241,0.35)";
              }}
            >
              Get started
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
