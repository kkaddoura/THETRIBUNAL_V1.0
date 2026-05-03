import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Layout } from "@/components/layout/Layout";
import { Share2, CheckCircle2, MessageSquare, Info } from "lucide-react";
import { FilterSidebar } from "@/components/layout/FilterSidebar";
import { Link } from "wouter";
import { motion } from "motion/react";
import { useToast } from "@/hooks/use-toast";
import { ShareModal } from "@/components/ShareModal";
import type { PredictionShareContext } from "@/lib/share";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import { LoadingDots } from "@/components/ui/loading-dots";
import { PredictionGridSkeleton } from "@/components/skeletons/PredictionCardSkeleton";
import { TickerSkeleton } from "@/components/skeletons/TickerSkeleton";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};
const staggerItem = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: EASE_OUT_EXPO },
  },
};
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
} from "recharts";

import {
  PREDICTIONS as FALLBACK_PREDICTIONS,
  PREDICTION_CATEGORIES as FALLBACK_CATEGORIES,
  type PredictionCard,
} from "@/data/predictions-data";
import { usePredictions, usePageConfig, type ApiPrediction } from "@/hooks/use-cms-data";
import { usePageTitle } from "@/hooks/use-page-title";
import { TitlePunctuation } from "@/components/TitlePunctuation";

function apiToPredictionCard(p: ApiPrediction): PredictionCard {
  return {
    id: p.id,
    category: p.category,
    resolves: p.resolvesAt ?? "TBD",
    question: p.question,
    count: p.totalCount.toLocaleString(),
    yes: p.yesPercentage,
    no: p.noPercentage,
    momentum: p.momentum,
    up: p.momentumDirection === "up",
    data: p.trendData?.length
      ? p.trendData
      : Array.from({ length: 12 }, () => p.yesPercentage),
    options: p.options,
    optionResults: p.optionResults,
  };
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const CLOSED_RAW = [55, 58, 60, 62, 63, 65, 67, 67, 67, 80];
const CLOSED_DATA = CLOSED_RAW.map((yes, i) => ({ week: i + 1, yes }));

function formatResolvesText(resolves: string): string {
  if (!resolves || resolves === "TBD") return "Resolves: TBD";
  const date = new Date(resolves);
  if (isNaN(date.getTime())) return `Resolves: ${resolves}`;
  const now = new Date();
  if (date <= now) return "Resolved";
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 30) return `Ends in ${diffDays}d`;
  const diffMonths = Math.round(diffDays / 30);
  if (diffMonths < 12) return `Ends in ${diffMonths}mo`;
  const years = Math.floor(diffMonths / 12);
  const remainingMonths = diffMonths % 12;
  if (remainingMonths === 0) return `Ends in ${years}y`;
  return `Ends in ${years}y ${remainingMonths}mo`;
}

// ─── CUSTOM TOOLTIP ──────────────────────────────────────────────────────────

function FeaturedTooltip({ active, payload, label, chartData }: any) {
  if (!active || !payload?.length) return null;
  const curr = payload[0]?.value;
  const data = chartData || [];
  const prevIdx = data.findIndex((d: any) => d.month === label);
  const prevVal = prevIdx > 0 ? data[prevIdx - 1].yes : curr;
  const change = curr - prevVal;
  return (
    <div
      style={{
        background: "#1a1a1a",
        border: "1px solid rgba(220,20,60,0.3)",
        borderRadius: 6,
        padding: "10px 14px",
        fontFamily: "DM Sans, sans-serif",
      }}
    >
      <p
        style={{
          color: "rgba(255,255,255,0.75)",
          fontSize: 11,
          marginBottom: 2,
        }}
      >
        {label} 2026
      </p>
      <p
        style={{
          color: "#fff",
          fontSize: 14,
          fontWeight: 700,
          marginBottom: 2,
        }}
      >
        {curr}% YES
      </p>
      {prevIdx > 0 && (
        <p style={{ color: change >= 0 ? "#10B981" : "#DC143C", fontSize: 11 }}>
          {change >= 0 ? "▲" : "▼"} {Math.abs(change).toFixed(1)}% vs last month
        </p>
      )}
    </div>
  );
}

// ─── SPARKLINE ───────────────────────────────────────────────────────────────

