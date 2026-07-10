"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { searchSeekers, notifySeeker } from "@/lib/api";
import { PixelSection, SearchFilters as SearchFiltersType } from "@/types";
import SearchFilters from "@/components/SearchFilters";
import TalentCard from "@/components/TalentCard";

export default function RecruiterSearchPage() {
  const { accessToken, isLoading, role } = useAuth();
  const router = useRouter();
  const [results, setResults] = useState<PixelSection[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (!isLoading && !accessToken) router.push("/login");
    if (!isLoading && accessToken && role && role !== "recruiter") router.push("/dashboard");
  }, [isLoading, accessToken, role, router]);

  async function handleSearch(filters: SearchFiltersType) {
    if (!accessToken) return;
    setSearching(true);
    setSearched(false);
    try {
      const data = await searchSeekers(filters, accessToken);
      setResults(data);
      setSearched(true);
    } catch {
      setResults([]);
      setSearched(true);
    } finally {
      setSearching(false);
    }
  }

  if (isLoading) {
    return (
      <main style={{ minHeight: "100vh", background: "#F3F2EF", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 18, height: 18, border: "2px solid rgba(10,102,194,0.2)", borderTopColor: "#0A66C2", borderRadius: "50%", animation: "spin 600ms linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", background: "#F3F2EF", padding: "80px clamp(20px, 5vw, 60px) 60px", position: "relative" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "#0A66C2" }} />
      <div style={{ maxWidth: 960, margin: "0 auto", animation: "fadeInUp 0.55s cubic-bezier(0.16,1,0.3,1) both" }}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#0A66C2", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 6 }}>Recruiter</div>
            <h1 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: "clamp(22px, 4vw, 32px)", color: "#191919", letterSpacing: "-0.03em" }}>Search Talent</h1>
          </div>
          <Link href="/recruiter" style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#555555", textDecoration: "none", display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#191919"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#555555"; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
            Dashboard
          </Link>
        </div>

        <div style={{ background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, padding: "22px 26px", marginBottom: 20, boxShadow: "0 1px 8px rgba(0,0,0,0.04)" }}>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 16 }}>Filters</div>
          <SearchFilters onSearch={handleSearch} loading={searching} />
        </div>

        {searched && (
          <div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 14 }}>
              {results.length} result{results.length !== 1 ? "s" : ""}
            </div>
            {results.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px", background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12 }}>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, fontWeight: 600, color: "#191919", marginBottom: 6 }}>No matches found</div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#9CA3AF" }}>Try broadening your filters or removing some constraints.</div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
                {results.map((section) => (
                  <TalentCard
                    key={section.id}
                    section={section}
                    onNotify={section.owner_id ? async (ownerId) => {
                      if (!accessToken) return;
                      await notifySeeker(ownerId, "A recruiter is interested in your profile. Visit MarketMySelf to learn more.", accessToken);
                    } : undefined}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {!searched && !searching && (
          <div style={{ textAlign: "center", padding: "48px 20px" }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.2" style={{ display: "block", margin: "0 auto 14px" }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, fontWeight: 600, color: "#191919", marginBottom: 6 }}>Search the talent pool</div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#9CA3AF" }}>Use the filters above to find candidates by skill, category, or experience.</div>
          </div>
        )}
      </div>
      <style>{`@keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </main>
  );
}
