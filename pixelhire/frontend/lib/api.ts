import {
  Application,
  CoachingSession,
  JobPost,
  JobPostPayload,
  LinksPayload,
  Notification,
  Payment,
  PixelSection,
  ProfileUpdatePayload,
  ResumeAnalysisHistoryItem,
  ResumeAnalysisResponse,
  ScrapedJob,
  ScrapedJobDetail,
  ScrapedJobFacets,
  ScrapedJobFilters,
  ScrapedJobSearchResponse,
  ScrapedJobsResponse,
  SearchFilters,
  SectionUpdatePayload,
  Subscription,
  SubscriptionTierInfo,
  UserRole,
  ValidationError,
} from "@/types";

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

function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

function buildQuery(params: Record<string, unknown>): string {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") q.set(key, String(value));
  }
  return q.toString();
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export async function fetchSignupStats(): Promise<{
  signups_this_month: number;
  monthly_limit: number;
  spots_remaining: number;
}> {
  return request("/auth/stats");
}

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

export async function register(email: string, password: string, role: UserRole): Promise<void> {
  await request("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, role }),
  });
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
  token: string,
): Promise<void> {
  await request("/auth/change-password", {
    method: "POST",
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    headers: authHeaders(token),
  });
}

// ── Sections ─────────────────────────────────────────────────────────────────

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

// ── Profile ───────────────────────────────────────────────────────────────────

export async function fetchProfile(token: string): Promise<PixelSection> {
  return request<PixelSection>("/profile/me", { headers: authHeaders(token) });
}

export async function updateProfile(
  payload: ProfileUpdatePayload,
  token: string,
): Promise<PixelSection> {
  return request<PixelSection>("/profile/me", {
    method: "PATCH",
    body: JSON.stringify(payload),
    headers: authHeaders(token),
  });
}

export async function uploadProfileImage(file: File, token: string): Promise<{ image_url: string }> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE}/profile/me/image`, {
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

export async function uploadResume(file: File, token: string): Promise<{ resume_url: string }> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE}/profile/me/resume`, {
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

export async function updateLinks(payload: LinksPayload, token: string): Promise<PixelSection> {
  return request<PixelSection>("/profile/me/links", {
    method: "PATCH",
    body: JSON.stringify(payload),
    headers: authHeaders(token),
  });
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
  return request<Payment[]>(`/payments/history`, { headers: authHeaders(token) });
}

// ── Subscriptions ─────────────────────────────────────────────────────────────

export async function fetchSubscriptionTiers(): Promise<SubscriptionTierInfo[]> {
  return request<SubscriptionTierInfo[]>("/subscriptions/tiers");
}

export async function fetchMySubscription(token: string): Promise<Subscription | null> {
  return request<Subscription | null>("/subscriptions/me", { headers: authHeaders(token) });
}

export async function createSubscriptionCheckout(
  tier: string,
  return_url: string,
  token: string,
): Promise<{ checkout_url: string }> {
  return request<{ checkout_url: string }>("/subscriptions/checkout", {
    method: "POST",
    body: JSON.stringify({ tier, return_url }),
    headers: authHeaders(token),
  });
}

export async function cancelSubscription(token: string): Promise<void> {
  await request("/subscriptions/me", { method: "DELETE", headers: authHeaders(token) });
}

// ── Jobs ──────────────────────────────────────────────────────────────────────

export async function fetchPublicJobs(params: {
  job_category?: string;
  is_active?: boolean;
  page?: number;
  limit?: number;
}): Promise<JobPost[]> {
  return request<JobPost[]>(`/jobs/browse?${buildQuery(params)}`);
}

export async function createJobPost(payload: JobPostPayload, token: string): Promise<JobPost> {
  return request<JobPost>("/jobs", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: authHeaders(token),
  });
}

export async function fetchMyJobs(token: string): Promise<JobPost[]> {
  return request<JobPost[]>("/jobs", { headers: authHeaders(token) });
}