function Sparkline({ data, up }: { data: number[]; up: boolean }) {
  const chartData = data.map((yes, i) => ({ i, yes }));
  const color = up ? "#10B981" : "#DC143C";
  return (
    <ResponsiveContainer width="100%" height={56}>
      <LineChart
        data={chartData}
        margin={{ top: 6, right: 4, bottom: 6, left: 4 }}
      >
        <Line
          type="monotone"
          dataKey="yes"
          stroke={color}
          strokeWidth={1}
          dot={false}
          isAnimationActive={true}
          animationDuration={1200}
          animationEasing="ease-out"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ─── CONFIDENCE BARS ─────────────────────────────────────────────────────────

function ConfidenceBars({
  yes,
  no,
  up,
  momentum,
  compact = false,
  options,
  optionResults,
}: {
  yes: number;
  no: number;
  up: boolean;
  momentum: number;
  compact?: boolean;
  options?: string[];
  optionResults?: Record<string, number>;
}) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 120);
    return () => clearTimeout(t);
  }, []);
  const h = compact ? "h-2" : "h-3";

  // Dynamic options mode
  if (options?.length && optionResults) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {options.map((opt, i) => {
          const pct = optionResults[opt] ?? 0;
          const color = OPTION_COLORS[i % OPTION_COLORS.length];
          return (
            <div key={opt}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 3,
                }}
              >
                <span
                  style={{
                    fontFamily: "DM Sans, sans-serif",
                    fontWeight: 600,
                    fontSize: compact ? 11 : 12,
                    color,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    maxWidth: "80%",
                  }}
                >
                  {opt}
                </span>
                <span
                  style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontWeight: 700,
                    fontSize: compact ? 12 : 13,
                    color,
                  }}
                >
                  {pct}%
                </span>
              </div>
              <div
                className={`w-full ${h} rounded-sm overflow-hidden`}
                style={{ background: "rgba(255,255,255,0.08)" }}
              >
                <div
                  className={`${h} rounded-sm transition-all duration-1000`}
                  style={{
                    width: animated ? `${pct}%` : "0%",
                    background: color,
                    opacity: 0.7,
                  }}
                />
              </div>
            </div>
          );
        })}
        {(compact || (!compact && options.length > 0)) && (
          <p
            style={{
              fontFamily: "DM Sans, sans-serif",
              fontSize: 11,
              color: up ? "#10B981" : "#DC143C",
              marginTop: 2,
            }}
          >
            {up ? "\u25B2" : "\u25BC"} {up ? "Up" : "Down"} {momentum}% this week
          </p>
        )}
      </div>
    );
  }

  // Legacy YES/NO mode
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 4,
          }}
        >
          <span
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700,
              fontSize: compact ? 12 : 13,
              textTransform: "uppercase",
              color: "#10B981",
            }}
          >
            YES
          </span>
          <span
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700,
              fontSize: compact ? 12 : 13,
              textTransform: "uppercase",
              color: "#10B981",
            }}
          >
            {yes}%
          </span>
        </div>
        <div
          className={`w-full ${h} rounded-sm overflow-hidden`}
          style={{ background: "rgba(255,255,255,0.08)" }}
        >
          <div
            className={`${h} rounded-sm transition-all duration-1000`}
            style={{
              width: animated ? `${yes}%` : "0%",
              background: "#10B981",
            }}
          />
        </div>
        {!compact && (
          <p
            style={{
              fontFamily: "DM Sans, sans-serif",
              fontSize: 11,
              color: up ? "#10B981" : "#DC143C",
              marginTop: 3,
            }}
          >
            {up ? "\u25B2" : "\u25BC"} {up ? "Up" : "Down"} {momentum}% this week
          </p>
        )}
      </div>
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 4,
          }}
        >
          <span
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700,
              fontSize: compact ? 12 : 13,
              textTransform: "uppercase",
              color: "#DC143C",
            }}
          >
            NO
          </span>
          <span
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700,
              fontSize: compact ? 12 : 13,
              textTransform: "uppercase",
              color: "#DC143C",
            }}
          >
            {no}%
          </span>
        </div>
        <div
          className={`w-full ${h} rounded-sm overflow-hidden`}
          style={{ background: "rgba(255,255,255,0.08)" }}
        >
          <div
            className={`${h} rounded-sm transition-all duration-1000`}
            style={{
              width: animated ? `${no}%` : "0%",
              background: "rgba(220,20,60,0.5)",
            }}
          />
        </div>
        {compact && (
          <p
            style={{
              fontFamily: "DM Sans, sans-serif",
              fontSize: 11,
              color: up ? "#10B981" : "#DC143C",
              marginTop: 3,
            }}
          >
            {up ? "\u25B2" : "\u25BC"} {up ? "UP" : "DOWN"} {momentum}% this week
          </p>
        )}
      </div>
    </div>
  );
}

// ─── VOTE BUTTONS ────────────────────────────────────────────────────────────

async function predCopyText(text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {}
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.cssText = "position:fixed;top:-9999px;opacity:0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

function PredShareBtn({ card }: { card: PredictionCard }) {
  const [showModal, setShowModal] = useState(false);
  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/predictions?shared=${card.id}`
      : `/predictions?shared=${card.id}`;

  const totalVotes = parseInt(card.count.replace(/,/g, ""), 10) || 0;

  const shareContext: PredictionShareContext = {
    contentType: "prediction",
    predictionId: card.id,
    url,
    title: card.question,
    category: card.category,
    totalVotes,
    votedChoice: typeof window !== "undefined" ? localStorage.getItem(`tmh_pred_${card.id}`) ?? undefined : undefined,
    yesPercentage: card.yes,
    noPercentage: card.no,
    options: card.options?.length
      ? card.options.map((text) => ({ text, percentage: card.optionResults?.[text] ?? 0 }))
      : undefined,
    momentum: card.momentum,
    momentumDirection: card.up ? "up" : "down",
  };

  return (
    <>
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowModal(true); }}
        title="Share"
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "4px",
          color: "var(--muted-foreground)",
          transition: "color 0.15s",
        }}
      >
        <Share2 size={14} />
      </button>
      {showModal && (
        <ShareModal
          context={shareContext}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}

function PredMajlisShareBtn({ card }: { card: PredictionCard }) {
  const [show, setShow] = useState(false);
  const hasMajlisToken = typeof window !== "undefined" && !!localStorage.getItem("majlis_token");
  if (!hasMajlisToken) return null;

  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/predictions?shared=${card.id}`
      : `/predictions?shared=${card.id}`;
  const totalVotes = parseInt(card.count.replace(/,/g, ""), 10) || 0;

  const shareContext: PredictionShareContext = {
    contentType: "prediction",
    predictionId: card.id,
    url,
    title: card.question,
    category: card.category,
    totalVotes,
    votedChoice: typeof window !== "undefined" ? localStorage.getItem(`tmh_pred_${card.id}`) ?? undefined : undefined,
    yesPercentage: card.yes,
    noPercentage: card.no,
    options: card.options?.length
      ? card.options.map((text) => ({ text, percentage: card.optionResults?.[text] ?? 0 }))
      : undefined,
    momentum: card.momentum,
    momentumDirection: card.up ? "up" : "down",
  };

  return (
    <>
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShow(true); }}
        title="Share to Majlis"
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "4px",
          color: "var(--muted-foreground)",
          transition: "color 0.15s",
        }}
      >
        <MessageSquare size={14} />
      </button>
      {show && (
        <ShareModal
          context={shareContext}
          onClose={() => setShow(false)}
        />
      )}
    </>
  );
}

