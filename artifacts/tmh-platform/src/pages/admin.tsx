import { useState, useEffect } from "react"
import { Link } from "wouter"
import { cn } from "@/lib/utils"
import { CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp, BarChart2, Users, FileText, PlusCircle, ExternalLink } from "lucide-react"
import { usePageTitle } from "@/hooks/use-page-title"

function useAdminKey() {
  const [key, setKey] = useState(() => localStorage.getItem("tmh_admin_key") ?? "")
  const save = (k: string) => { localStorage.setItem("tmh_admin_key", k); setKey(k) }
  return { key, save }
}

function authHeaders(key: string) {
  return { "x-admin-key": key, "Content-Type": "application/json" }
}

type Application = {
  id: number
  name: string
  email: string
  title: string
  company: string
  city: string | null
  country: string | null
  sector: string | null
  bio: string
  linkedin: string
  quote: string | null
  impact: string | null
  aiScore: number | null
  aiStatus: string | null
  aiReasoning: string | null
  editorialStatus: string
  editorNotes: string | null
  createdAt: string
}

type Stats = {
  applications: number
  pendingApplications: number
  subscribers: number
  polls: number
  totalVotes: number
}

function ScoreBadge({ score, status }: { score: number | null; status: string | null }) {
  if (score === null) return null
  const color = status === "passed" ? "bg-green-500" : status === "conditional" ? "bg-yellow-500" : "bg-red-500"
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 text-white font-bold text-[10px] uppercase tracking-widest", color)}>
      {score}/100
    </span>
  )
}

function EditorialBadge({ status }: { status: string }) {
  const map: Record<string, { icon: any; color: string; label: string }> = {
    pending: { icon: Clock, color: "text-yellow-500 border-yellow-500/30 bg-yellow-500/10", label: "Pending" },
    approved: { icon: CheckCircle2, color: "text-green-500 border-green-500/30 bg-green-500/10", label: "Approved" },
    declined: { icon: XCircle, color: "text-red-500 border-red-500/30 bg-red-500/10", label: "Declined" },
    revision: { icon: ChevronUp, color: "text-blue-500 border-blue-500/30 bg-blue-500/10", label: "Revision" },
  }
  const m = map[status] ?? map.pending
  const Icon = m.icon
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 border text-[10px] font-bold uppercase tracking-widest", m.color)}>
      <Icon className="w-3 h-3" />
      {m.label}
    </span>
  )
}