export async function fetchJob(id: string): Promise<JobPost> {
  return request<JobPost>(`/jobs/${id}`);
}

export async function updateJobPost(
  id: string,
  payload: Partial<JobPostPayload> & { is_active?: boolean },
  token: string,
): Promise<JobPost> {
  return request<JobPost>(`/jobs/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    headers: authHeaders(token),
  });
}

export async function deleteJobPost(id: string, token: string): Promise<void> {
  await request(`/jobs/${id}`, { method: "DELETE", headers: authHeaders(token) });
}

// ── Applications ──────────────────────────────────────────────────────────────

export async function fetchMyApplications(token: string): Promise<Application[]> {
  return request<Application[]>("/applications/me", { headers: authHeaders(token) });
}

export async function fetchNotifications(token: string): Promise<Notification[]> {
  return request<Notification[]>("/applications/notifications", { headers: authHeaders(token) });
}

export async function markNotificationRead(id: string, token: string): Promise<void> {
  await request(`/applications/notifications/${id}/read`, {
    method: "POST",
    headers: authHeaders(token),
  });
}

export async function updateApplicationStatus(
  id: string,
  status: string,
  token: string,
): Promise<Application> {
  return request<Application>(`/applications/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
    headers: authHeaders(token),
  });
}

// ── Search ────────────────────────────────────────────────────────────────────

export async function fetchPublicTalent(params: {
  job_category?: string;
  experience_level?: string;
  page?: number;
  limit?: number;
} = {}): Promise<PixelSection[]> {
  return request<PixelSection[]>(`/search/talent?${buildQuery(params)}`);
}

export async function searchSeekers(filters: SearchFilters, token: string): Promise<PixelSection[]> {
  return request<PixelSection[]>(`/search/users?${buildQuery(filters as Record<string, unknown>)}`, { headers: authHeaders(token) });
}

export async function notifySeeker(user_id: string, message: string, token: string): Promise<void> {
  await request("/search/notify", {
    method: "POST",
    body: JSON.stringify({ user_id, message }),
    headers: authHeaders(token),
  });
}

// ── AI Coaching ───────────────────────────────────────────────────────────────

export async function submitResumeForCoaching(
  resume_text: string,
  token: string,
): Promise<{ id: string; type: string; feedback: string; created_at: string }> {
  return request("/coaching/resume", {
    method: "POST",
    body: JSON.stringify({ resume_text }),
    headers: authHeaders(token),
  });
}

export async function startInterviewPrep(
  job_category: string | null,
  skills: string[],
  token: string,
): Promise<{ id: string; type: string; questions: string[]; created_at: string }> {
  return request("/coaching/interview", {
    method: "POST",
    body: JSON.stringify({ job_category, skills }),
    headers: authHeaders(token),
  });
}

export async function fetchCoachingHistory(token: string): Promise<CoachingSession[]> {
  return request<CoachingSession[]>("/coaching/history", { headers: authHeaders(token) });
}

