"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { fetchMyJobs, deleteJobPost, updateJobPost } from "@/lib/api";
import { JobPost } from "@/types";

export default function RecruiterJobsPage() {
  const { accessToken, isLoading, role } = useAuth();
  const router = useRouter();
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!isLoading && !accessToken) router.push("/login");
    if (!isLoading && accessToken && role && role !== "recruiter") router.push("/dashboard");
  }, [isLoading, accessToken, role, router]);

  useEffect(() => {
    if (!accessToken) return;
    fetchMyJobs(accessToken)
      .then(setJobs)
      .catch(() => {})
      .finally(() => setFetching(false));
  }, [accessToken]);

  async function toggleActive(job: JobPost) {
    if (!accessToken) return;
    const updated = await updateJobPost(job.id, { is_active: !job.is_active }, accessToken);
    setJobs((j) => j.map((jj) => (jj.id === job.id ? updated : jj)));
  }

  async function handleDelete(id: string) {
    if (!accessToken) return;
    await deleteJobPost(id, accessToken);
    setJobs((j) => j.filter((jj) => jj.id !== id));
  }

  if (isLoading || fetching) {
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
      <div style={{ maxWidth: 800, margin: "0 auto", animation: "fadeInUp 0.55s cubic-bezier(0.16,1,0.3,1) both" }}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#0A66C2", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 6 }}>Recruiter</div>
            <h1 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: "clamp(22px, 4vw, 32px)", color: "#191919", letterSpacing: "-0.03em" }}>Job Posts</h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Link href="/recruiter" style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#555555", textDecoration: "none", display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#191919"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#555555"; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
              Dashboard
            </Link>
            <Link href="/recruiter/jobs/new" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 18px", background: "#0A66C2", borderRadius: 20, color: "#fff", fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13, textDecoration: "none" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              New post
            </Link>
          </div>
        </div>

        {jobs.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 24px", background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, boxShadow: "0 1px 8px rgba(0,0,0,0.04)" }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.2" style={{ display: "block", margin: "0 auto 14px" }}>
              <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 10h8M8 14h5"/>
            </svg>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, fontWeight: 600, color: "#191919", marginBottom: 6 }}>No job posts yet</div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#9CA3AF", marginBottom: 20 }}>Create your first job post to start attracting candidates.</div>
            <Link href="/recruiter/jobs/new" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 22px", background: "#0A66C2", borderRadius: 20, color: "#fff", fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 14, textDecoration: "none" }}>
              Post a job
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {jobs.map((job) => (
              <div key={job.id} style={{ background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, padding: "20px 24px", boxShadow: "0 1px 6px rgba(0,0,0,0.04)", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: job.is_active ? "#057642" : "#9CA3AF" }} />
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 5, flexWrap: "wrap" }}>
                      <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 15, color: "#191919" }}>{job.title}</div>
                      <span style={{ display: "inline-block", padding: "2px 9px", background: job.is_active ? "rgba(5,118,66,0.07)" : "rgba(0,0,0,0.04)", border: `1px solid ${job.is_active ? "rgba(5,118,66,0.22)" : "rgba(0,0,0,0.14)"}`, borderRadius: 100, fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 700, color: job.is_active ? "#057642" : "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        {job.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#555555", marginBottom: 6 }}>
                      {job.job_category}{job.experience_level ? ` · ${job.experience_level[0].toUpperCase()}${job.experience_level.slice(1)}` : ""}
                    </div>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#9CA3AF" }}>
                      Posted {new Date(job.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    <button
                      onClick={() => toggleActive(job)}
                      style={{ padding: "6px 14px", background: "transparent", border: "1px solid rgba(0,0,0,0.18)", borderRadius: 20, fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 600, color: "#555555", cursor: "pointer", transition: "border-color 150ms" }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(0,0,0,0.35)")}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(0,0,0,0.18)")}
                    >
                      {job.is_active ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      onClick={() => handleDelete(job.id)}
                      style={{ padding: "6px 14px", background: "transparent", border: "1px solid rgba(239,68,68,0.30)", borderRadius: 20, fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 600, color: "#DC2626", cursor: "pointer", transition: "border-color 150ms" }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(239,68,68,0.60)")}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(239,68,68,0.30)")}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <style>{`@keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </main>
  );
}