const OPTION_COLORS = ["#10B981", "#3B82F6", "#F59E0B", "#DC143C"];

function VoteButtons({
  height = 52,
  locked = false,
  predId,
  options,
  onVote,
}: {
  height?: number;
  locked?: boolean;
  predId?: number;
  options?: string[];
  onVote?: (predId: number, choice: string | null, serverYes?: number, serverNo?: number) => void;
}) {
  const { toast } = useToast();
  const storageKey = predId != null ? `tmh_pred_${predId}` : null;
  const [voted, setVoted] = useState<string | null>(() => {
    if (typeof window === "undefined" || !storageKey) return null;
    return localStorage.getItem(storageKey);
  });
  if (locked) return null;

  const resolvedOptions = options?.length ? options : ["yes", "no"];
  const isLegacy = !options?.length;

  const submitVote = (choice: string) => {
    const previousVote = voted;
    setVoted(choice);
    if (storageKey) localStorage.setItem(storageKey, choice);
    if (predId != null) {
      // Optimistic update only for NEW votes (no server data yet)
      if (!previousVote) {
        onVote?.(predId, choice);
      }
      let token = localStorage.getItem("tmh_voter_token");
      if (!token) {
        token = crypto.randomUUID();
        localStorage.setItem("tmh_voter_token", token);
      }
      fetch(`/api/predictions/${predId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choice, voterToken: token }),
      })
        .then(r => {
          if (!r.ok) throw new Error("Vote failed");
          return r.json();
        })
        .then(data => {
          if (data && onVote) {
            // Server-authoritative: overwrite with combined percentages
            if (data.yesPercentage != null) {
              onVote(predId, choice, data.yesPercentage, data.noPercentage ?? (100 - data.yesPercentage));
            }
          }
        })
        .catch(() => {
          // Revert optimistic state on failure
          setVoted(previousVote);
          if (storageKey) {
            if (previousVote) localStorage.setItem(storageKey, previousVote);
            else localStorage.removeItem(storageKey);
          }
          if (previousVote && onVote) onVote(predId, previousVote);
          toast({ title: "Failed to vote", description: "Please try again.", variant: "destructive" });
        });
    }
  };

  // Click option → instant vote. Click different option → instant change.
  // Click same option → no-op.
  const handleVote = (choice: string) => {
    if (voted === choice) return;
    submitVote(choice);
  };

  if (isLegacy) {
    return (
      <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
        <div style={{ display: "flex", gap: 8, width: "100%" }}>
          <button
            onClick={() => handleVote("yes")}
            style={{
              flex: 1,
              height,
              border: `1.5px solid #10B981`,
              background: voted === "yes" ? "#10B981" : "transparent",
              color: voted === "yes" ? "#fff" : "#10B981",
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 900,
              fontSize: "1rem",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              cursor: "pointer",
              transition: "all 0.15s",
              borderRadius: 4,
            }}
          >
            {voted === "yes" ? "\u2713 YES" : "YES"}
          </button>
          <button
            onClick={() => handleVote("no")}
            style={{
              flex: 1,
              height,
              border: `1.5px solid #DC143C`,
              background: voted === "no" ? "#DC143C" : "transparent",
              color: voted === "no" ? "#fff" : "#DC143C",
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 900,
              fontSize: "0.85rem",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              cursor: "pointer",
              transition: "all 0.15s",
              borderRadius: 4,
            }}
          >
            {voted === "no" ? "\u2713 NO" : "NO"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
      {resolvedOptions.map((opt, i) => {
        const color = OPTION_COLORS[i % OPTION_COLORS.length];
        const isSelected = voted === opt;
        return (
          <button
            key={opt}
            onClick={() => handleVote(opt)}
            style={{
              width: "100%",
              minHeight: 44,
              padding: "10px 16px",
              border: `1.5px solid ${color}`,
              background: isSelected ? color : "transparent",
              color: isSelected ? "#fff" : color,
              fontFamily: "DM Sans, sans-serif",
              fontWeight: 600,
              fontSize: "0.85rem",
              textAlign: "left",
              cursor: "pointer",
              transition: "all 0.15s",
              borderRadius: 4,
            }}
          >
            {isSelected ? `\u2713 ${opt}` : opt}
          </button>
        );
      })}
    </div>
  );
}

// ─── MOMENTUM TICKER ─────────────────────────────────────────────────────────

type MomentumTickerItem = {
  label: string;
  yes: number;
  delta: number;
  up: boolean;
  href?: string;
};

function MomentumTicker({
  tickerData,
  isLoading,
}: {
  tickerData: MomentumTickerItem[];
  isLoading: boolean;
}) {
  if (isLoading && !tickerData.length) return <TickerSkeleton />;
  if (!tickerData.length) return null;
  const doubled = [...tickerData, ...tickerData];
  return (
    <div
      style={{
        background: "#0D0D0D",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        overflow: "hidden",
      }}
    >
      <div className="tmh-ticker-scroll">
        {doubled.map((item, i) => (
          <Link
            key={i}
            href={item.href ?? "/predictions"}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
              padding: "0.7rem 2rem",
              borderRight: "1px solid rgba(255,255,255,0.1)",
              cursor: "pointer",
              textDecoration: "none",
            }}
          >
            <span
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 700,
                fontSize: "0.7rem",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "rgba(250,250,250,0.75)",
              }}
            >
              {item.label}
            </span>
            <span
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 700,
                fontSize: "0.85rem",
                color: "#fff",
              }}
            >
              YES {item.yes}%
            </span>
            <span
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 700,
                fontSize: "0.72rem",
                color: item.up ? "#10B981" : "#DC143C",
              }}
            >
              {item.up ? "▲" : "▼"} {item.up ? "+" : "-"}
              {item.delta}%
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─── FEATURED PREDICTION ─────────────────────────────────────────────────────

