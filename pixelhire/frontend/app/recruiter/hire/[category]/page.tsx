"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { searchSeekers, notifySeeker } from "@/lib/api";
import { PixelSection } from "@/types";
import { JOB_CATEGORIES, getCategoryBySlug } from "@/types/job-categories";
import TalentCard from "@/components/TalentCard";

export default function HireCategoryPage({ params }: { params: { category: string } }) {
  const { accessToken, isLoading, role } = useAuth();
  const router = useRouter();
  const cat = getCategoryBySlug(params.category);

  const [profiles, setProfiles] = useState<PixelSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!accessToken) { router.push("/login"); return; }
    if (role && role !== "recruiter") router.push("/dashboard");
  }, [isLoading, accessToken, role, router]);

  useEffect(() => {
    if (!cat) { router.push("/recruiter"); return; }
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    searchSeekers({ job_category: cat.apiValue }, accessToken)
      .then(setProfiles)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load profiles"))
      .finally(() => setLoading(false));
  }, [accessToken, cat, router]);

  async function handleNotify(ownerId: string) {
    if (!accessToken) return;
    await notifySeeker(ownerId, "A recruiter is interested in your profile on PixelHire.", accessToken);
  }

  if (isLoading || !cat) {
    return (
      <main style={{ minHeight: "100vh", background: "#F3F2EF", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 18, height: 18, border: "2px solid rgba(10,102,194,0.2)", borderTopColor: "#0A66C2", borderRadius: "50%", animation: "spin 600ms linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </main>
    );
  }

  if (!accessToken) return null;

  return (
    <main style={{ minHeight: "100vh", background: "#F3F2EF", color: "#191919", padding: "80px clamp(20px, 5vw, 80px) 60px", position: "relative" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "#0A66C2" }} />

      <div style={{ maxWidth: 1120, margin: "0 auto", animation: "fadeInUp 0.55s cubic-bezier(0.16,1,0.3,1) both" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 32, flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#0A66C2", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>Recruiter</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: cat.color }} />
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: cat.color, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" }}>
                {cat.label}
              </div>
            </div>
            <h1 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: "clamp(22px, 4vw, 32px)", color: "#191919", letterSpacing: "-0.03em", marginBottom: 8 }}>
              {cat.recruiterHeadline}
            </h1>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, color: "#555555", lineHeight: 1.7, maxWidth: "60ch" }}>
              {cat.recruiterSubhead}
            </p>
          </div>
          <Link href="/recruiter" style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#555555", textDecoration: "none", display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#191919"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#555555"; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
            Dashboard
          </Link>
        </div>

        {/* Category tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 28, flexWrap: "wrap" }}>
          {JOB_CATEGORIES.map((c) => (
            <Link
              key={c.slug}
              href={`/recruiter/hire/${c.slug}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 16px",
                background: c.slug === params.category ? "#0A66C2" : "#FFFFFF",
                border: `1px solid ${c.slug === params.category ? "#0A66C2" : "rgba(0,0,0,0.12)"}`,
                borderRadius: 20,
                color: c.slug === params.category ? "#fff" : "#555555",
                fontFamily: "'Inter', sans-serif",
                fontSize: 13,
                fontWeight: 600,
                textDecoration: "none",
                transition: "all 150ms",
              }}
              onMouseEnter={(e) => {
                if (c.slug !== params.category) {
                  (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(0,0,0,0.25)";
                  (e.currentTarget as HTMLAnchorElement).style.color = "#191919";
                }
              }}
              onMouseLeave={(e) => {
                if (c.slug !== params.category) {
                  (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(0,0,0,0.12)";
                  (e.currentTarget as HTMLAnchorElement).style.color = "#555555";
                }
              }}
            >
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: c.slug === params.category ? "rgba(255,255,255,0.8)" : c.color }} />
              {c.label}
            </Link>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div style={{ padding: "12px 16px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.22)", borderRadius: 10, fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#DC2626", marginBottom: 20 }}>
            {error}
          </div>
        )}

        {/* Results */}
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, padding: "22px 24px", height: 180, animation: `pulse 1.4s ease ${i * 0.1}s infinite` }} />
            ))}
          </div>
        ) : profiles.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 20px" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(10,102,194,0.08)", border: "1px solid rgba(10,102,194,0.18)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0A66C2" strokeWidth="1.6"><circle cx="12" cy="7" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
            </div>
            <h3 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 18, color: "#191919", marginBottom: 8 }}>
              No published profiles yet
            </h3>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: "#9CA3AF", maxWidth: "36ch", margin: "0 auto" }}>
              {cat.label} candidates are signing up. Check back soon as more profiles go live.
            </p>
          </div>
        ) : (
          <>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#9CA3AF", marginBottom: 16 }}>
              {profiles.length} profile{profiles.length !== 1 ? "s" : ""} found
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
              {profiles.map((profile) => (
                <TalentCard
                  key={profile.id}
                  section={profile}
                  onNotify={handleNotify}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>
    </main>
  );
}
