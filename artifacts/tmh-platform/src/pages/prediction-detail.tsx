import { useState } from "react"
import { useRoute, Link } from "wouter"
import { Layout } from "@/components/layout/Layout"
import { ShareModal } from "@/components/ShareModal"
import type { PredictionShareContext } from "@/lib/share"
import { ResultsTabsView, EmptyStateCard } from "@/components/poll/ResultsTabsView"
import { ArrowLeft, AlertCircle, ArrowRight, Share2, TrendingUp, TrendingDown, Calendar, Users, Info } from "lucide-react"
import { usePageTitle } from "@/hooks/use-page-title"
import { Skeleton } from "@/components/ui/skeleton"
import { LoadingDots } from "@/components/ui/loading-dots"
import { usePrediction, usePredictions, type ApiPrediction } from "@/hooks/use-cms-data"
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  LineChart,
} from "recharts"

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const OPTION_COLORS = ["#10B981", "#3B82F6", "#F59E0B", "#DC143C", "#8B5CF6", "#EC4899"]

function formatResolvesText(resolves: string | null): string {
  if (!resolves || resolves === "TBD") return "Resolves: TBD"
  const date = new Date(resolves)
  if (isNaN(date.getTime())) return `Resolves: ${resolves}`
  const now = new Date()
  if (date <= now) return "Resolved"
  const diffMs = date.getTime() - now.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays < 30) return `Ends in ${diffDays}d`
  const diffMonths = Math.round(diffDays / 30)
  if (diffMonths < 12) return `Ends in ${diffMonths}mo`
  const years = Math.floor(diffMonths / 12)
  const remainingMonths = diffMonths % 12
  if (remainingMonths === 0) return `Ends in ${years}y`
  return `Ends in ${years}y ${remainingMonths}mo`
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col lg:flex-row gap-10">
      <div className="flex-1 space-y-8">
        <div className="border border-border bg-card p-8 space-y-4">
          <div className="flex gap-3">
            <Skeleton className="h-5 w-24 bg-foreground/10" />
            <Skeleton className="h-5 w-32 bg-foreground/10" />
          </div>
          <Skeleton className="h-10 w-full bg-foreground/10" />
          <Skeleton className="h-10 w-3/4 bg-foreground/10" />
          <Skeleton className="h-64 w-full bg-foreground/10 mt-6" />
          <div className="flex gap-4 pt-6">
            <Skeleton className="h-14 w-full bg-foreground/10" />
            <Skeleton className="h-14 w-full bg-foreground/10" />
          </div>
        </div>
      </div>
      <div className="lg:w-80 space-y-6">
        <Skeleton className="h-5 w-32 bg-foreground/10" />
        {[1, 2, 3].map(i => (
          <div key={i} className="border border-border bg-card p-5 space-y-3">
            <Skeleton className="h-3 w-16 bg-foreground/10" />
            <Skeleton className="h-5 w-full bg-foreground/10" />
            <Skeleton className="h-3 w-20 bg-foreground/10" />
          </div>
        ))}
      </div>
    </div>
  )
}

