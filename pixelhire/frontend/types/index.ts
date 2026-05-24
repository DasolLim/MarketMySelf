// ── Enums & constants ─────────────────────────────────────────────────────────

export type JobCategory = "Technical" | "Marketing" | "Finance";
export type ExperienceLevel = "junior" | "mid" | "senior";
export type SubscriptionTier = "free" | "basic" | "standard" | "premium";
export type UserRole = "seeker" | "recruiter" | "admin";
export type PaymentStatus = "pending" | "succeeded" | "failed" | "refunded";
export type ApplicationStatus = "applied" | "viewed" | "shortlisted" | "rejected";
export type SubscriptionStatus = "active" | "cancelled" | "past_due";

// ── Core models ───────────────────────────────────────────────────────────────

export interface PixelSection {
  id: string;
  page_number: 1 | 2 | 3 | 4 | 5;
  row: number;
  col: number;
  owner_id: string | null;
  full_name: string | null;
  job_title: string | null;
  bio: string | null;
  portfolio_url: string | null;
  job_category: JobCategory | null;
  skills: string[];
  experience_level: ExperienceLevel | null;
  tech_skills: string[];
  soft_skills: string[];
  resume_url: string | null;
  links: Record<string, string> | null;
  image_url: string | null;
  is_published: boolean;
  purchased_at: string | null;
  price_paid: number | null;
  updated_at: string;
}

export type GridSection = Pick<
  PixelSection,
  "id" | "page_number" | "row" | "col" | "owner_id" | "full_name" | "job_title" | "image_url" | "job_category" | "is_published"
>;

