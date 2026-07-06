/**
 * General user auth — React Query hooks.
 *
 * Session is a httpOnly cookie set by the server. We never read or write the
 * cookie from JS — we just rely on `credentials: "include"` to send it.
 *
 * `useMe()` fetches the current user (or null if not logged in). Components
 * rerun on auth state changes by invalidating this query on login/logout.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { track, identify, reset as resetAnalytics } from "@/lib/analytics"

const API_BASE = import.meta.env?.VITE_API_BASE_URL ?? ""

export interface AuthUser {
  id: number
  username: string
  email: string
  emailVerified: boolean
  avatarId: string
  avatarUrl: string | null
  newsletterOptIn: boolean
  createdAt: string
}

interface MePayload {
  user: AuthUser
}

async function authFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    ...init,
  })
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok) {
    const error = (body.error as string | undefined) ?? "request_failed"
    const reason = (body.reason as string | undefined) ?? undefined
    const e = new Error(error)
    ;(e as Error & { reason?: string }).reason = reason
    throw e
  }
  return body as T
}

function getVoterToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("tmh_voter_token")
}

export function useMe() {
  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: async (): Promise<AuthUser | null> => {
      try {
        const data = await authFetch<MePayload>("/api/auth/me")
        identify(`user:${data.user.id}`, { username: data.user.username })
        // On any authenticated session, ensure this device's anonymous
        // voter_token is linked. No-op if already linked.
        linkVoterTokenIfNeeded()
        return data.user
      } catch {
        return null
      }
    },
    staleTime: 60_000,
  })
}

export interface SignupInput {
  username: string
  email: string
  password: string
  /** Optional — avatar is auto-assigned server-side; no longer chosen at signup. */
  avatarId?: string
  newsletterOptIn?: boolean
}

export function useSignup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: SignupInput): Promise<AuthUser> => {
      track("signup_submitted", {})
      const data = await authFetch<MePayload>("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({ ...input, voterToken: getVoterToken() }),
      })
      track("signup_succeeded", { source: "web" })
      // Server attempts to send the verification email best-effort on signup.
      track("email_verification_sent", { source: "signup" })
      // Auto-enrol in newsletter is opt-out (default true unless user unchecks).
      if (input.newsletterOptIn !== false) {
        track("newsletter_subscribed", { source: "signup", optedIn: true })
      }
      identify(`user:${data.user.id}`, { username: data.user.username })
      return data.user
    },
    onSuccess: (user) => {
      qc.setQueryData(["auth", "me"], user)
      qc.invalidateQueries({ queryKey: ["auth", "me"] })
    },
    onError: (err: Error & { reason?: string }) => {
      track("signup_failed", { reason: err.message, sub: err.reason })
    },
  })
}

export interface LoginInput {
  username: string
  password: string
}

export function useLogin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: LoginInput): Promise<AuthUser> => {
      const data = await authFetch<MePayload>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ ...input, voterToken: getVoterToken() }),
      })
      track("login_succeeded", {})
      identify(`user:${data.user.id}`, { username: data.user.username })
      return data.user
    },
    onSuccess: (user) => {
      qc.setQueryData(["auth", "me"], user)
      qc.invalidateQueries({ queryKey: ["auth", "me"] })
    },
    onError: (err: Error) => {
      track("login_failed", { reason: err.message })
    },
  })
}

export function useLogout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (): Promise<void> => {
      await authFetch<{ ok: true }>("/api/auth/logout", { method: "POST" })
    },
    onSuccess: () => {
      qc.setQueryData(["auth", "me"], null)
      qc.invalidateQueries({ queryKey: ["auth", "me"] })
      resetAnalytics()
    },
  })
}

export interface AvatarOption {
  id: string
  url: string
}

export interface MyStats {
  pollVotes: number
  predictionVotes: number
}

export function useMyStats(enabled: boolean) {
  return useQuery({
    queryKey: ["auth", "me", "stats"],
    queryFn: async (): Promise<MyStats> => {
      return await authFetch<MyStats>("/api/auth/me/stats")
    },
    enabled,
    staleTime: 30_000,
  })
}

export function useAvatars() {
  return useQuery({
    queryKey: ["auth", "avatars"],
    queryFn: async (): Promise<AvatarOption[]> => {
      const data = await authFetch<{ avatars: AvatarOption[] }>("/api/auth/avatars")
      return data.avatars
    },
    staleTime: 24 * 60 * 60 * 1000,
  })
}

export function linkVoterTokenIfNeeded(): void {
  // Fire-and-forget. Used after login on a new device so the device's
  // voter_token gets attached to the account.
  const token = getVoterToken()
  if (!token) return
  fetch(`${API_BASE}/api/auth/link-voter-token`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ voterToken: token }),
  }).catch(() => {})
}