function ConfidenceTooltip({ active, payload, label, chartData }: any) {
  if (!active || !payload?.length) return null
  const current = payload.find((p: any) => p.dataKey === "yes")?.value ?? 0
  const idx = chartData.findIndex((d: any) => d.month === label)
  const prev = idx > 0 ? chartData[idx - 1].yes : null
  const diff = prev != null ? current - prev : null

  return (
    <div style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 6, padding: "8px 12px", fontSize: 13, boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>
      <div style={{ color: "hsl(var(--foreground))", fontWeight: 700, marginBottom: 4 }}>{label}</div>
      <div style={{ color: "hsl(var(--foreground))" }}>Now: <strong>{current}%</strong></div>
      {prev != null && (
        <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 11, marginTop: 2 }}>
          Prev month: {prev}%
          {diff !== null && diff !== 0 && (
            <span style={{ color: diff > 0 ? "#10B981" : "#DC143C", fontWeight: 600, marginLeft: 4 }}>
              {diff > 0 ? "+" : ""}{diff}%
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function ConfidenceChart({ data, momentum, up }: { data: number[]; momentum: number; up: boolean }) {
  const lineColor = up ? "#10B981" : "#DC143C"
  const maColor = "#C8A864"

  const chartData = data.map((yes, i) => {
    const monthIdx = (new Date().getMonth() - data.length + 1 + i + 12) % 12
    return {
      month: MONTHS[monthIdx],
      yes,
      ma: i >= 2 ? Math.round((data[i] + data[i - 1] + data[i - 2]) / 3) : yes,
    }
  })

  return (
    <div className="border border-border bg-card p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="h-px w-8 bg-primary mb-3" />
          <h3 className="font-serif font-black uppercase text-lg tracking-wider">Confidence Trend</h3>
        </div>
        <div className="flex items-center gap-2 text-sm">
          {up ? <TrendingUp className="w-4 h-4 text-emerald-500" /> : <TrendingDown className="w-4 h-4 text-red-500" />}
          <span className={`font-bold ${up ? "text-emerald-500" : "text-red-500"}`}>
            {up ? "+" : "-"}{Math.abs(momentum).toFixed(1)}%
          </span>
          <span className="text-muted-foreground text-xs">30d</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="predGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lineColor} stopOpacity={0.2} />
              <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
          <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
          <ReferenceLine y={50} stroke="hsl(var(--border))" strokeDasharray="4 4" />
          <Tooltip content={<ConfidenceTooltip chartData={chartData} />} cursor={{ stroke: "hsl(var(--muted-foreground))", strokeWidth: 1, strokeDasharray: "3 3" }} />
          <Area type="monotone" dataKey="yes" fill="url(#predGrad)" stroke="none" />
          <Line type="monotone" dataKey="yes" stroke={lineColor} strokeWidth={2.5} dot={false} />
          <Line type="monotone" dataKey="ma" stroke={maColor} strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-5 mt-4 pt-4 border-t border-border">
        <div className="flex items-center gap-2">
          <div className="w-5 h-0.5 rounded-full" style={{ background: lineColor }} />
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Yes Confidence</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-0 border-t-2 border-dashed" style={{ borderColor: maColor }} />
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">3-Month Avg</span>
        </div>
      </div>
    </div>
  )
}

function VoteSection({ prediction, onVoteUpdate }: { prediction: ApiPrediction; onVoteUpdate: (choice: string) => void }) {
  const storageKey = `tmh_pred_${prediction.id}`
  const [voted, setVoted] = useState<string | null>(() =>
    typeof window !== "undefined" ? localStorage.getItem(storageKey) : null
  )
  const [localYes, setLocalYes] = useState(prediction.yesPercentage)
  const [localNo, setLocalNo] = useState(prediction.noPercentage)
  const [localTotal, setLocalTotal] = useState(prediction.totalCount)
  const [localOptionResults, setLocalOptionResults] = useState(prediction.optionResults ?? {})

  const options = prediction.options?.length ? prediction.options : ["yes", "no"]
  const isLegacy = !prediction.options?.length

  const submitVote = (choice: string) => {
    const previousVote = voted
    const prevYes = localYes
    const prevNo = localNo
    const prevTotal = localTotal
    const prevOptionResults = { ...localOptionResults }
    const isNewVote = !voted
    setVoted(choice)
    localStorage.setItem(storageKey, choice)

    // Optimistic: estimate new percentages using combined total
    if (isNewVote) {
      const newTotal = localTotal + 1
      setLocalTotal(newTotal)
      if (isLegacy) {
        const yesVotes = Math.round((localYes / 100) * localTotal)
        const newYesVotes = choice === "yes" ? yesVotes + 1 : yesVotes
        const newYes = Math.max(1, Math.min(99, Math.round((newYesVotes / newTotal) * 100)))
        setLocalYes(newYes)
        setLocalNo(100 - newYes)
      } else {
        const newResults: Record<string, number> = {}
        const counts: Record<string, number> = {}
        for (const opt of options) {
          counts[opt] = Math.round(((localOptionResults[opt] ?? 0) / 100) * localTotal)
        }
        counts[choice] = (counts[choice] ?? 0) + 1
        for (const opt of options) {
          newResults[opt] = Math.round(((counts[opt] ?? 0) / newTotal) * 100)
        }
        setLocalOptionResults(newResults)
      }
    }

    onVoteUpdate(choice)
    let token = localStorage.getItem("tmh_voter_token")
    if (!token) { token = crypto.randomUUID(); localStorage.setItem("tmh_voter_token", token) }
    fetch(`/api/predictions/${prediction.id}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ choice, voterToken: token }),
    })
      .then(r => {
        if (!r.ok) throw new Error("Vote failed")
        return r.json()
      })
      .then(data => {
        if (data.yesPercentage != null) setLocalYes(data.yesPercentage)
        if (data.noPercentage != null) setLocalNo(data.noPercentage)
        if (data.totalCount != null) setLocalTotal(data.totalCount)
        if (data.optionResults) setLocalOptionResults(data.optionResults)
      })
      .catch(() => {
        // Revert optimistic state
        setVoted(previousVote)
        setLocalYes(prevYes)
        setLocalNo(prevNo)
        setLocalTotal(prevTotal)
        setLocalOptionResults(prevOptionResults)
        if (previousVote) localStorage.setItem(storageKey, previousVote)
        else localStorage.removeItem(storageKey)
      })
  }

  // Click option → instant vote. Click different option → instant change.
  // Click same option → no-op.
  const handleVote = (choice: string) => {
    if (voted === choice) return
    submitVote(choice)
  }

  const resultsPanel = (
    <>
      {/* Confidence bars */}
      <div className="space-y-3 mb-6">
        {isLegacy ? (
          <>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-bold uppercase tracking-wider">Yes</span>
                <span className="text-emerald-500 font-bold">{localYes}%</span>
              </div>
              <div className="h-3 bg-foreground/5 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${localYes}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-bold uppercase tracking-wider">No</span>
                <span className="text-red-500 font-bold">{localNo}%</span>
              </div>
              <div className="h-3 bg-foreground/5 rounded-full overflow-hidden">
                <div className="h-full bg-red-500 rounded-full transition-all duration-1000" style={{ width: `${localNo}%` }} />
              </div>
            </div>
          </>
        ) : (
          options.map((opt, i) => {
            const pct = localOptionResults[opt] ?? 0
            const color = OPTION_COLORS[i % OPTION_COLORS.length]
            return (
              <div key={opt}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-bold uppercase tracking-wider">{opt}</span>
                  <span style={{ color }} className="font-bold">{pct}%</span>
                </div>
                <div className="h-3 bg-foreground/5 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${pct}%`, background: color }} />
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Vote buttons */}
      <div className="space-y-2">
        {isLegacy ? (
          <div className="flex gap-3">
            {(["yes", "no"] as const).map(choice => {
              const color = choice === "yes" ? "#10B981" : "#DC143C"
              const isSelected = voted === choice
              return (
                <button
                  key={choice}
                  onClick={() => handleVote(choice)}
                  className="flex-1 h-14 font-bold uppercase tracking-widest text-sm transition-all duration-150 rounded cursor-pointer"
                  style={{
                    border: `2px solid ${color}`,
                    background: isSelected ? color : "transparent",
                    color: isSelected ? "#fff" : color,
                  }}
                >
                  {isSelected ? `✓ ${choice.toUpperCase()}` : choice.toUpperCase()}
                </button>
              )
            })}
          </div>
        ) : (
          options.map((opt, i) => {
            const color = OPTION_COLORS[i % OPTION_COLORS.length]
            const isSelected = voted === opt
            return (
              <button
                key={opt}
                onClick={() => handleVote(opt)}
                className="w-full py-3 px-4 font-semibold text-sm text-left transition-all duration-150 rounded cursor-pointer"
                style={{
                  border: `2px solid ${color}`,
                  background: isSelected ? color : "transparent",
                  color: isSelected ? "#fff" : color,
                }}
              >
                {isSelected ? `✓ ${opt}` : opt}
              </button>
            )
          })
        )}
      </div>

      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border text-xs text-muted-foreground">
        <Users className="w-3.5 h-3.5" />
        <span>{localTotal.toLocaleString()} votes cast</span>
      </div>
    </>
  )

  return (
    <div className="border border-border bg-card p-6 md:p-8">

      <ResultsTabsView
        resultsView={resultsPanel}
        countryView={
          <EmptyStateCard
            title="Still Gathering Data"
            message="We don't have enough votes from different countries yet to show a breakdown for this prediction. Come back later."
          />
        }
        timelineView={
          <EmptyStateCard
            title="Still Gathering Data"
            message="We need more votes over time before we can show how confidence has shifted. Come back later."
          />
        }
      />
    </div>
  )
}

export default function PredictionDetail() {
  const [, params] = useRoute("/predictions/:id")
  const id = params?.id ? parseInt(params.id) : 0
  const [shareOpen, setShareOpen] = useState(false)

  const { data: prediction, isLoading, error } = usePrediction(id)
  const { data: relatedData } = usePredictions(prediction?.category)
  const { data: allData } = usePredictions()

  usePageTitle(prediction ? {
    title: prediction.question,
    description: `${prediction.yesPercentage}% say yes. ${prediction.totalCount.toLocaleString()} votes. Resolves ${prediction.resolvesAt ?? "TBD"}.`,
  } : { title: "Prediction" })

  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 lg:py-16">
          <Skeleton className="h-4 w-36 mb-8 bg-foreground/10" />
          <DetailSkeleton />
          <div className="flex justify-center py-6">
            <LoadingDots text="Loading prediction" />
          </div>
        </div>
      </Layout>
    )
  }

  if (error || !prediction) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 py-24 text-center">
          <AlertCircle className="w-16 h-16 text-primary mx-auto mb-6" />
          <h1 className="text-4xl font-serif font-black uppercase tracking-tight mb-4">Prediction not found</h1>
          <p className="text-muted-foreground mb-8">This prediction might have been removed or the link is invalid.</p>
          <Link href="/predictions" className="bg-foreground text-background px-6 py-3 font-bold text-xs uppercase tracking-widest hover:bg-primary transition-colors">
            Back to Predictions
          </Link>
        </div>
      </Layout>
    )
  }

  const related = (relatedData?.items ?? []).filter(p => p.id !== prediction.id).slice(0, 5)
  // Cross-category picks for "People also voted on" — mix of popular from other categories
  const alsoVotedOn = (allData?.items ?? [])
    .filter(p => p.id !== prediction.id && p.category !== prediction.category)
    .sort((a, b) => b.totalCount - a.totalCount)
    .slice(0, 5)
  // If not enough cross-category, fill with same-category
  const bottomCards = alsoVotedOn.length >= 4
    ? alsoVotedOn
    : [...alsoVotedOn, ...(relatedData?.items ?? []).filter(p => p.id !== prediction.id && !alsoVotedOn.some(a => a.id === p.id))].slice(0, 5)
  const shareUrl = `${window.location.origin}/predictions/${prediction.id}`
  const shareTitle = prediction.question

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 lg:py-16">
        <Link href="/predictions" className="inline-flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground font-bold mb-8 transition-colors">
          <ArrowLeft className="w-3 h-3" /> Back to All Predictions
        </Link>

        <div className="flex flex-col lg:flex-row gap-10">
          {/* Main content */}
          <div className="flex-1 min-w-0 space-y-8">
            {/* Header card */}
            <div className="border border-border bg-card p-8 md:p-10">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <span className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 bg-primary/10 text-primary border border-primary/20">
                  {prediction.category}
                </span>
                <span className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatResolvesText(prediction.resolvesAt)}
                </span>
                {prediction.tags?.length > 0 && prediction.tags.map(tag => (
                  <span key={tag} className="text-[9px] uppercase tracking-widest px-2 py-0.5 border border-border text-muted-foreground font-bold">
                    #{tag}
                  </span>
                ))}
              </div>

              <h1 className="font-serif font-black uppercase text-2xl md:text-3xl lg:text-4xl tracking-tight leading-tight mb-6">
                {prediction.question}
              </h1>

              <div className="flex items-center gap-6 pt-4 border-t border-border">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-bold">{prediction.totalCount.toLocaleString()}</span>
                  <span className="text-xs text-muted-foreground">votes</span>
                </div>
                <div className="flex items-center gap-2">
                  {prediction.momentumDirection === "up"
                    ? <TrendingUp className="w-4 h-4 text-emerald-500" />
                    : <TrendingDown className="w-4 h-4 text-red-500" />}
                  <span className={`text-sm font-bold ${prediction.momentumDirection === "up" ? "text-emerald-500" : "text-red-500"}`}>
                    {prediction.momentumDirection === "up" ? "+" : "-"}{Math.abs(prediction.momentum).toFixed(1)}%
                  </span>
                  <span className="text-xs text-muted-foreground">30d momentum</span>
                </div>
                <button onClick={() => setShareOpen(true)} className="ml-auto flex items-center gap-2 text-xs uppercase tracking-widest font-bold text-muted-foreground hover:text-primary transition-colors cursor-pointer">
                  <Share2 className="w-4 h-4" /> Share
                </button>
              </div>
            </div>

            {/* Confidence chart */}
            {prediction.trendData?.length > 0 && (
              <ConfidenceChart
                data={prediction.trendData}
                momentum={prediction.momentum}
                up={prediction.momentumDirection === "up"}
              />
            )}

            {/* Vote section */}
            <VoteSection prediction={prediction} onVoteUpdate={() => {}} />

            {/* People also voted on */}
            {bottomCards.length > 0 && (
              <div className="mt-4">
                <div className="border-l-4 border-primary pl-4 mb-6">
                  <h3 className="font-serif font-black uppercase text-2xl tracking-tight">People Also Voted On</h3>
                  <p className="text-[11px] uppercase tracking-widest text-muted-foreground mt-1">Popular predictions across categories</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {bottomCards.map(card => (
                    <Link
                      key={card.id}
                      href={`/predictions/${card.id}`}
                      className="group border border-border bg-card hover:border-primary/40 transition-all duration-200 p-6 flex flex-col"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 bg-primary/10 text-primary border border-primary/20">
                          {card.category}
                        </span>
                        <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold ml-auto">
                          Resolves {card.resolvesAt ?? "TBD"}
                        </span>
                      </div>
                      <h4 className="font-serif font-black uppercase text-sm tracking-tight leading-snug line-clamp-3 group-hover:text-primary transition-colors mb-4 flex-1">
                        {card.question}
                      </h4>
                      <div className="space-y-2 mb-3">
                        <div>
                          <div className="flex justify-between text-[10px] mb-0.5">
                            <span className="font-bold uppercase">Yes</span>
                            <span className="text-emerald-500 font-bold">{card.yesPercentage}%</span>
                          </div>
                          <div className="h-1.5 bg-foreground/5 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${card.yesPercentage}%` }} />
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-[10px] mb-0.5">
                            <span className="font-bold uppercase">No</span>
                            <span className="text-red-500 font-bold">{card.noPercentage}%</span>
                          </div>
                          <div className="h-1.5 bg-foreground/5 rounded-full overflow-hidden">
                            <div className="h-full bg-red-500 rounded-full" style={{ width: `${card.noPercentage}%` }} />
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-border">
                        <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">
                          {card.totalCount.toLocaleString()} votes
                        </span>
                        <span className="text-[9px] uppercase tracking-widest text-primary font-bold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          Vote <ArrowRight className="w-2.5 h-2.5" />
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right sidebar */}
          <div className="lg:w-80 flex-shrink-0 lg:sticky lg:top-24 lg:self-start space-y-6">
            {related.length > 0 && (
              <>
                <div className="border-l-4 border-primary pl-3">
                  <p className="text-[10px] uppercase tracking-[0.25em] font-bold text-muted-foreground">Related in</p>
                  <h4 className="font-serif font-black uppercase text-lg tracking-tight">{prediction.category}</h4>
                </div>

                <div className="space-y-4">
                  {related.map(r => (
                    <Link
                      key={r.id}
                      href={`/predictions/${r.id}`}
                      className="group block border border-border bg-card hover:border-primary/40 transition-all duration-200 p-5"
                    >
                      <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-muted-foreground">
                        {r.category}
                      </span>
                      <h5 className="font-serif font-black uppercase text-sm tracking-tight mt-1.5 leading-snug line-clamp-3 group-hover:text-primary transition-colors">
                        {r.question}
                      </h5>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                        <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">
                          {r.totalCount.toLocaleString()} votes
                        </span>
                        <span className="text-[9px] uppercase tracking-widest text-primary font-bold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          View <ArrowRight className="w-2.5 h-2.5" />
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {shareOpen && (() => {
        const shareContext: PredictionShareContext = {
          contentType: "prediction",
          predictionId: prediction.id,
          url: shareUrl,
          title: shareTitle,
          category: prediction.category,
          totalVotes: prediction.totalCount,
          votedChoice: typeof window !== "undefined" ? localStorage.getItem(`tmh_pred_${prediction.id}`) ?? undefined : undefined,
          yesPercentage: prediction.yesPercentage,
          noPercentage: prediction.noPercentage,
          options: prediction.options?.length
            ? prediction.options.map((text: string) => ({ text, percentage: prediction.optionResults?.[text] ?? 0 }))
            : undefined,
          momentum: prediction.momentum,
          momentumDirection: prediction.momentumDirection as "up" | "down" | undefined,
          resolvesAt: prediction.resolvesAt,
        }
        return <ShareModal context={shareContext} onClose={() => setShareOpen(false)} />
      })()}
    </Layout>
  )
}
