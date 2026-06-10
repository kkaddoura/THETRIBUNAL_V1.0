/**
 * Public user profile at /profile/:username — the hybrid-visibility surface.
 *
 * Shows: avatar, username, join date, total vote count. Does NOT expose
 * which polls the user voted on. Per the plan's hybrid visibility decision.
 */

import { useEffect, useState } from "react"
import { Layout } from "@/components/layout/Layout"
import { useRoute, Link } from "wouter"
import { ArrowLeft, AlertCircle } from "lucide-react"
import { usePageTitle } from "@/hooks/use-page-title"

const API_BASE = import.meta.env?.VITE_API_BASE_URL ?? ""

interface PublicUser {
  username: string
  avatarId: string
  avatarUrl: string | null
  joinedAt: string
  totalVotes: number
}

export default function ProfilePublic() {
  const [, params] = useRoute("/profile/:username")
  const username = params?.username
  usePageTitle(username ? { title: `@${username} — The Tribunal` } : { title: "Profile" })

  const [user, setUser] = useState<PublicUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!username) return
    setLoading(true)
    setError(false)
    fetch(`${API_BASE}/api/users/${encodeURIComponent(username)}/public`)
      .then(async (r) => {
        if (!r.ok) throw new Error("not_found")
        return r.json()
      })
      .then((data: { user: PublicUser }) => setUser(data.user))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [username])

  if (loading) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto px-4 py-16">
          <div className="h-6 w-32 bg-secondary animate-pulse mb-4" />
          <div className="h-32 bg-secondary animate-pulse" />
        </div>
      </Layout>
    )
  }

  if (error || !user) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto px-4 py-24 text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-primary mb-6" />
          <h1 className="text-3xl font-serif font-black uppercase tracking-tight mb-3">
            User not found
          </h1>
          <Link href="/" className="text-primary hover:underline text-xs uppercase tracking-widest font-bold">
            Back home
          </Link>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link href="/" className="inline-flex items-center gap-2 text-[12px] uppercase tracking-widest text-muted-foreground hover:text-foreground font-bold mb-8 transition-colors">
          <ArrowLeft className="w-3 h-3" /> Back
        </Link>

        <div className="bg-card border border-border p-8 md:p-12 flex flex-col md:flex-row items-start gap-8">
          <div className="flex-1">
            <h1 className="text-4xl md:text-5xl font-serif font-black uppercase tracking-tight">
              @{user.username}<span className="text-primary">.</span>
            </h1>
            <p className="text-xs uppercase tracking-widest font-bold text-muted-foreground mt-3">
              Joined {new Date(user.joinedAt).toLocaleDateString(undefined, { year: "numeric", month: "short" })}
            </p>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md">
              <div className="border border-border bg-background px-4 py-3">
                <p className="text-[12px] uppercase tracking-widest font-bold text-muted-foreground">Total votes</p>
                <p className="text-2xl font-serif font-black mt-1">{user.totalVotes.toLocaleString()}</p>
              </div>
              <div className="border border-border bg-background px-4 py-3">
                <p className="text-[12px] uppercase tracking-widest font-bold text-muted-foreground">On record since</p>
                <p className="text-sm font-serif font-bold mt-1">
                  {new Date(user.joinedAt).getFullYear()}
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground mt-8 leading-relaxed max-w-md">
              On The Tribunal, individual votes stay private. The public profile only shows totals.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  )
}