export async function analyzeResume(
  formData: FormData,
  token: string,
): Promise<ResumeAnalysisResponse | ValidationError> {
  const res = await fetch(`${BASE}/coaching/resume-analyze`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (res.status === 422) {
    const body = await res.json();
    // FastAPI wraps HTTPException detail — unwrap if needed
    return (body?.detail ?? body) as ValidationError;
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.detail ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<ResumeAnalysisResponse>;
}

export async function getResumeAnalysisHistory(token: string): Promise<ResumeAnalysisHistoryItem[]> {
  return request<ResumeAnalysisHistoryItem[]>("/coaching/resume-analyze/history", {
    headers: authHeaders(token),
  });
}

export async function getResumeAnalysis(analysisId: string, token: string): Promise<ResumeAnalysisResponse> {
  return request<ResumeAnalysisResponse>(`/coaching/resume-analyze/${analysisId}`, {
    headers: authHeaders(token),
  });
}

// ── Scraped Jobs (public job board) ──────────────────────────────────────────

function buildScrapedJobSearchQuery(params: {
  query?: string;
  category?: string;
  work_types?: string[];
  experience_levels?: string[];
  employment_types?: string[];
  skills?: string[];
  salary_min?: number;
  salary_max?: number;
  location_city?: string;
  company?: string;
  sources?: string[];
  posted_within_days?: number;
  page?: number;
  page_size?: number;
  include_facets?: boolean;
}): string {
  const p = new URLSearchParams();
  if (params.query)              p.set("query", params.query);
  if (params.category)           p.set("category", params.category);
  if (params.salary_min != null) p.set("salary_min", String(params.salary_min));
  if (params.salary_max != null) p.set("salary_max", String(params.salary_max));
  if (params.location_city)      p.set("location_city", params.location_city);
  if (params.company)            p.set("company", params.company);
  if (params.posted_within_days) p.set("posted_within_days", String(params.posted_within_days));
  if (params.page != null)       p.set("page", String(params.page));
  if (params.page_size != null)  p.set("page_size", String(params.page_size));
  if (params.include_facets)     p.set("include_facets", "true");
  params.work_types?.forEach((v)        => p.append("work_types", v));
  params.experience_levels?.forEach((v) => p.append("experience_levels", v));
  params.employment_types?.forEach((v)  => p.append("employment_types", v));
  params.skills?.forEach((v)            => p.append("skills", v));
  params.sources?.forEach((v)           => p.append("sources", v));
  return p.toString();
}

export async function searchScrapedJobs(
  params: Parameters<typeof buildScrapedJobSearchQuery>[0] = {},
): Promise<ScrapedJobSearchResponse> {
  const qs = buildScrapedJobSearchQuery(params);
  return request<ScrapedJobSearchResponse>(`/scraped-jobs/search${qs ? `?${qs}` : ""}`);
}

export async function getScrapedJobById(id: string): Promise<ScrapedJobDetail> {
  return request<ScrapedJobDetail>(`/scraped-jobs/${id}`);
}

// ── Scraped Jobs legacy (seeker-facing auth-gated dashboard) ─────────────────

export async function getScrapedJobs(
  accessToken: string,
  filters: ScrapedJobFilters = {},
): Promise<ScrapedJobsResponse> {
  const params: Record<string, unknown> = {};
  if (filters.keywords)            params.keywords = filters.keywords;
  if (filters.category)            params.category = filters.category;
  if (filters.experience_level)    params.experience_level = filters.experience_level;
  if (filters.work_type)           params.work_type = filters.work_type;
  if (filters.employment_type)     params.employment_type = filters.employment_type;
  if (filters.company)             params.company = filters.company;
  if (filters.location_city)       params.location_city = filters.location_city;
  if (filters.skills?.length)      params.skills = filters.skills.join(",");
  if (filters.salary_min)          params.salary_min = filters.salary_min;
  if (filters.posted_within_hours) params.posted_within_hours = filters.posted_within_hours;
  if (filters.page)                params.page = filters.page;
  if (filters.page_size)           params.page_size = filters.page_size;

  const qs = buildQuery(params);
  return request<ScrapedJobsResponse>(
    `/scraped-jobs${qs ? `?${qs}` : ""}`,
    { headers: authHeaders(accessToken) },
  );
}

export async function getScrapedJob(
  accessToken: string,
  id: string,
): Promise<ScrapedJob> {
  return request<ScrapedJob>(`/scraped-jobs/${id}`, {
    headers: authHeaders(accessToken),
  });
}

export async function getScrapedJobFacets(
  accessToken: string,
): Promise<ScrapedJobFacets> {
  return request<ScrapedJobFacets>("/scraped-jobs/facets", {
    headers: authHeaders(accessToken),
  });
}
