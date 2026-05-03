import { useQuery } from "@tanstack/react-query"

const API_BASE = import.meta.env?.VITE_API_BASE_URL ?? ""

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export interface ApiPrediction {
  id: number
  question: string
  category: string
  categorySlug: string
  resolvesAt: string | null
  yesPercentage: number
  noPercentage: number
  totalCount: number
  momentum: number
  momentumDirection: string
  trendData: number[]
  cardLayout: string
  editorialStatus: string
  isFeatured: boolean
  tags: string[]
  options?: string[]
  optionResults?: Record<string, number>
  createdAt: string
  updatedAt: string
}

export interface ApiPulseTopic {
  id: number
  topicId: string
  tag: string
  tagColor: string
  title: string
  stat: string
  delta: string
  deltaUp: boolean
  blurb: string
  source: string
  sparkData: number[]
  liveConfig: { baseValue: number; annualGrowth: number } | null
  sortOrder: number
  editorialStatus: string
  createdAt: string
  updatedAt: string
}

export interface DesignToken {
  id: number
  tokenType: string
  name: string
  label: string
  value: string
  category: string | null
  sortOrder: number
}

export interface SiteSettings {
  navigation?: {
    links?: Array<{ label: string; href: string; icon?: string; enabled?: boolean }>
    ctaButton?: { label: string; href: string; enabled?: boolean }
  }
  footer?: {
    tagline?: string
    copyright?: string
    links?: Array<{ label: string; href: string }>
    socialLinks?: Array<{ platform: string; icon: string; url: string }>
  }
  shareGate?: {
    enabled?: boolean
    heading?: string
    body?: string
    shareButtonText?: string
    skipText?: string
    emailPlaceholder?: string
  }
  seo?: {
    siteTitle?: string
    siteDescription?: string
    ogImage?: string
  }
  featureToggles?: {
    majlis?: { enabled: boolean }
    voices?: { enabled: boolean }
    shareGate?: { enabled: boolean }
    emailCapture?: { enabled: boolean }
    ipConsent?: { enabled: boolean }
    chatbot?: { enabled: boolean }
  }
}

export function usePredictions(category?: string) {
  return useQuery<{ items: ApiPrediction[]; total: number }>({
    queryKey: ["predictions", category],
    queryFn: () => {
      const params = new URLSearchParams()
      if (category) params.set("category", category)
      params.set("limit", "500")
      const qs = params.toString()
      return fetchJson(`/api/public/predictions${qs ? `?${qs}` : ""}`)
    },
    staleTime: 60_000,
  })
}

export function usePrediction(id: number) {
  return useQuery<ApiPrediction>({
    queryKey: ["prediction", id],
    queryFn: () => fetchJson(`/api/public/predictions/${id}`),
    enabled: id > 0,
    staleTime: 60_000,
  })
}

export function usePulseTopics() {
  return useQuery<{ items: ApiPulseTopic[] }>({
    queryKey: ["pulse-topics"],
    queryFn: () => fetchJson("/api/public/pulse-topics"),
    staleTime: 60_000,
  })
}

export function usePageConfig<T = Record<string, unknown>>(page: string) {
  return useQuery<T>({
    queryKey: ["page-config", page],
    queryFn: () => fetchJson(`/api/public/page-config/${page}`),
    staleTime: 120_000,
    retry: 1,
  })
}

export function useHomepageConfig<T = Record<string, unknown>>() {
  return useQuery<T>({
    queryKey: ["homepage-config"],
    queryFn: () => fetchJson("/api/public/homepage"),
    staleTime: 120_000,
    retry: 1,
  })
}

export function useSiteSettings() {
  return useQuery<SiteSettings>({
    queryKey: ["site-settings"],
    queryFn: () => fetchJson("/api/public/site-settings"),
    staleTime: 300_000,
    retry: 1,
  })
}

export interface LiveCounts {
  debates: number
  predictions: number
  pulseTopics: number
  voices: number
  totalVotes: number
}

export function useLiveCounts() {
  return useQuery<LiveCounts>({
    queryKey: ["live-counts"],
    queryFn: () => fetchJson("/api/public/live-counts"),
    staleTime: 60_000,
    retry: 1,
  })
}

export function useDesignTokens() {
  return useQuery<{ items: DesignToken[] }>({
    queryKey: ["design-tokens"],
    queryFn: () => fetchJson("/api/public/design-tokens"),
    staleTime: 300_000,
    retry: 1,
  })
}

export function getTokenValue(items: DesignToken[] | undefined, name: string, fallback: string): string {
  if (!items) return fallback
  const found = items.find(t => t.name === name)
  return found?.value ?? fallback
}
