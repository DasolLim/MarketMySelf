import type { JobCategory } from "./index";

export type CategorySlug = "technical" | "marketing" | "finance";

export interface CategorySpec {
  slug: CategorySlug;
  apiValue: JobCategory;
  label: string;
  color: string;
  roles: string[];
  seekerHeadline: string;
  recruiterHeadline: string;
  seekerSubhead: string;
  recruiterSubhead: string;
}

export const JOB_CATEGORIES: CategorySpec[] = [
  {
    slug: "technical",
    apiValue: "Technical",
    label: "Technical",
    color: "#22d3ee",
    roles: [
      "Software Engineer",
      "Frontend Developer",
      "Backend Developer",
      "Full Stack Developer",
      "DevOps Engineer",
      "Data Scientist",
      "Machine Learning Engineer",
      "QA Engineer",
      "Mobile Developer",
      "Platform Engineer",
    ],
    seekerHeadline: "Technical jobs",
    recruiterHeadline: "Technical talent",
    seekerSubhead: "Browse open roles in engineering, data, and platform — posted by companies actively hiring.",
    recruiterSubhead: "Browse engineers, developers, and data specialists who are ready to be discovered.",
  },
  {
    slug: "marketing",
    apiValue: "Marketing",
    label: "Marketing",
    color: "#c084fc",
    roles: [
      "Growth Marketer",
      "Content Strategist",
      "SEO Specialist",
      "Performance Marketer",
      "Brand Manager",
      "Social Media Manager",
      "Product Marketer",
      "CRM Manager",
      "Demand Generation",
      "Creative Director",
    ],
    seekerHeadline: "Marketing jobs",
    recruiterHeadline: "Marketing talent",
    seekerSubhead: "Find growth, content, and brand roles where companies are actively looking for marketers like you.",
    recruiterSubhead: "Find growth marketers, content leads, and brand specialists ready to make an impact.",
  },
  {
    slug: "finance",
    apiValue: "Finance",
    label: "Finance",
    color: "#34d399",
    roles: [
      "Financial Analyst",
      "FP&A Manager",
      "Investment Analyst",
      "Accounting Manager",
      "Controller",
      "CFO",
      "Risk Analyst",
      "Compliance Officer",
      "Treasury Analyst",
      "Business Analyst",
    ],
    seekerHeadline: "Finance jobs",
    recruiterHeadline: "Finance talent",
    seekerSubhead: "Browse open positions in finance, accounting, and investment from companies hiring now.",
    recruiterSubhead: "Discover financial analysts, controllers, and business analysts ready for their next role.",
  },
];

export function getCategoryBySlug(slug: string): CategorySpec | undefined {
  return JOB_CATEGORIES.find((c) => c.slug === slug);
}

export const CATEGORY_COLORS: Record<JobCategory, string> = Object.fromEntries(
  JOB_CATEGORIES.map((c) => [c.apiValue, c.color])
) as Record<JobCategory, string>;
