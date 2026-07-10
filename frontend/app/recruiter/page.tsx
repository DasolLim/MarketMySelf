"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

const quickLinks = [
  {
    href: "/recruiter/search",
    label: "Search Talent",
    desc: "Filter candidates by skills, category, and experience",
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  },
  {
    href: "/recruiter/jobs",
    label: "Job Posts",
    desc: "Manage your open roles and view applicants",
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 10h8M8 14h5"/></svg>,
  },
  {
    href: "/recruiter/jobs/new",
    label: "Post a Job",
    desc: "Create a new job listing to attract candidates",
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>,
  },
  {
    href: "/recruiter/hire/technical",
    label: "Browse Talent",
    desc: "Explore candidates by category",
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  },
];

export default function RecruiterPage() {
  const { accessToken, isLoading, role, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !accessToken) router.push("/login");
    if (!isLoading && accessToken && role && role !== "recruiter") router.push("/dashboard");
  }, [isLoading, accessToken, role, router]);

  if (isLoading) {
    return (
      <main style={{ minHeight: "100vh", background: "#F3F2EF", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 18, height: 18, border: "2px solid rgba(10,102,194,0.2)", borderTopColor: "#0A66C2", borderRadius: "50%", animation: "spin 600ms linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </main>
    );
  }

  if (!accessToken) return null;

  return (
    <main style={{ minHeight: "100vh", background: "#F3F2EF", color: "#191919", padding: "80px clamp(20px, 5vw, 60px) 60px", position: "relative" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "#0A66C2" }} />

      <div style={{ maxWidth: 800, margin: "0 auto", animation: "fadeInUp 0.55s cubic-bezier(0.16,1,0.3,1) both" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#0A66C2", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>Recruiter hub</div>
            <h1 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: "clamp(26px, 4vw, 36px)", color: "#191919", letterSpacing: "-0.03em" }}>Recruiter Dashboard</h1>
          </div>
          <button
            onClick={() => { logout(); router.push("/"); }}
            style={{ padding: "8px 20px", background: "transparent", border: "1px solid rgba(0,0,0,0.20)", borderRadius: 20, color: "#555555", fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 14, cursor: "pointer", transition: "border-color 150ms, color 150ms" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(0,0,0,0.40)"; e.currentTarget.style.color = "#191919"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(0,0,0,0.20)"; e.currentTarget.style.color = "#555555"; }}
          >
            Sign out
          </button>
        </div>

        <div style={{ background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, padding: "22px 28px", marginBottom: 16, position: "relative", overflow: "hidden", boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "#0A66C2" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(10,102,194,0.08)", border: "2px solid rgba(10,102,194,0.20)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0A66C2" strokeWidth="1.6"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
            </div>
            <div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 15, color: "#191919", marginBottom: 3 }}>Recruiter Account</div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#9CA3AF" }}>Search, connect with, and hire from the PixelHire talent pool.</div>
            </div>
            <div style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px", background: "rgba(5,118,66,0.08)", border: "1px solid rgba(5,118,66,0.22)", borderRadius: 100, fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#057642", fontWeight: 600 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#057642", animation: "glow-pulse 2s ease infinite" }} />
              Active
            </div>
          </div>
        </div>

        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 12 }}>Quick Links</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "18px 18px", background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 10, textDecoration: "none", transition: "border-color 150ms, transform 150ms, box-shadow 150ms", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(0,0,0,0.18)"; (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-1px)"; (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(0,0,0,0.08)"; (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 1px 4px rgba(0,0,0,0.04)"; }}
            >
              <div style={{ color: "#0A66C2", flexShrink: 0, marginTop: 1 }}>{link.icon}</div>
              <div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 14, color: "#191919", marginBottom: 3 }}>{link.label}</div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#9CA3AF" }}>{link.desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
      <style>{`@keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } } @keyframes glow-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </main>
  );
}
