"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function JobsPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/find-work/jobs");
  }, [router]);
  return null;
}
