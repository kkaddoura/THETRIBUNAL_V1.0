import { useEffect, useState } from "react"
import { motion } from "motion/react"
import { cn } from "@/lib/utils"

const FLAG_MAP: Record<string, string> = {
  AE: "🇦🇪", SA: "🇸🇦", EG: "🇪🇬", JO: "🇯🇴", LB: "🇱🇧", KW: "🇰🇼",
  BH: "🇧🇭", QA: "🇶🇦", OM: "🇴🇲", MA: "🇲🇦", TN: "🇹🇳", IQ: "🇮🇶",
  PS: "🇵🇸", TR: "🇹🇷", US: "🇺🇸", GB: "🇬🇧", DE: "🇩🇪", FR: "🇫🇷",
  IN: "🇮🇳", PK: "🇵🇰", AU: "🇦🇺", CA: "🇨🇦",
}

function seededPct(seed: number, idx: number): number {
  const x = Math.sin(seed * 9301 + idx * 49297 + 233) * 93942
  return x - Math.floor(x)
}

function makeFallback(pollId: number) {
  const countries = [
    { code: "AE", name: "United Arab Emirates" },
    { code: "SA", name: "Saudi Arabia" },
    { code: "EG", name: "Egypt" },
    { code: "JO", name: "Jordan" },
    { code: "LB", name: "Lebanon" },
    { code: "KW", name: "Kuwait" },
  ]
  const raws = countries.map((_, i) => 0.05 + seededPct(pollId, i) * 0.9)
  const total = raws.reduce((a, b) => a + b, 0)
  const pcts = raws.map(r => Math.round((r / total) * 100))
  const diff = 100 - pcts.reduce((a, b) => a + b, 0)
  pcts[0] += diff
  return countries.map((c, i) => ({ ...c, percentage: pcts[i], count: 0, topOptionText: null, isFallback: true }))
}

interface CountryRow {
  code: string
  name: string
  percentage: number
  count: number
  topOptionText: string | null
  isFallback?: boolean
}

interface ResultsBreakdownProps {
  pollId: number
  totalVotes: number
  userCountry?: string | null
  /** When true, don't render the top border + "By Country" label (useful when inside a tab that already labels the view) */
  hideHeader?: boolean
}

export function ResultsBreakdown({ pollId, totalVotes, userCountry, hideHeader = false }: ResultsBreakdownProps) {
  const [countries, setCountries] = useState<CountryRow[]>([])
  const [isFallback, setIsFallback] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const baseUrl = import.meta.env?.VITE_API_BASE_URL ?? ""
    fetch(`${baseUrl}/api/polls/${pollId}/breakdown`)
      .then(r => r.json())
      .then(data => {
        if (data.countries && data.countries.length >= 2) {
          setCountries(data.countries.slice(0, 6))
          setIsFallback(false)
        } else {
          setCountries([])
          setIsFallback(true)
        }
        setLoaded(true)
      })
      .catch(() => {
        setCountries([])
        setIsFallback(true)
        setLoaded(true)
      })
  }, [pollId])

  const wrapperClass = hideHeader ? "" : "border-t-2 border-foreground mt-6 pt-5"

  if (!loaded) {
    return (
      <div className={wrapperClass}>
        <div className="py-8 text-center">
          <div className="inline-block w-5 h-5 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  // Empty / not enough data state
  if (isFallback) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className={wrapperClass}
      >
        {!hideHeader && (
          <p className="text-[9px] uppercase tracking-[0.3em] font-bold text-muted-foreground mb-2">
            By Country
          </p>
        )}
        <div className="py-10 px-4 text-center border border-dashed border-border">
          <p className="text-[10px] uppercase tracking-[0.25em] font-bold text-primary mb-2 font-serif">
            Still Gathering Data
          </p>
          <p className="text-xs text-muted-foreground font-sans max-w-xs mx-auto leading-relaxed">
            We don't have enough votes from different countries yet to show a breakdown. Come back later.
          </p>
        </div>
      </motion.div>
    )
  }

  const topPct = Math.max(...countries.map(c => c.percentage), 1)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={wrapperClass}
    >
      {!hideHeader && (
        <div className="flex items-center justify-between mb-4">
          <p className="text-[9px] uppercase tracking-[0.3em] font-bold text-muted-foreground">
            By Country
          </p>
        </div>
      )}

      <div className="space-y-3">
        {countries.map((country, i) => {
          const isUserCountry = userCountry && country.code === userCountry
          return (
            <motion.div
              key={country.code}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.75 + i * 0.06, duration: 0.3 }}
              className={cn("flex items-start gap-3", isUserCountry && "bg-primary/5 -mx-2 px-2 py-1")}
            >
              <span className="text-base leading-none flex-shrink-0 w-5 text-center mt-0.5">
                {FLAG_MAP[country.code] ?? "🌍"}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={cn(
                      "text-[10px] font-sans truncate",
                      isUserCountry ? "text-primary font-bold" : "text-foreground/80"
                    )}>
                      {country.name}
                      {isUserCountry && <span className="ml-1 text-[8px] text-primary/70">(you)</span>}
                    </span>
                  </div>
                  <span className={cn(
                    "text-[10px] font-bold font-sans ml-2 flex-shrink-0",
                    i === 0 ? "text-primary" : "text-foreground"
                  )}>
                    {country.percentage}%
                  </span>
                </div>
                <div className="h-1 w-full bg-secondary overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(country.percentage / topPct) * 100}%` }}
                    transition={{ duration: 0.6, delay: 0.8 + i * 0.06, ease: [0.25, 1, 0.5, 1] }}
                    className={cn("h-full", i === 0 ? "bg-primary" : "bg-foreground/30")}
                  />
                </div>
                {country.topOptionText && (
                  <p className="text-[9px] text-muted-foreground font-sans mt-1 truncate">
                    Most voted: <span className="text-foreground/70 font-medium">"{country.topOptionText}"</span>
                  </p>
                )}
              </div>
              {country.count > 0 && (
                <span className="text-[9px] text-muted-foreground font-sans flex-shrink-0 w-10 text-right mt-0.5">
                  {country.count.toLocaleString()}
                </span>
              )}
            </motion.div>
          )
        })}
      </div>

      <p className="text-[9px] text-muted-foreground mt-4 font-sans">
        {`Based on ${totalVotes.toLocaleString()} votes with location data`}
      </p>
    </motion.div>
  )
}
