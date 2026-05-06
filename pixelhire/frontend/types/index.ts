export type JobCategory = "Technical" | "Marketing" | "Finance";

export type PaymentStatus = "pending" | "succeeded" | "failed" | "refunded";

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

export interface SectionUpdatePayload {
  full_name?: string;
  job_title?: string;
  bio?: string;
  portfolio_url?: string;
  job_category?: JobCategory;
  skills?: string[];
  is_published?: boolean;
}

// Grid constants
export const GRID_ROWS = 10;
export const GRID_COLS = 10;
export const TOTAL_SECTIONS = GRID_ROWS * GRID_COLS; // 100

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
  Finance:   "bg-emerald-500",
};
