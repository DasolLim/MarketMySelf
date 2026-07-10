"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { fetchProfile, updateProfile, updateLinks, uploadProfileImage, uploadResume } from "@/lib/api";
import { PixelSection, JobCategory, ExperienceLevel } from "@/types";
import LinkEditor from "@/components/LinkEditor";
import ResumeUpload from "@/components/ResumeUpload";
import { ImageUpload } from "@/components/ImageUpload";

const CATEGORIES: JobCategory[] = ["Technical", "Marketing", "Finance"];
const EXPERIENCE_LEVELS: ExperienceLevel[] = ["junior", "mid", "senior"];
const LEVEL_LABELS: Record<ExperienceLevel, string> = { junior: "Junior", mid: "Mid-level", senior: "Senior" };

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 13px",
  background: "#FFFFFF",
  border: "1px solid rgba(0,0,0,0.18)",
  borderRadius: 7,
  fontFamily: "'Inter', sans-serif",
  fontSize: 14,
  color: "#191919",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 150ms, box-shadow 150ms",
};

export default function ProfilePage() {
  const { accessToken, isLoading, role } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<PixelSection | null>(null);
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [bio, setBio] = useState("");
  const [category, setCategory] = useState<JobCategory | "">("");
  const [level, setLevel] = useState<ExperienceLevel | "">("");
  const [techSkills, setTechSkills] = useState("");
  const [softSkills, setSoftSkills] = useState("");
  const [isPublished, setIsPublished] = useState(false);

  useEffect(() => {
    if (!isLoading && !accessToken) router.push("/login");
    if (!isLoading && accessToken && role && role !== "seeker") router.push("/recruiter");
  }, [isLoading, accessToken, role, router]);

  useEffect(() => {
    if (!accessToken) return;
    fetchProfile(accessToken)
      .then((p) => {
        setProfile(p);
        setFullName(p.full_name ?? "");
        setJobTitle(p.job_title ?? "");
        setBio(p.bio ?? "");
        setCategory((p.job_category as JobCategory) ?? "");
        setLevel((p.experience_level as ExperienceLevel) ?? "");
        setTechSkills((p.tech_skills ?? []).join(", "));
        setSoftSkills((p.soft_skills ?? []).join(", "));
        setIsPublished(p.is_published);
      })
      .catch(() => setError("No section found. Purchase a section first."))
      .finally(() => setFetching(false));
  }, [accessToken]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updateProfile({
        full_name: fullName,
        job_title: jobTitle,
        bio,
        job_category: (category as JobCategory) || undefined,
        experience_level: (level as ExperienceLevel) || undefined,
        tech_skills: techSkills.split(",").map((s) => s.trim()).filter(Boolean),
        soft_skills: softSkills.split(",").map((s) => s.trim()).filter(Boolean),
        is_published: isPublished,
      }, accessToken);
      setProfile(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const focusOn = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => { e.target.style.borderColor = "#0A66C2"; e.target.style.boxShadow = "0 0 0 3px rgba(10,102,194,0.10)"; };
  const focusOff = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => { e.target.style.borderColor = "rgba(0,0,0,0.18)"; e.target.style.boxShadow = "none"; };

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
      <div style={{ maxWidth: 720, margin: "0 auto", animation: "fadeInUp 0.55s cubic-bezier(0.16,1,0.3,1) both" }}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#0A66C2", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 6 }}>Seeker dashboard</div>
            <h1 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: "clamp(22px, 4vw, 32px)", color: "#191919", letterSpacing: "-0.03em" }}>Edit Profile</h1>
          </div>
          <Link href="/dashboard" style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#555555", textDecoration: "none", display: "flex", alignItems: "center", gap: 5 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
            Dashboard
          </Link>
        </div>

        {error && !profile && (
          <div style={{ padding: "16px 20px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.22)", borderRadius: 10, fontFamily: "'Inter', sans-serif", fontSize: 14, color: "#DC2626", marginBottom: 20 }}>
            {error}
            <div style={{ marginTop: 8 }}>
              <Link href="/register" style={{ color: "#0A66C2", fontWeight: 600, textDecoration: "none" }}>Claim a section →</Link>
            </div>
          </div>
        )}

        {profile && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Photo upload */}
            <div style={{ background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, padding: "24px 28px", boxShadow: "0 1px 8px rgba(0,0,0,0.04)" }}>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 16 }}>Profile Photo</div>
              <ImageUpload
                currentImageUrl={profile.image_url}
                onUpload={async (file) => {
                  if (!accessToken) return;
                  const r = await uploadProfileImage(file, accessToken);
                  setProfile((p) => p ? { ...p, image_url: r.image_url } : p);
                }}
              />
            </div>

            {/* Core fields */}
            <form onSubmit={handleSave} style={{ background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, padding: "24px 28px", boxShadow: "0 1px 8px rgba(0,0,0,0.04)" }}>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 20 }}>Profile Info</div>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div>
                    <label style={{ display: "block", fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600, color: "#191919", marginBottom: 6 }}>Full name</label>
                    <input style={inputStyle} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Smith" onFocus={focusOn} onBlur={focusOff} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600, color: "#191919", marginBottom: 6 }}>Job title</label>
                    <input style={inputStyle} value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Senior Designer" onFocus={focusOn} onBlur={focusOff} />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600, color: "#191919", marginBottom: 6 }}>Bio <span style={{ fontWeight: 400, color: "#9CA3AF" }}>({bio.length}/300)</span></label>
                  <textarea
                    style={{ ...inputStyle, minHeight: 90, resize: "vertical", lineHeight: 1.65 }}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    maxLength={300}
                    placeholder="A short intro about who you are and what you do..."
                    onFocus={focusOn as React.FocusEventHandler<HTMLTextAreaElement>}
                    onBlur={focusOff as React.FocusEventHandler<HTMLTextAreaElement>}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div>
                    <label style={{ display: "block", fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600, color: "#191919", marginBottom: 6 }}>Category</label>
                    <select style={{ ...inputStyle, appearance: "none", cursor: "pointer" }} value={category} onChange={(e) => setCategory(e.target.value as JobCategory | "")} onFocus={focusOn} onBlur={focusOff}>
                      <option value="">Select...</option>
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600, color: "#191919", marginBottom: 6 }}>Experience level</label>
                    <select style={{ ...inputStyle, appearance: "none", cursor: "pointer" }} value={level} onChange={(e) => setLevel(e.target.value as ExperienceLevel | "")} onFocus={focusOn} onBlur={focusOff}>
                      <option value="">Select...</option>
                      {EXPERIENCE_LEVELS.map((l) => <option key={l} value={l}>{LEVEL_LABELS[l]}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600, color: "#191919", marginBottom: 4 }}>Tech skills <span style={{ fontWeight: 400, color: "#9CA3AF" }}>(comma-separated)</span></label>
                  <input style={inputStyle} value={techSkills} onChange={(e) => setTechSkills(e.target.value)} placeholder="Python, React, SQL..." onFocus={focusOn} onBlur={focusOff} />
                </div>

                <div>
                  <label style={{ display: "block", fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600, color: "#191919", marginBottom: 4 }}>Soft skills <span style={{ fontWeight: 400, color: "#9CA3AF" }}>(comma-separated)</span></label>
                  <input style={inputStyle} value={softSkills} onChange={(e) => setSoftSkills(e.target.value)} placeholder="Leadership, Communication..." onFocus={focusOn} onBlur={focusOff} />
                </div>

                <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                  <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} style={{ width: 16, height: 16, accentColor: "#0A66C2" }} />
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 600, color: "#191919" }}>Published — visible to recruiters</span>
                </label>

                {error && (
                  <div style={{ padding: "10px 14px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.22)", borderRadius: 8, fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#DC2626" }}>{error}</div>
                )}

                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: "11px 28px",
                    background: saved ? "#057642" : saving ? "rgba(10,102,194,0.5)" : "#0A66C2",
                    border: "none",
                    borderRadius: 20,
                    color: "#fff",
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: saving ? "not-allowed" : "pointer",
                    transition: "background 150ms",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    alignSelf: "flex-start",
                  }}
                >
                  {saving ? (<><div style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 600ms linear infinite" }} />Saving...</>) : saved ? "Saved!" : "Save profile"}
                </button>
              </div>
            </form>

            {/* Resume */}
            <div style={{ background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, padding: "24px 28px", boxShadow: "0 1px 8px rgba(0,0,0,0.04)" }}>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 16 }}>Resume</div>
              <ResumeUpload
                currentResumeUrl={profile.resume_url}
                onUpload={async (file) => {
                  if (!accessToken) return;
                  const r = await uploadResume(file, accessToken);
                  setProfile((p) => p ? { ...p, resume_url: r.resume_url } : p);
                }}
              />
            </div>

            {/* Links */}
            <div style={{ background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, padding: "24px 28px", boxShadow: "0 1px 8px rgba(0,0,0,0.04)" }}>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 16 }}>Links</div>
              <LinkEditor
                initial={profile.links}
                onSave={async (links) => {
                  if (!accessToken) return;
                  const updated = await updateLinks(links, accessToken);
                  setProfile(updated);
                }}
              />
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </main>
  );
}
