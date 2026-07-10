export function formatSalary(
  min: number | null | undefined,
  max: number | null | undefined,
  currency: string | null | undefined,
): string {
  if (!min && !max) return "Salary not listed"
  const fmt = (n: number) => `$${Math.round(n / 1000)}k`
  if (min && max) return `${fmt(min)} – ${fmt(max)}`
  if (min) return `${fmt(min)}+`
  return `Up to ${fmt(max!)}`
}

export function formatRelativeDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "Unknown date"
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / 86_400_000)
  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export function formatSource(source: string): string {
  const labels: Record<string, string> = {
    dice:      "Dice",
    serpapi:   "Google Jobs",
    jsearch:   "JSearch",
    adzuna:    "Adzuna",
    himalayas: "Himalayas",
    remoteok:  "RemoteOK",
    remotive:  "Remotive",
    jobicy:    "Jobicy",
    hn_hiring: "HN Hiring",
  }
  return labels[source] ?? source
}