function ApplicationRow({ app, adminKey, onUpdate }: { app: Application; adminKey: string; onUpdate: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const [notes, setNotes] = useState(app.editorNotes ?? "")
  const [saving, setSaving] = useState(false)

  const update = async (status: string) => {
    setSaving(true)
    await fetch(`/api/admin/applications/${app.id}`, {
      method: "PATCH",
      headers: authHeaders(adminKey),
      body: JSON.stringify({ editorialStatus: status, editorNotes: notes }),
    }).catch(() => {})
    setSaving(false)
    onUpdate()
  }

  return (
    <div className="border border-border bg-card">
      <div
        className="flex items-start gap-4 p-4 cursor-pointer hover:bg-secondary/20 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-serif font-black text-base uppercase tracking-tight text-foreground">{app.name}</span>
            <ScoreBadge score={app.aiScore} status={app.aiStatus} />
            <EditorialBadge status={app.editorialStatus} />
          </div>
          <p className="text-[11px] text-muted-foreground font-sans">
            {app.title} @ {app.company}{app.city ? ` · ${app.city}` : ""}{app.country ? `, ${app.country}` : ""}
          </p>
          <p className="text-[10px] text-muted-foreground/60 font-sans mt-0.5">
            {new Date(app.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            {" · "}{app.email}
          </p>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" /> : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />}
      </div>

      {expanded && (
        <div className="border-t border-border p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">Bio</p>
              <p className="text-[12px] font-sans text-foreground leading-relaxed">{app.bio}</p>
            </div>
            <div className="space-y-3">
              {app.impact && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">Impact Statement</p>
                  <p className="text-[12px] font-sans text-foreground leading-relaxed">{app.impact}</p>
                </div>
              )}
              {app.quote && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">Signature Quote</p>
                  <p className="text-[12px] font-serif italic text-foreground">"{app.quote}"</p>
                </div>
              )}
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">LinkedIn</p>
                <a href={app.linkedin} target="_blank" rel="noopener noreferrer" className="text-[12px] text-primary flex items-center gap-1 hover:underline">
                  {app.linkedin} <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>

          {app.aiReasoning && (
            <div className="bg-secondary/30 border border-border p-3">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">AI Reasoning</p>
              <p className="text-[11px] font-sans text-foreground leading-relaxed">{app.aiReasoning}</p>
            </div>
          )}

          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">Editor Notes</p>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add notes for this application…"
              rows={2}
              className="w-full px-3 py-2 bg-background border border-border text-foreground text-xs font-sans focus:outline-none focus:border-primary resize-none"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => update("approved")}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white font-bold text-[10px] uppercase tracking-widest hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <CheckCircle2 className="w-3 h-3" /> Approve
            </button>
            <button
              onClick={() => update("declined")}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white font-bold text-[10px] uppercase tracking-widest hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              <XCircle className="w-3 h-3" /> Decline
            </button>
            <button
              onClick={() => update("revision")}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white font-bold text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              Request Revision
            </button>
            <button
              onClick={() => update("pending")}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 border border-border text-foreground font-bold text-[10px] uppercase tracking-widest hover:bg-secondary transition-colors disabled:opacity-50"
            >
              Reset to Pending
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function CreatePollForm({ adminKey, onCreated }: { adminKey: string; onCreated: () => void }) {
  const [question, setQuestion] = useState("")
  const [category, setCategory] = useState("")
  const [options, setOptions] = useState(["", "", "", ""])
  const [context, setContext] = useState("")
  const [isFeatured, setIsFeatured] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const opts = options.filter(o => o.trim())
    if (opts.length < 2) return
    setSaving(true)
    const resp = await fetch("/api/admin/polls", {
      method: "POST",
      headers: authHeaders(adminKey),
      body: JSON.stringify({ question, category, options: opts, context: context || null, isFeatured }),
    }).catch(() => null)
    setSaving(false)
    if (resp?.ok) {
      setSuccess(true)
      setQuestion(""); setCategory(""); setOptions(["", "", "", ""]); setContext(""); setIsFeatured(false)
      setTimeout(() => setSuccess(false), 3000)
      onCreated()
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold block mb-1">Question *</label>
        <input
          required value={question} onChange={e => setQuestion(e.target.value)}
          placeholder="Your job will still exist in 5 years. Be honest."
          className="w-full px-3 py-2.5 bg-background border border-border text-foreground text-sm font-sans focus:outline-none focus:border-primary"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold block mb-1">Category *</label>
          <input
            required value={category} onChange={e => setCategory(e.target.value)}
            placeholder="Technology & AI"
            className="w-full px-3 py-2.5 bg-background border border-border text-foreground text-sm font-sans focus:outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold block mb-1">Context (optional)</label>
          <input
            value={context} onChange={e => setContext(e.target.value)}
            placeholder="One-line editorial framing"
            className="w-full px-3 py-2.5 bg-background border border-border text-foreground text-sm font-sans focus:outline-none focus:border-primary"
          />
        </div>
      </div>
      <div>
        <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold block mb-2">Answer Options (min 2) *</label>
        <div className="space-y-2">
          {options.map((opt, i) => (
            <input
              key={i} value={opt} onChange={e => { const n = [...options]; n[i] = e.target.value; setOptions(n) }}
              placeholder={`Option ${i + 1}`}
              className="w-full px-3 py-2 bg-background border border-border text-foreground text-sm font-sans focus:outline-none focus:border-primary"
            />
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <input
          type="checkbox" id="featured" checked={isFeatured} onChange={e => setIsFeatured(e.target.checked)}
          className="w-4 h-4 accent-primary"
        />
        <label htmlFor="featured" className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground cursor-pointer">
          Set as Featured (Hero) Poll
        </label>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit" disabled={saving}
          className="px-6 py-2.5 bg-primary text-white font-black uppercase tracking-[0.15em] text-[11px] hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {saving ? "Publishing…" : "Publish Debate"}
        </button>
        {success && <span className="text-green-500 font-bold text-[11px] uppercase tracking-widest">Poll published!</span>}
      </div>
    </form>
  )
}

export default function Admin() {
  usePageTitle("Admin") // No SEO needed for admin page
  const { key, save } = useAdminKey()
  const [inputKey, setInputKey] = useState("")
  const [authed, setAuthed] = useState(false)
  const [tab, setTab] = useState<"applications" | "create-poll" | "stats">("applications")
  const [applications, setApplications] = useState<Application[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [filter, setFilter] = useState<"all" | "pending" | "passed" | "conditional" | "not_yet">("all")
  const [loading, setLoading] = useState(false)

  const login = async (e: React.FormEvent) => {
    e.preventDefault()
    const resp = await fetch("/api/admin/stats", { headers: authHeaders(inputKey) }).catch(() => null)
    if (resp?.ok) { save(inputKey); setAuthed(true) }
    else alert("Wrong admin key")
  }

  const loadData = async (k: string) => {
    setLoading(true)
    const [appsResp, statsResp] = await Promise.all([
      fetch("/api/admin/applications", { headers: authHeaders(k) }).catch(() => null),
      fetch("/api/admin/stats", { headers: authHeaders(k) }).catch(() => null),
    ])
    if (appsResp?.ok) setApplications(await appsResp.json().then(d => d.applications ?? []))
    if (statsResp?.ok) setStats(await statsResp.json())
    setLoading(false)
  }

  useEffect(() => {
    if (key) {
      fetch("/api/admin/stats", { headers: authHeaders(key) }).then(r => {
        if (r.ok) { setAuthed(true); loadData(key) }
      }).catch(() => {})
    }
  }, [])

  if (!authed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="font-display font-black text-4xl uppercase text-foreground">
              TMH<span className="text-primary">.</span>
            </h1>
            <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mt-1 font-serif">Admin Access</p>
          </div>
          <form onSubmit={login} className="space-y-4">
            <input
              type="password"
              required
              autoFocus
              value={inputKey}
              onChange={e => setInputKey(e.target.value)}
              placeholder="Admin key"
              className="w-full px-4 py-3 bg-background border-2 border-border text-foreground text-sm font-sans focus:outline-none focus:border-primary"
            />
            <button
              type="submit"
              className="w-full px-4 py-3 bg-foreground text-background font-black uppercase tracking-[0.2em] text-[11px] hover:bg-primary transition-colors"
            >
              Enter
            </button>
          </form>
        </div>
      </div>
    )
  }

  const filtered = applications.filter(a => {
    if (filter === "all") return true
    if (filter === "pending") return a.editorialStatus === "pending"
    return a.aiStatus === filter
  })

  const tabs = [
    { id: "applications", label: "Applications", icon: FileText },
    { id: "create-poll", label: "Create Debate", icon: PlusCircle },
    { id: "stats", label: "Stats", icon: BarChart2 },
  ] as const

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="bg-foreground text-background px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/">
            <span className="font-display font-black text-2xl uppercase tracking-tight cursor-pointer">
              TMH<span className="text-primary">.</span>
            </span>
          </Link>
          <span className="text-[10px] uppercase tracking-[0.3em] text-background/70 font-serif hidden sm:block">Admin</span>
        </div>
        {stats && (
          <div className="flex items-center gap-6">
            <div className="text-center hidden sm:block">
              <div className="font-black text-lg text-primary leading-none">{stats.pendingApplications}</div>
              <div className="text-[9px] uppercase tracking-widest text-background/70 font-serif">Pending</div>
            </div>
            <div className="text-center hidden sm:block">
              <div className="font-black text-lg text-background leading-none">{stats.totalVotes?.toLocaleString()}</div>
              <div className="text-[9px] uppercase tracking-widest text-background/70 font-serif">Total Votes</div>
            </div>
            <div className="text-center hidden sm:block">
              <div className="font-black text-lg text-background leading-none">{stats.subscribers}</div>
              <div className="text-[9px] uppercase tracking-widest text-background/70 font-serif">Subscribers</div>
            </div>
          </div>
        )}
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-1 mb-8 border-b border-border">
          {tabs.map(t => {
            const Icon = t.icon
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex items-center gap-2 px-5 py-3 text-[11px] font-bold uppercase tracking-widest border-b-2 -mb-px transition-colors",
                  tab === t.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            )
          })}
        </div>

        {/* Applications tab */}
        {tab === "applications" && (
          <div>
            <div className="flex items-center gap-2 mb-6 flex-wrap">
              {(["all", "pending", "passed", "conditional", "not_yet"] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest border transition-colors",
                    filter === f ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:border-foreground"
                  )}
                >
                  {f === "not_yet" ? "Not Yet" : f}
                  {f === "all" ? ` (${applications.length})` : ` (${applications.filter(a => f === "pending" ? a.editorialStatus === "pending" : a.aiStatus === f).length})`}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-20 bg-secondary animate-pulse border border-border" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground font-sans text-sm">
                No applications yet.
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map(app => (
                  <ApplicationRow key={app.id} app={app} adminKey={key} onUpdate={() => loadData(key)} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Create Poll tab */}
        {tab === "create-poll" && (
          <div className="max-w-2xl">
            <div className="mb-6">
              <h2 className="font-serif font-black uppercase text-xl text-foreground tracking-tight">Publish a New Poll</h2>
              <p className="text-muted-foreground text-sm font-sans mt-1">Goes live immediately. Toggle Featured to make it the homepage hero.</p>
            </div>
            <CreatePollForm adminKey={key} onCreated={() => loadData(key)} />
          </div>
        )}

        {/* Stats tab */}
        {tab === "stats" && stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: "Total Applications", value: stats.applications },
              { label: "Pending Review", value: stats.pendingApplications },
              { label: "Subscribers", value: stats.subscribers },
              { label: "Live Debates", value: stats.polls },
              { label: "Total Votes", value: stats.totalVotes?.toLocaleString() },
            ].map(s => (
              <div key={s.label} className="border border-border bg-card p-6">
                <div className="font-black text-4xl font-serif text-foreground leading-none mb-2">{s.value}</div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-serif">{s.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
