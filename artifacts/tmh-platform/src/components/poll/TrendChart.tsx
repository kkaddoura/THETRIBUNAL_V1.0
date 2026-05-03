import { useGetPollTrends } from "@workspace/api-client-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts"
import { format, parseISO } from "date-fns"

const LINE_COLORS = [
  "hsl(348 83% 53%)",
  "hsl(210 70% 60%)",
  "hsl(150 55% 50%)",
  "hsl(40 90% 55%)",
  "hsl(280 60% 65%)",
]

const MUTED = "hsl(var(--muted-foreground))"

function truncate(str: string, n: number) {
  return str.length > n ? str.slice(0, n) + "…" : str
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length || !label) return null
  const sorted = [...payload].sort((a, b) => b.value - a.value)
  return (
    <div className="bg-card border border-border px-4 py-3 shadow-xl text-xs font-sans min-w-[180px]">
      <p className="text-muted-foreground uppercase tracking-widest font-bold mb-2 text-[10px]">
        {format(parseISO(label), "MMM d, yyyy")}
      </p>
      {sorted.map((entry, i) => (
        <div key={i} className="flex items-center justify-between gap-4 mb-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: entry.color }} />
            <span className="text-foreground truncate">{truncate(entry.name, 28)}</span>
          </div>
          <span className="font-bold text-foreground tabular-nums">{entry.value.toFixed(1)}%</span>
        </div>
      ))}
    </div>
  )
}

interface TrendChartProps {
  pollId: number
}

export function TrendChart({ pollId }: TrendChartProps) {
  const { data, isLoading } = useGetPollTrends(pollId)

  if (isLoading) {
    return (
      <div className="w-full h-48 bg-secondary animate-pulse border border-border" />
    )
  }

  if (!data?.dataPoints?.length) {
    return (
      <div className="py-10 px-4 text-center border border-dashed border-border">
        <p className="text-[10px] uppercase tracking-[0.25em] font-bold text-primary mb-2 font-serif">
          Still Gathering Data
        </p>
        <p className="text-xs text-muted-foreground font-sans max-w-xs mx-auto leading-relaxed">
          We need more votes over time before we can show how opinion has shifted. Come back later.
        </p>
      </div>
    )
  }

  const options: string[] = []
  for (const dp of data.dataPoints) {
    for (const s of dp.series) {
      if (!options.includes(s.optionText)) options.push(s.optionText)
    }
  }

  const chartData = data.dataPoints.map(dp => {
    const row: Record<string, string | number> = { date: dp.date }
    for (const s of dp.series) {
      row[s.optionText] = s.percentage
    }
    return row
  })

  const lastPoint = data.dataPoints[data.dataPoints.length - 1]
  const leadingOption = lastPoint?.series.sort((a, b) => b.percentage - a.percentage)[0]

  const firstDate = data.dataPoints[0]?.date
  const lastDate = data.dataPoints[data.dataPoints.length - 1]?.date

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1">
            Opinion Trend · 10 Weeks
          </p>
          {leadingOption && (
            <p className="text-xs font-sans text-foreground">
              Leading:{" "}
              <span className="font-bold" style={{ color: LINE_COLORS[0] }}>
                {truncate(leadingOption.optionText, 40)}
              </span>{" "}
              at{" "}
              <span className="font-bold">{leadingOption.percentage.toFixed(1)}%</span>
            </p>
          )}
        </div>
        {firstDate && lastDate && (
          <p className="text-[10px] text-muted-foreground font-sans hidden sm:block">
            {format(parseISO(firstDate), "MMM d")} — {format(parseISO(lastDate), "MMM d, yyyy")}
          </p>
        )}
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
          <XAxis
            dataKey="date"
            tickFormatter={d => format(parseISO(d), "MMM d")}
            tick={{ fontSize: 10, fill: MUTED, fontFamily: "inherit" }}
            axisLine={false}
            tickLine={false}
            tickCount={5}
          />
          <YAxis
            tickFormatter={v => `${v}%`}
            tick={{ fontSize: 10, fill: MUTED, fontFamily: "inherit" }}
            axisLine={false}
            tickLine={false}
            width={38}
            domain={[0, 100]}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={50} stroke="hsl(var(--border))" strokeDasharray="4 4" />
          {options.map((opt, i) => (
            <Line
              key={opt}
              type="monotone"
              dataKey={opt}
              name={opt}
              stroke={LINE_COLORS[i % LINE_COLORS.length]}
              strokeWidth={i === 0 ? 2.5 : 1.5}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      <p className="text-[9px] text-muted-foreground font-sans mt-2 uppercase tracking-widest text-right">
        Source: TMH Poll Data · tmhustle.com
      </p>
    </div>
  )
}
