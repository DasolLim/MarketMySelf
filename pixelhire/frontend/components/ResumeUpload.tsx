"use client";

import React, { useState } from "react";
import { useDropzone } from "react-dropzone";

interface Props {
  currentResumeUrl?: string | null;
  onUpload: (file: File) => Promise<void>;
}

export default function ResumeUpload({ currentResumeUrl, onUpload }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState(false);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "application/pdf": [] },
    maxSize: 10 * 1024 * 1024,
    multiple: false,
    onDropAccepted: async ([file]) => {
      setError(null);
      setUploading(true);
      try {
        await onUpload(file);
        setUploaded(true);
        setTimeout(() => setUploaded(false), 3000);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    onDropRejected: () => setError("Must be a PDF under 10 MB"),
  });

  return (
    <div>
      <div
        {...getRootProps()}
        style={{
          border: `2px dashed ${isDragActive ? "#0A66C2" : "rgba(0,0,0,0.18)"}`,
          borderRadius: 10,
          padding: "20px 24px",
          display: "flex",
          alignItems: "center",
          gap: 16,
          cursor: "pointer",
          background: isDragActive ? "rgba(10,102,194,0.04)" : "#FAFAFA",
          transition: "border-color 150ms, background 150ms",
        }}
      >
        <input {...getInputProps()} />
        <div style={{ width: 40, height: 40, borderRadius: 9, background: "rgba(10,102,194,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0A66C2" strokeWidth="1.8">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="12" y1="18" x2="12" y2="12"/>
            <line x1="9" y1="15" x2="15" y2="15"/>
          </svg>
        </div>
        <div>
          {uploading ? (
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: "#0A66C2", fontWeight: 600 }}>Uploading...</div>
          ) : uploaded ? (
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: "#057642", fontWeight: 600 }}>Resume uploaded!</div>
          ) : currentResumeUrl ? (
            <>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: "#191919", fontWeight: 600 }}>Resume on file</div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#9CA3AF" }}>Drop a new PDF to replace it</div>
            </>
          ) : (
            <>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: "#191919", fontWeight: 600 }}>
                {isDragActive ? "Drop your resume here" : "Upload your resume"}
              </div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#9CA3AF" }}>PDF only · Max 10 MB</div>
            </>
          )}
        </div>
      </div>

      {currentResumeUrl && !uploading && (
        <a
          href={currentResumeUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 8, fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#0A66C2", textDecoration: "none" }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          View current resume
        </a>
      )}

      {error && (
        <div style={{ marginTop: 10, padding: "10px 14px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.22)", borderRadius: 7, fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#DC2626" }}>
          {error}
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
