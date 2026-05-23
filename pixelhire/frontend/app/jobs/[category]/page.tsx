"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Mapping from old recruiter-category slugs to scraped-job category values
const SLUG_TO_CATEGORY: Record<string, string> = {
  technical:  "engineering",
  marketing:  "marketing",
  finance:    "finance",
};

export default function JobCategoryRedirect({ params }: { params: { category: string } }) {
  const router = useRouter();
  useEffect(() => {
    const cat = SLUG_TO_CATEGORY[params.category] ?? params.category;
    router.replace(`/find-work/jobs?category=${cat}`);
  }, [params.category, router]);
  return null;
}
