"use client";

import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";

interface ImageUploadProps {
  currentImageUrl?: string | null;
  onUpload: (file: File) => Promise<void>;
  disabled?: boolean;
}

const MAX_SIZE = 500_000; // 500 KB
const ACCEPTED = { "image/jpeg": [], "image/png": [], "image/webp": [] };

export function ImageUpload({ currentImageUrl, onUpload, disabled = false }: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    async (accepted: File[], rejected: any[]) => {
      setError(null);

      if (rejected.length > 0) {
        const reason = rejected[0]?.errors?.[0]?.message ?? "Invalid file";
        setError(reason);
        return;
      }

      const file = accepted[0];
      if (!file) return;

      // Client-side size check (backend enforces too)
      if (file.size > MAX_SIZE) {
        setError("Image must be under 500 KB");
        return;
      }

      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);

      try {
        setUploading(true);
        await onUpload(file);
      } catch (err: any) {
        setError(err?.message ?? "Upload failed");
        setPreview(null);
      } finally {
        setUploading(false);
        URL.revokeObjectURL(objectUrl);
      }
    },
    [onUpload],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED,
    maxSize: MAX_SIZE,
    maxFiles: 1,
    disabled: disabled || uploading,
  });

  const displayImg = preview ?? currentImageUrl;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div
        {...getRootProps()}
        style={{
          position: "relative",
          width: 120,
          height: 120,
          borderRadius: "50%",
          border: isDragActive
            ? "2px solid #22d3ee"
            : error
            ? "2px dashed #f87171"
            : "2px dashed #1e2d45",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: disabled ? "not-allowed" : "pointer",
          overflow: "hidden",
          background: isDragActive ? "rgba(34,211,238,0.06)" : "#0d1117",
          transition: "border-color 150ms, background 150ms",
          boxShadow: isDragActive ? "0 0 16px rgba(34,211,238,0.2)" : "none",
        }}
      >
        <input {...getInputProps()} />

        {displayImg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={displayImg}
            alt="Profile preview"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
            }}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke={isDragActive ? "#22d3ee" : "#2d3748"}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 9,
                color: isDragActive ? "#22d3ee" : "#2d3748",
                textAlign: "center",
                lineHeight: 1.3,
              }}
            >
              {isDragActive ? "drop it" : "upload\nphoto"}
            </span>
          </div>
        )}

        {uploading && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(6,8,16,0.75)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "50%",
            }}
          >
            <div
              style={{
                width: 20,
                height: 20,
                border: "2px solid #1e2d45",
                borderTopColor: "#22d3ee",
                borderRadius: "50%",
                animation: "spin 600ms linear infinite",
              }}
            />
          </div>
        )}
      </div>

      {error && (
        <p
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11,
            color: "#f87171",
            margin: 0,
          }}
        >
          {error}
        </p>
      )}

      <p
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 10,
          color: "#2d3748",
          margin: 0,
          lineHeight: 1.5,
        }}
      >
        JPG / PNG / WebP · max 500 KB
        <br />
        Auto-resized to 400×400
      </p>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
