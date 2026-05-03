import { type ReactNode } from "react"
import { ResultsBreakdown } from "./ResultsBreakdown"
import { TrendChart } from "./TrendChart"
import { ResultsTabsView } from "./ResultsTabsView"

interface PollViewToggleProps {
  pollId: number
  totalVotes: number
  userCountry?: string | null
  /** The default "Results" view (vote bars, insights). Rendered inside the first tab. */
  resultsView: ReactNode
}

export function PollViewToggle({ pollId, totalVotes, userCountry, resultsView }: PollViewToggleProps) {
  return (
    <ResultsTabsView
      resultsView={resultsView}
      countryView={<ResultsBreakdown pollId={pollId} totalVotes={totalVotes} userCountry={userCountry} hideHeader />}
      timelineView={<TrendChart pollId={pollId} />}
    />
  )
}
