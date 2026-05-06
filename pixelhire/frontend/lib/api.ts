import { GridSection, PixelSection, SectionUpdatePayload, Payment } from "@/types";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.detail ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

// ── Sections ─────────────────────────────────────────────────────────────────

export async function fetchGridSections(page: 1 | 2 | 3 | 4 | 5): Promise<GridSection[]> {
  return request<GridSection[]>(`/sections/page/${page}`);
}

export async function fetchSection(id: string): Promise<PixelSection> {
  return request<PixelSection>(`/sections/${id}`);
}

export async function updateSection(
  id: string,
  payload: SectionUpdatePayload,
  token: string,
): Promise<PixelSection> {
  return request<PixelSection>(`/sections/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    headers: authHeaders(token),
  });
}

export async function uploadSectionImage(
  id: string,
  file: File,
  token: string,
): Promise<{ image_url: string; size_bytes: number }> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE}/sections/${id}/image`, {
    method: "POST",
    headers: authHeaders(token),
    body: form,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.detail ?? `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Payments ─────────────────────────────────────────────────────────────────

export async function createPaymentIntent(
  pixel_section_id: string,
  token: string,
): Promise<{ client_secret: string; payment_intent_id: string; amount: number }> {
  return request(`/payments/intent`, {
    method: "POST",
    body: JSON.stringify({ pixel_section_id }),
    headers: authHeaders(token),
  });
}

export async function fetchPaymentHistory(token: string): Promise<Payment[]> {
  return request<Payment[]>(`/payments/history`, {
    headers: authHeaders(token),
  });
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export async function login(
  email: string,
  password: string,
): Promise<{ access_token: string; refresh_token: string }> {
  const form = new URLSearchParams({ username: email, password });
  const res = await fetch(`${BASE}/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
  if (!res.ok) throw new Error("Invalid credentials");
  return res.json();
}

export async function register(email: string, password: string): Promise<void> {
  await request("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}