function FeaturedPrediction({ card, onVote }: { card: PredictionCard; onVote?: (predId: number, choice: string | null, serverYes?: number, serverNo?: number) => void }) {
  const featuredData = useMemo(() => {
    return card.data.map((yes, i) => {
      const slice = card.data.slice(Math.max(0, i - 2), i + 1);
      const ma = slice.reduce((s, v) => s + v, 0) / slice.length;
      return { month: MONTHS[i % 12], yes, ma: Math.round(ma * 10) / 10 };
    });
  }, [card.data]);

  const lastVal = featuredData[featuredData.length - 1]?.yes ?? 0;
  const prevVal =
    featuredData.length >= 2
      ? featuredData[featuredData.length - 2].yes
      : lastVal;
  const month30Change = lastVal - prevVal;

  return (
    <div
      style={{
        background: "var(--card)",
        border: "1.5px solid rgba(16,185,129,0.2)",
        borderRadius: 12,
        padding: "2rem",
        marginBottom: "2rem",
      }}
    >
      <div className="grid md:grid-cols-[55fr_45fr] gap-8">
        <div>
          <p
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700,
              fontSize: "0.68rem",
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              color: "var(--muted-foreground)",
              marginBottom: "1rem",
            }}
          >
            Confidence Over Time — YES %
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart
              data={featuredData}
              margin={{ top: 10, right: 20, bottom: 20, left: 0 }}
            >
              <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="month"
                tickCount={6}
                tick={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 11,
                  fill: "rgba(250,250,250,0.4)",
                }}
                axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                tick={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 11,
                  fill: "rgba(250,250,250,0.4)",
                }}
                axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                tickLine={false}
                width={30}
              />
              <Tooltip
                content={<FeaturedTooltip chartData={featuredData} />}
                cursor={{ stroke: "rgba(16,185,129,0.4)", strokeWidth: 1 }}
              />
              <ReferenceLine
                y={50}
                stroke="rgba(255,255,255,0.2)"
                strokeDasharray="4 4"
                label={{
                  value: "Tipping Point",
                  position: "right",
                  fontSize: 10,
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fill: "rgba(255,255,255,0.35)",
                }}
              />
              <Area
                type="monotone"
                dataKey="yes"
                fill="rgba(16,185,129,0.1)"
                stroke="rgba(16,185,129,0.6)"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={true}
                animationDuration={1200}
                animationEasing="ease-out"
              />
              <Line
                type="monotone"
                dataKey="ma"
                stroke="#10B981"
                strokeWidth={1}
                dot={false}
                isAnimationActive={true}
                animationDuration={1400}
                animationEasing="ease-out"
              />
            </ComposedChart>
          </ResponsiveContainer>
          <p
            style={{
              fontFamily: "DM Sans, sans-serif",
              fontStyle: "italic",
              fontSize: "0.8rem",
              color: month30Change >= 0 ? "#10B981" : "#DC143C",
              marginTop: "0.5rem",
            }}
          >
            Confidence has moved {month30Change >= 0 ? "+" : ""}
            {month30Change}% in the last 30 days
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span
              style={{
                padding: "4px 10px",
                background: "var(--foreground)",
                color: "var(--background)",
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 700,
                fontSize: 16,
                textTransform: "uppercase",
                letterSpacing: "0.18em",
              }}
            >
              {card.category}
            </span>
            <span
              style={{
                padding: "3px 9px",
                background: "rgba(251,191,36,0.15)",
                border: "1px solid rgba(251,191,36,0.3)",
                color: "#F59E0B",
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 700,
                fontSize: 15,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                borderRadius: 2,
              }}
            >
              {formatResolvesText(card.resolves)}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
              <PredMajlisShareBtn card={card} />
              <PredShareBtn card={card} />
            </div>
          </div>

          <p
            style={{
              fontFamily: "DM Sans, sans-serif",
              fontSize: "0.78rem",
              color: "var(--muted-foreground)",
              fontStyle: "italic",
            }}
          >
            The region has spoken on the debate. Now they're putting their
            prediction on it.
          </p>

          <Link
            href={`/predictions/${card.id}`}
            style={{ textDecoration: "none" }}
          >
            <p
              data-testid="featured-prediction-title"
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 900,
                fontSize: "1.2rem",
                textTransform: "uppercase",
                lineHeight: 1.2,
                color: "var(--foreground)",
                letterSpacing: "0.02em",
                cursor: "pointer",
              }}
            >
              {card.question}
            </p>
          </Link>

          <p
            style={{
              fontFamily: "DM Sans, sans-serif",
              fontSize: "0.8rem",
              color: "var(--muted-foreground)",
            }}
          >
            {card.count} predictions locked in
          </p>

          <ConfidenceBars
            yes={card.yes}
            no={card.no}
            up={card.up}
            momentum={card.momentum}
            compact={false}
            options={card.options}
            optionResults={card.optionResults}
          />

          <VoteButtons height={52} predId={card.id} options={card.options} onVote={onVote} />

        </div>
      </div>
    </div>
  );
}

// ─── PREDICTION GRID CARD ────────────────────────────────────────────────────