export interface Payment {
  id: string;
  user_id: string;
  pixel_section_id: string;
  stripe_payment_intent_id: string;
  amount: number;
  status: PaymentStatus;
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  stripe_subscription_id: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  current_period_start: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionTierInfo {
  tier: SubscriptionTier;
  price_cents: number;
  label: string;
  features: string[];
}

export interface JobPost {
  id: string;
  recruiter_id: string;
  title: string;
  description: string;
  job_category: JobCategory;
  required_tech_skills: string[];
  required_soft_skills: string[];
  experience_level: ExperienceLevel | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Application {
  id: string;
  seeker_id: string;
  job_post_id: string;
  status: ApplicationStatus;
  notification_sent: boolean;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  subject: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

export interface CoachingSession {
  id: string;
  user_id: string;
  type: "resume" | "interview";
  input_text: string | null;
  feedback: string | null;
  questions: string[] | null;
  created_at: string;
}

// ── Payloads ──────────────────────────────────────────────────────────────────

export interface SectionUpdatePayload {
  full_name?: string;
  job_title?: string;
  bio?: string;
  portfolio_url?: string;
  job_category?: JobCategory;
  skills?: string[];
  experience_level?: ExperienceLevel;
  tech_skills?: string[];
  soft_skills?: string[];
  links?: Record<string, string>;
  is_published?: boolean;
}

export interface ProfileUpdatePayload {
  full_name?: string;
  job_title?: string;
  bio?: string;
  job_category?: JobCategory;
  experience_level?: ExperienceLevel;
  tech_skills?: string[];
  soft_skills?: string[];
  is_published?: boolean;
}

export interface LinksPayload {
  github?: string;
  linkedin?: string;
  portfolio?: string;
  twitter?: string;
  other?: string;
}

export interface JobPostPayload {
  title: string;
  description: string;
  job_category: JobCategory;
  required_tech_skills: string[];
  required_soft_skills: string[];
  experience_level?: ExperienceLevel;
}

export interface SearchFilters {
  job_category?: JobCategory;
  experience_level?: ExperienceLevel;
  tech_skills?: string;
  soft_skills?: string;
  keyword?: string;
  page?: number;
  limit?: number;
}

// ── Grid constants ────────────────────────────────────────────────────────────

export const GRID_ROWS = 10;
export const GRID_COLS = 10;
export const TOTAL_SECTIONS = GRID_ROWS * GRID_COLS;

export const PAGE_PRICES: Record<1 | 2 | 3 | 4 | 5, number> = {
  1: 10.0,
  2: 6.99,
  3: 5.0,
  4: 3.99,
  5: 2.99,
};

export const CATEGORY_COLORS: Record<JobCategory, string> = {
  Technical: "bg-blue-500",
  Marketing: "bg-purple-500",
  Finance: "bg-emerald-500",
};

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  applied: "Applied",
  viewed: "Viewed",
  shortlisted: "Shortlisted",
  rejected: "Rejected",
};

export const EXPERIENCE_LEVEL_LABELS: Record<ExperienceLevel, string> = {
  junior: "Junior",
  mid: "Mid-level",
  senior: "Senior",
};

// ── Scraped Jobs (public live job board) ─────────────────────────────────────

export interface ScrapedJob {
  id: string;
  title: string;
  company: string;
  company_slug: string | null;
  work_type: "remote" | "on_site" | "hybrid" | null;
  experience_level: "entry" | "mid" | "senior" | "lead" | "executive" | "internship" | null;
  employment_type: "full_time" | "contract" | "part_time" | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  salary_raw: string | null;
  location_city: string | null;
  location_country: string | null;
  source: string;
  source_urls: string[];
  posted_at: string | null;
  scraped_at: string | null;
  skills: string[];
  category: string | null;
  remote_raw: string | null;
}

export interface ScrapedJobDetail extends ScrapedJob {
  description_text: string | null;
  description_html: string | null;
}

export interface ScrapedJobFacets {
  work_types: Record<string, number>;
  experience_levels: Record<string, number>;
  employment_types: Record<string, number>;
  categories: Record<string, number>;
  top_skills: Record<string, number>;
  salary_stats: { min: number | null; max: number | null; avg: number | null };
}

export interface ScrapedJobSearchResponse {
  jobs: ScrapedJob[];
  total: number;
  page: number;
  page_size: number;
  took_ms: number;
  facets: ScrapedJobFacets | null;
}

export interface ScrapedJobSearchState {
  query: string;
  category: string;
  work_types: string[];
  experience_levels: string[];
  employment_types: string[];
  skills: string[];
  salary_min: number | undefined;
  salary_max: number | undefined;
  location_city: string;
  posted_within_days: number | undefined;
  page: number;
}

export const WORK_TYPE_LABELS: Record<string, string> = {
  remote:  "Remote",
  on_site: "On-site",
  hybrid:  "Hybrid",
};

export const EXP_LEVEL_LABELS: Record<string, string> = {
  entry:      "Entry Level",
  mid:        "Mid Level",
  senior:     "Senior",
  lead:       "Lead / Staff",
  executive:  "Executive",
  internship: "Internship",
};

export const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  full_time: "Full-time",
  contract:  "Contract",
  part_time: "Part-time",
};

export const EXPERIENCE_LABELS = EXP_LEVEL_LABELS;
export const EMPLOYMENT_LABELS = EMPLOYMENT_TYPE_LABELS;

// ── AI Resume Analysis ────────────────────────────────────────────────────────

export type FeatureType = 'diagnoser' | 'recruiter' | 'rewriter' | 'hiring_manager';

export interface ValidationError {
  is_valid: false;
  error_code: 'PAGE_LIMIT' | 'NOT_RESUME' | 'UNREADABLE' | 'WRONG_TYPE';
  error_message: string;
  detected_as: string | null;
}

export interface ResumeAnalysisResponse {
  analysis_id: string;
  feature:     FeatureType;
  result:      Record<string, unknown>;
  model_used:  string;
  latency_ms:  number;
  created_at:  string;
}

export interface ResumeAnalysisHistoryItem {
  analysis_id:  string;
  feature:      FeatureType;
  job_position: string;
  company:      string;
  created_at:   string;
}

export interface DiagnoserResult {
  overall_score:    number;
  score_rationale:  string;
  ats_killers:      Array<{ issue: string; detail: string; severity: string }>;
  section_diagnosis: Array<{ section: string; weakest_line: string; why_it_fails: string; one_line_fix: string }>;
  missing_signals:  Array<{ signal: string; source: string; impact: string }>;
  top_fixes:        Array<{ rank: number; fix: string; before: string | null; after: string | null }>;
}

export interface RecruiterResult {
  recruiter_verdict:    string;
  shortlist_likelihood: 'high' | 'medium' | 'low';
  shortlist_rationale:  string;
  top_keywords:         Array<{ keyword: string; type: string; rank: number; resume_status: string }>;
  keyword_gaps:         Array<{ keyword: string; status: string; recommendation: string }>;
  emerging_skills:      Array<{ skill: string; rationale: string }>;
  buzzwords_to_cut:     Array<{ phrase: string; reason: string }>;
  shortlist_action_plan: Array<{ rank: number; action: string; impact: string }>;
}

export interface HiringManagerResult {
  hiring_manager_verdict: string;
  hire_recommendation:    'strong yes' | 'yes' | 'maybe' | 'no' | 'strong no';
  first_impression:       { positives: string[]; negatives: string[] };
  candidate_narrative:    { trajectory: string; narrative_summary: string; positioning_fit: string };
  qualifications_check:   Array<{ requirement: string; status: string; evidence: string | null }>;
  red_flags:              Array<{ flag: string; resume_quote: string; severity: string }>;
  interview_questions:    Array<{ rank: number; question: string; why_asking: string }>;
}

export interface RewriterResult {
  rewritten_experience: Array<{
    company: string;
    original_title: string;
    bullets: Array<{ original: string; rewritten: string; metric_needed: boolean }>;
  }>;
  top_5_rewrites:  Array<{ rank: number; before: string; after: string; why_stronger: string }>;
  keywords_added:  Array<{ keyword: string; inserted_in: string }>;
  metrics_needed:  Array<{ bullet: string; question_to_ask: string }>;
}

// ── Cover Letter ──────────────────────────────────────────────────────────────

export interface CoverLetterResponse {
  cover_letter_id:   string;
  cover_letter_text: string;
  character_count:   number;
  tone_used:         string;
  key_connections:   string[];
  model_used:        string;
  latency_ms:        number;
  created_at:        string;
}

export interface CoverLetterHistoryItem {
  cover_letter_id: string;
  job_position:    string;
  company:         string;
  character_count: number;
  created_at:      string;
}

export interface DefaultWritingStyleResponse {
  writing_style: string;
}

export const JOB_SOURCE_LABELS: Record<string, string> = {
  dice:      "Dice",
  serpapi:   "Google Jobs",
  jsearch:   "JSearch",
  adzuna:    "Adzuna",
  himalayas: "Himalayas",
  remoteok:  "RemoteOK",
  remotive:  "Remotive",
  jobicy:    "Jobicy",
  hn_hiring: "HN Hiring",
};

export const JOB_CATEGORIES = [
  "engineering", "data", "finance", "design",
  "marketing", "sales", "operations", "product", "other",
] as const;

// ── Interview Prep ────────────────────────────────────────────────────────────

export type QuestionCategory = "behavioral" | "situational" | "competency" | "culture_fit";
export type QuestionDifficulty = "warm_up" | "core" | "challenge";
export type ClosingCategory = "role_clarity" | "team_culture" | "growth_impact" | "process_tooling";
export type ShareQuality = "weak" | "adequate" | "strong";

export interface InterviewQuestion {
  id:           number;
  question:     string;
  category:     QuestionCategory;
  target_skill: string;
  difficulty:   QuestionDifficulty;
  hint:         string;
}

export interface ClosingQuestion {
  question: string;
  category: ClosingCategory;
  why_ask:  string;
}

export interface ShareComponentDetail {
  present:  boolean;
  quality:  ShareQuality;
  feedback: string;
}

export interface ShareBreakdown {
  situation:  ShareComponentDetail;
  hindrance:  ShareComponentDetail;
  action:     ShareComponentDetail;
  result:     ShareComponentDetail;
  evaluation: ShareComponentDetail;
}

export interface QuestionSetResponse {
  question_set_id:     string;
  job_position:        string;
  company:             string;
  interview_stage:     string | null;
  questions:           InterviewQuestion[];
  closing_questions:   ClosingQuestion[];
  role_summary:        string | null;
  interview_stage_note: string | null;
  key_themes:          string[];
  research_sources:    string[];
  model_used:          string;
  latency_ms:          number;
  created_at:          string;
}

export interface QuestionSetHistoryItem {
  question_set_id: string;
  job_position:    string;
  company:         string;
  num_questions:   number;
  created_at:      string;
}

export interface AnswerFeedbackResponse {
  answer_id:       string;
  question_text:   string;
  overall_score:   number;
  score_rationale: string;
  strongest_part:  string;
  critical_gap:    string;
  improved_answer: string;
  one_line_tip:    string;
  share_breakdown: ShareBreakdown;
  model_used:      string;
  latency_ms:      number;
  created_at:      string;
}

export interface AnswerHistoryItem {
  answer_id:     string;
  question_text: string;
  overall_score: number | null;
  job_position:  string;
  company:       string;
  created_at:    string;
}

export interface GeneratedAnswerResponse {
  model_answer:         string;
  key_points:           string[];
  personalization_note: string | null;
  latency_ms:           number;
}

export interface InterviewSessionResponse {
  session_id:         string;
  job_position:       string;
  company:            string;
  questions_total:    number;
  questions_answered: number;
  avg_score:          number | null;
  completed_at:       string | null;
  created_at:         string;
}

export interface SessionHistoryItem {
  session_id:         string;
  job_position:       string;
  company:            string;
  questions_total:    number;
  questions_answered: number;
  avg_score:          number | null;
  completed_at:       string | null;
  created_at:         string;
}

// Legacy aliases — kept for backward compatibility with auth-gated dashboard page
export interface ScrapedJobFilters {
  keywords?: string;
  category?: string;
  experience_level?: string;
  work_type?: string;
  employment_type?: string;
  company?: string;
  location_city?: string;
  skills?: string[];
  salary_min?: number;
  posted_within_hours?: number;
  page?: number;
  page_size?: number;
}

export interface ScrapedJobsResponse {
  jobs: ScrapedJob[];
  total: number;
  page: number;
  page_size: number;
  pages?: number;
}
