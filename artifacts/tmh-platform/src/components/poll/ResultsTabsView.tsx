import { useState, type ReactNode } from "react"
import { BarChart3, Globe, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"

interface ResultsTabsViewProps {
  /** Default "Results" tab content (e.g. vote bars) */
  resultsView: ReactNode
  /** "By Country" tab content (e.g. ResultsBreakdown). Pass null for empty state. */
  countryView: ReactNode
  /** "Over Time" tab content (e.g. TrendChart). Pass null for empty state. */
  timelineView: ReactNode
}

type View = "results" | "country" | "timeline"

/**
 * Shared three-tab view switcher for debate and prediction results.
 * Each tab renders a single panel — no stacked breakdowns.
 */
export function ResultsTabsView({ resultsView, countryView, timelineView }: ResultsTabsViewProps) {
  const [view, setView] = useState<View>("results")

  const tabs: { key: View; label: string; icon: typeof BarChart3 }[] = [
    { key: "results", label: "Results", icon: BarChart3 },
    { key: "country", label: "By Country", icon: Globe },
    { key: "timeline", label: "Over Time", icon: TrendingUp },
  ]

  return (
    <div>
      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-border mb-5">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setView(key)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 text-[10px] uppercase tracking-[0.15em] font-bold font-serif transition-colors border-b-2 -mb-px",
              view === key
                ? "text-primary border-primary"
                : "text-muted-foreground border-transparent hover:text-foreground"
            )}
          >
            <Icon className="w-3 h-3" />
            {label}
          </button>
        ))}
      </div>

      {view === "results" && <div className="space-y-4">{resultsView}</div>}
      {view === "country" && <div>{countryView}</div>}
      {view === "timeline" && <div>{timelineView}</div>}
    </div>
  )
}

/** Reusable "still gathering data" empty state for country and timeline tabs */
export function EmptyStateCard({ title, message }: { title: string; message: string }) {
  return (
    <div className="py-10 px-4 text-center border border-dashed border-border">
      <p className="text-[10px] uppercase tracking-[0.25em] font-bold text-primary mb-2 font-serif">
        {title}
      </p>
      <p className="text-xs text-muted-foreground font-sans max-w-xs mx-auto leading-relaxed">
        {message}
      </p>
    </div>
  )
}