function PredictionGridCard({
  card,
  highlighted,
  onVote,
}: {
  card: PredictionCard;
  highlighted?: boolean;
  onVote?: (predId: number, choice: string | null, serverYes?: number, serverNo?: number) => void;
}) {
  const [glowing, setGlowing] = useState(!!highlighted);
  const [showInfo, setShowInfo] = useState(false);
  const infoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!highlighted) return;
    setGlowing(true);
    const timer = setTimeout(() => setGlowing(false), 3000);
    return () => clearTimeout(timer);
  }, [highlighted]);

  // Close tooltip on outside click
  useEffect(() => {
    if (!showInfo) return;
    const handler = (e: MouseEvent) => {
      if (infoRef.current && !infoRef.current.contains(e.target as Node)) {
        setShowInfo(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showInfo]);

  return (
    <div
      id={`pred-${card.id}`}
      style={{
        background: glowing ? "rgba(220,20,60,0.08)" : "var(--card)",
        border: `1.5px solid ${glowing ? "rgba(220,20,60,0.7)" : "rgba(220,20,60,0.15)"}`,
        boxShadow: glowing ? "0 0 0 2px rgba(220,20,60,0.35), 0 0 28px rgba(220,20,60,0.25)" : undefined,
        borderRadius: 10,
        padding: "1.4rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.85rem",
        transition: "border-color 0.3s ease, background 0.3s ease, box-shadow 0.6s ease",
      }}
    >
      {/* Sparkline */}
      <div style={{ marginLeft: "-0.5rem", marginRight: "-0.5rem" }}>
        <Sparkline data={card.data} up={card.up} />
      </div>

      {/* Badges */}
      <div
        style={{
          display: "flex",
          gap: 6,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <span
          style={{
            padding: "4px 10px",
            background: "var(--foreground)",
            color: "var(--background)",
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 700,
            fontSize: 16,
            textTransform: "uppercase",
            letterSpacing: "0.18em",
          }}
        >
          {card.category}
        </span>
        <span
          data-testid="grid-resolves-badge"
          style={{
            padding: "3px 9px",
            background: "rgba(251,191,36,0.15)",
            border: "1px solid rgba(251,191,36,0.3)",
            color: "#F59E0B",
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 700,
            fontSize: 15,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            borderRadius: 2,
          }}
        >
          {formatResolvesText(card.resolves)}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
          <PredMajlisShareBtn card={card} />
          <PredShareBtn card={card} />
          {/* Info tooltip button */}
          <div ref={infoRef} style={{ position: "relative", display: "inline-flex" }}>
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowInfo(!showInfo); }}
              onMouseEnter={() => setShowInfo(true)}
              onMouseLeave={() => setShowInfo(false)}
              title="Prediction details"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "4px",
                color: "var(--muted-foreground)",
                transition: "color 0.15s",
                lineHeight: 1,
                width: 22,
                height: 22,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Info size={14} />
            </button>
            {showInfo && (
              <div
                style={{
                  position: "absolute",
                  bottom: "calc(100% + 8px)",
                  right: 0,
                  background: "#1A1A1A",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 6,
                  padding: "10px 14px",
                  minWidth: 220,
                  zIndex: 50,
                  boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <p style={{
                  fontFamily: "DM Sans, sans-serif",
                  fontSize: "0.75rem",
                  color: "rgba(255,255,255,0.7)",
                  margin: "0 0 4px",
                }}>
                  Category: {card.category}
                </p>
                <p style={{
                  fontFamily: "DM Sans, sans-serif",
                  fontSize: "0.75rem",
                  color: "rgba(255,255,255,0.7)",
                  margin: "0 0 4px",
                }}>
                  {formatResolvesText(card.resolves)}
                </p>
                <p style={{
                  fontFamily: "DM Sans, sans-serif",
                  fontSize: "0.75rem",
                  color: "rgba(255,255,255,0.7)",
                  margin: 0,
                }}>
                  {card.count} predictions locked in
                </p>
                <div style={{
                  position: "absolute",
                  bottom: -5,
                  right: 8,
                  width: 10,
                  height: 10,
                  background: "#1A1A1A",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderTop: "none",
                  borderLeft: "none",
                  transform: "rotate(45deg)",
                }} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Question */}
      <Link
        href={`/predictions/${card.id}`}
        style={{ textDecoration: "none" }}
      >
        <p
          data-testid="grid-prediction-title"
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 900,
            fontSize: "0.95rem",
            textTransform: "uppercase",
            lineHeight: 1.2,
            color: "var(--foreground)",
            letterSpacing: "0.02em",
            cursor: "pointer",
          }}
        >
          {card.question}
        </p>
      </Link>

      {/* Participation */}
      <p
        style={{
          fontFamily: "DM Sans, sans-serif",
          fontSize: "0.78rem",
          color: "var(--muted-foreground)",
        }}
      >
        {card.count} predictions locked in
      </p>

      {/* Confidence bars */}
      <ConfidenceBars
        yes={card.yes}
        no={card.no}
        up={card.up}
        momentum={card.momentum}
        compact={true}
        options={card.options}
        optionResults={card.optionResults}
      />

      {/* Resolution date (always visible) */}
      {card.resolves && (
        <span
          data-testid="grid-resolves-date"
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 700,
            fontSize: "0.82rem",
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            color: "var(--muted-foreground)",
          }}
        >
          {formatResolvesText(card.resolves)}
        </span>
      )}

      {/* Vote buttons */}
      <div>
        <VoteButtons height={44} predId={card.id} options={card.options} onVote={onVote} />
      </div>

    </div>
  );
}

// ─── CLOSED PREDICTION ───────────────────────────────────────────────────────

function ClosedPredictionCard() {
  return (
    <div
      style={{
        opacity: 0.65,
        background: "var(--card)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 10,
        padding: "1.4rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.85rem",
      }}
    >
      <div className="grid md:grid-cols-[55fr_45fr] gap-8">
        {/* Sparkline */}
        <div>
          <p
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700,
              fontSize: "1.15rem",
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              color: "var(--muted-foreground)",
              marginBottom: "0.5rem",
            }}
          >
            Final Trend — YES %
          </p>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart
              data={CLOSED_DATA}
              margin={{ top: 6, right: 10, bottom: 6, left: 0 }}
            >
              <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
              <XAxis
                dataKey="week"
                tick={false}
                axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                tickLine={false}
              />
              <YAxis
                domain={[40, 100]}
                tick={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 10,
                  fill: "rgba(250,250,250,0.35)",
                }}
                axisLine={false}
                tickLine={false}
                width={25}
              />
              <Line
                type="monotone"
                dataKey="yes"
                stroke="#10B981"
                strokeWidth={2}
                dot={false}
                isAnimationActive={true}
                animationDuration={1200}
              />
            </LineChart>
          </ResponsiveContainer>
          <p
            style={{
              fontFamily: "DM Sans, sans-serif",
              fontStyle: "italic",
              fontSize: "0.78rem",
              color: "var(--muted-foreground)",
              marginTop: "0.5rem",
            }}
          >
            The region called it. 67% predicted YES. They were right.
          </p>
        </div>

        {/* Info */}
        <div
          style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}
        >
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <span
              style={{
                padding: "2px 8px",
                background: "var(--foreground)",
                color: "var(--background)",
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 700,
                fontSize: 9,
                textTransform: "uppercase",
                letterSpacing: "0.2em",
              }}
            >
              Policy
            </span>
            <span
              style={{
                padding: "3px 8px",
                background: "rgba(16,185,129,0.15)",
                border: "1px solid rgba(16,185,129,0.3)",
                color: "#10B981",
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 700,
                fontSize: 9,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                borderRadius: 2,
              }}
            >
              RESOLVED — YES ▲
            </span>
          </div>

          <p
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 900,
              fontSize: "0.95rem",
              textTransform: "uppercase",
              lineHeight: 1.2,
              color: "var(--foreground)",
              letterSpacing: "0.02em",
            }}
          >
            Will the UAE Introduce a 4-Day Work Week for Government Employees by
            2025?
          </p>

          <p
            style={{
              fontFamily: "DM Sans, sans-serif",
              fontSize: "0.78rem",
              color: "var(--muted-foreground)",
            }}
          >
            Resolved: December 2024
          </p>

          {/* Final bars — static */}
          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 3,
                }}
              >
                <span
                  style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontWeight: 700,
                    fontSize: 12,
                    textTransform: "uppercase",
                    color: "var(--foreground)",
                  }}
                >
                  Final YES
                </span>
                <span
                  style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontWeight: 700,
                    fontSize: 12,
                    textTransform: "uppercase",
                    color: "var(--foreground)",
                  }}
                >
                  67%
                </span>
              </div>
              <div
                className="w-full h-2 rounded-sm overflow-hidden"
                style={{ background: "rgba(255,255,255,0.08)" }}
              >
                <div
                  className="h-2 rounded-sm"
                  style={{ width: "67%", background: "#10B981" }}
                />
              </div>
            </div>
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 3,
                }}
              >
                <span
                  style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontWeight: 700,
                    fontSize: 12,
                    textTransform: "uppercase",
                    color: "var(--foreground)",
                  }}
                >
                  Final NO
                </span>
                <span
                  style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontWeight: 700,
                    fontSize: 12,
                    textTransform: "uppercase",
                    color: "var(--foreground)",
                  }}
                >
                  33%
                </span>
              </div>
              <div
                className="w-full h-2 rounded-sm overflow-hidden"
                style={{ background: "rgba(255,255,255,0.08)" }}
              >
                <div
                  className="h-2 rounded-sm"
                  style={{ width: "33%", background: "rgba(255,255,255,0.15)" }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── PAGE ────────────────────────────────────────────────────────────────────

export default function Predictions() {
  usePageTitle({
    title: "Predictions",
    description: "A prediction market for MENA's biggest questions. Track confidence, watch consensus shift, and see where the region is headed.",
  });
  const { data: pageConfig } = usePageConfig<{ hero?: { titleLine1?: string; titleLine2?: string; subtitle?: string }; punctuations?: string[] }>("predictions_page");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("ALL");

  // Server-side search with 400ms debounce
  const [searchResults, setSearchResults] = useState<PredictionCard[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (searchAbortRef.current) searchAbortRef.current.abort();

    const q = searchQuery.trim();
    if (!q) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchTimerRef.current = setTimeout(() => {
      const controller = new AbortController();
      searchAbortRef.current = controller;
      const params = new URLSearchParams({ search: q, limit: "100" });
      fetch(`/api/public/predictions?${params}`, { signal: controller.signal })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.items) {
            setSearchResults(data.items.map((p: any) => apiToPredictionCard(p)));
          }
          setIsSearching(false);
        })
        .catch(err => {
          if (err.name !== "AbortError") setIsSearching(false);
        });
    }, 400);

    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [searchQuery]);

  const [voteOverrides, setVoteOverrides] = useState<Record<number, { yes: number; no: number }>>({});
  const [highlightedId, setHighlightedId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("shared");
  });

  const { data: apiData, isLoading } = usePredictions();

  const PREDICTIONS: PredictionCard[] = useMemo(() => {
    if (apiData?.items?.length) return apiData.items.map(apiToPredictionCard);
    return FALLBACK_PREDICTIONS;
  }, [apiData]);

  const PREDICTION_CATEGORIES = useMemo(() => {
    if (apiData?.items?.length) {
      const cats = [...new Set(apiData.items.map((p) => p.category))];
      return cats.sort();
    }
    return FALLBACK_CATEGORIES;
  }, [apiData]);

  const tickerData = useMemo<MomentumTickerItem[]>(() => {
    if (!apiData?.items?.length) return [];
    return apiData.items.slice(0, 12).map((p) => ({
      label:
        p.question.length > 40
          ? p.question.substring(0, 38) + "…"
          : p.question,
      yes: p.yesPercentage,
      delta: p.momentum,
      up: p.momentumDirection === "up",
      href: `/predictions/${p.id}`,
    }));
  }, [apiData]);

  const handleVoteOverride = useCallback((predId: number, choice: string | null, serverYes?: number, serverNo?: number) => {
    setVoteOverrides((prev) => {
      // Vote removal
      if (choice === null) {
        if (serverYes != null) {
          // Server sent back post-removal percentages
          return { ...prev, [predId]: { yes: serverYes, no: serverNo ?? (100 - serverYes) } };
        }
        // Optimistic: remove override so card reverts to base PREDICTIONS data
        const next = { ...prev };
        delete next[predId];
        return next;
      }
      // Server-authoritative: use real percentages when available
      if (serverYes != null) {
        return { ...prev, [predId]: { yes: serverYes, no: serverNo ?? (100 - serverYes) } };
      }
      // Optimistic fallback: estimate new percentage using combined total
      const card = PREDICTIONS.find((c) => c.id === predId);
      if (!card) return prev;
      const currentYes = prev[predId]?.yes ?? card.yes;
      // card.count is a locale string like "44" - parse it; total includes seed
      const total = parseInt(String(card.count).replace(/,/g, ""), 10) || 1;
      const yesVotes = Math.round((currentYes / 100) * total);
      const newTotal = total + 1;
      const newYesVotes = choice === "yes" ? yesVotes + 1 : yesVotes;
      const newYes = Math.max(1, Math.min(99, Math.round((newYesVotes / newTotal) * 100)));
      return { ...prev, [predId]: { yes: newYes, no: 100 - newYes } };
    });
  }, [PREDICTIONS]);

  const filteredCards = useMemo(() => {
    // When searching, use server results
    if (searchQuery.trim() && searchResults) {
      let result = searchResults.map((c) => {
        const ov = voteOverrides[c.id];
        if (ov) return { ...c, yes: ov.yes, no: ov.no };
        return c;
      });
      if (activeCategory !== "ALL") {
        result = result.filter((c) => c.category === activeCategory);
      }
      return result;
    }

    let result = PREDICTIONS.map((c) => {
      const ov = voteOverrides[c.id];
      if (ov) return { ...c, yes: ov.yes, no: ov.no };
      return c;
    });
    if (activeCategory !== "ALL") {
      result = result.filter((c) => c.category === activeCategory);
    }
    return result;
  }, [searchQuery, searchResults, activeCategory, PREDICTIONS, voteOverrides]);

  const { sentinelRef, visibleItems: visibleCards, hasMore, expandTo } = useInfiniteScroll(filteredCards, 10);

  // When shared param is present, ensure the card is visible and scroll to it
  useEffect(() => {
    if (!highlightedId || !filteredCards.length) return;
    const idx = filteredCards.findIndex((c) => String(c.id) === highlightedId);
    if (idx === -1) return;
    expandTo(idx);
    // Wait for DOM to render, then scroll
    requestAnimationFrame(() => {
      setTimeout(() => {
        document.getElementById(`pred-${highlightedId}`)?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 100);
    });
  }, [highlightedId, filteredCards]);

  const isFiltering = searchQuery || activeCategory !== "ALL";

  return (
    <Layout>
      {/* Section header */}
      <div className="bg-foreground text-background py-12 border-b border-border">
        <motion.div
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
        >
          <p
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700,
              fontSize: "0.68rem",
              textTransform: "uppercase",
              letterSpacing: "0.28em",
              color: "#DC143C",
              marginBottom: "0.5rem",
            }}
          >
            Predictions
          </p>
          <motion.h1
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 900,
              fontSize: "clamp(2rem, 5vw, 3.5rem)",
              textTransform: "uppercase",
              color: "var(--background)",
              letterSpacing: "-0.01em",
              lineHeight: 1.05,
              marginBottom: "0.5rem",
            }}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: EASE_OUT_EXPO, delay: 0.1 }}
          >
            {pageConfig?.hero?.titleLine1 || "What Do You Think"}<br />
            {pageConfig?.hero?.titleLine2 || "Actually Happens?"}<TitlePunctuation punctuations={pageConfig?.punctuations} />
          </motion.h1>
          <p
            className="text-text2"
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700,
              fontSize: "0.78rem",
              textTransform: "uppercase",
              letterSpacing: "0.18em",
            }}
          >
            {pageConfig?.hero?.subtitle || `${PREDICTIONS.length} predictions across ${PREDICTION_CATEGORIES.length} categories. Not what should happen. What will.`}
          </p>
        </motion.div>
      </div>

      {/* Stats bar */}
      <div
        style={{
          background: "#0D0D0D",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          padding: "0.65rem 0",
          display: "flex",
          alignItems: "center",
          gap: "2.5rem",
          justifyContent: "center",
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 700,
            fontSize: "0.72rem",
            textTransform: "uppercase",
            letterSpacing: "0.15em",
            color: "rgba(250,250,250,0.75)",
          }}
        >
          <span
            style={{
              color: "#DC143C",
              fontWeight: 900,
              fontSize: "0.85rem",
              marginRight: 6,
            }}
          >
            {PREDICTIONS.length}
          </span>{" "}
          Predictions
        </span>
        <span
          style={{ width: 1, height: 14, background: "rgba(255,255,255,0.1)" }}
        />
        <span
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 700,
            fontSize: "0.72rem",
            textTransform: "uppercase",
            letterSpacing: "0.15em",
            color: "rgba(250,250,250,0.75)",
          }}
        >
          <span
            style={{
              color: "#DC143C",
              fontWeight: 900,
              fontSize: "0.85rem",
              marginRight: 6,
            }}
          >
            {PREDICTION_CATEGORIES.length}
          </span>{" "}
          Categories
        </span>
        <span
          style={{ width: 1, height: 14, background: "rgba(255,255,255,0.1)" }}
        />
        <span
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 700,
            fontSize: "0.72rem",
            textTransform: "uppercase",
            letterSpacing: "0.15em",
            color: "rgba(250,250,250,0.75)",
          }}
        >
          <span
            style={{
              color: "#DC143C",
              fontWeight: 900,
              fontSize: "0.85rem",
              marginRight: 6,
            }}
          >
            19
          </span>{" "}
          Countries
        </span>
      </div>

      {/* Momentum ticker */}
      <MomentumTicker tickerData={tickerData} isLoading={isLoading} />

      {/* Content */}
      <div className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row gap-12">
          <FilterSidebar
            search={{
              value: searchQuery,
              onChange: (v) => {
                setSearchQuery(v);
                setActiveCategory("ALL");
              },
              placeholder: "Search predictions...",
            }}
            categories={{
              items: PREDICTION_CATEGORIES.map((cat) => ({
                key: cat,
                label: cat,
                count: PREDICTIONS.filter((p) => p.category === cat).length,
              })),
              activeKey: activeCategory,
              onSelect: (key) => {
                setActiveCategory(key);
                setSearchQuery("");
              },
              allLabel: "All",
              allCount: PREDICTIONS.length,
            }}
          />

          <div className="flex-1 min-w-0">
          {/* Loading skeletons */}
          {isLoading && PREDICTIONS.length === 0 && (
            <PredictionGridSkeleton />
          )}

          {/* Featured prediction */}
          {!isFiltering && PREDICTIONS.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.12 }}
              transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
            >
              <div className="mb-4">
                <p
                  style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontWeight: 700,
                    fontSize: "1.15rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.22em",
                    color: "var(--muted-foreground)",
                    marginBottom: "1rem",
                  }}
                >
                  Featured Prediction
                </p>
              </div>
              <FeaturedPrediction
                card={voteOverrides[PREDICTIONS[0].id] ? { ...PREDICTIONS[0], yes: voteOverrides[PREDICTIONS[0].id].yes, no: voteOverrides[PREDICTIONS[0].id].no } : PREDICTIONS[0]}
                onVote={handleVoteOverride}
              />
            </motion.div>
          )}

          {/* Grid */}
          <div className="mb-4 mt-12">
            <p
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 700,
                fontSize: "1.15rem",
                textTransform: "uppercase",
                letterSpacing: "0.22em",
                color: "var(--muted-foreground)",
                marginBottom: "1rem",
              }}
            >
              {isFiltering
                ? `${filteredCards.length} prediction${filteredCards.length !== 1 ? "s" : ""}${searchQuery ? ` for "${searchQuery}"` : ""}${activeCategory !== "ALL" ? ` in ${activeCategory}` : ""}`
                : `Active Predictions (${PREDICTIONS.length})${isLoading ? " — loading…" : ""}`}
            </p>
          </div>
          {isSearching ? (
            <div className="flex justify-center py-16">
              <LoadingDots text={`Searching for "${searchQuery}"`} />
            </div>
          ) : filteredCards.length === 0 ? (
            <div
              className="text-center py-16 border border-border border-dashed"
              style={{ background: "rgba(255,255,255,0.02)" }}
            >
              <p
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 800,
                  fontSize: "1.2rem",
                  textTransform: "uppercase",
                  color: "var(--foreground)",
                  marginBottom: 8,
                }}
              >
                No predictions found
              </p>
              <p
                style={{
                  fontFamily: "DM Sans, sans-serif",
                  fontSize: "0.85rem",
                  color: "var(--muted-foreground)",
                  marginBottom: 16,
                }}
              >
                Try a different search or category.
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setActiveCategory("ALL");
                }}
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 700,
                  fontSize: "0.72rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.15em",
                  color: "#DC143C",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <>
              <motion.div
                className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8"
                initial="hidden"
                animate="visible"
                variants={staggerContainer}
              >
                {visibleCards.map((card, index, arr) => {
                  const isLastOdd = index === arr.length - 1 && arr.length % 2 !== 0;
                  return (
                  <motion.div key={card.id} variants={staggerItem} className={isLastOdd ? "md:col-span-2 md:max-w-[calc(50%-0.625rem)] md:justify-self-center" : ""}>
                    <PredictionGridCard
                      card={card}
                      highlighted={highlightedId === String(card.id)}
                      onVote={handleVoteOverride}
                    />
                  </motion.div>
                  );
                })}
              </motion.div>
              {hasMore && (
                <div ref={sentinelRef} className="flex justify-center py-8">
                  <LoadingDots />
                </div>
              )}
            </>
          )}

          {!isFiltering && (
            <motion.div
              className="border-t border-border pt-12"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.1 }}
              transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
            >
              <div className="mb-6">
                <p
                  style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontWeight: 700,
                    fontSize: "1.15rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.22em",
                    color: "var(--muted-foreground)",
                    marginBottom: "0.25rem",
                  }}
                >
                  Closed Predictions
                </p>
                <p
                  style={{
                    fontFamily: "DM Sans, sans-serif",
                    fontSize: "0.85rem",
                    color: "var(--muted-foreground)",
                  }}
                >
                  The region made its call. Here's what happened.
                </p>
              </div>
              <ClosedPredictionCard />
            </motion.div>
          )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
