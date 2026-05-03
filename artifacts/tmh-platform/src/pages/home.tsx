import { useState, useEffect, useRef, useCallback, useMemo, lazy, Suspense } from "react";
import {
  useGetFeaturedPoll,
  useGetPoll,
  useListPolls,
  useListProfiles,
  useListCategories,
} from "@workspace/api-client-react";
import { Layout } from "@/components/layout/Layout";
import { PollCard } from "@/components/poll/PollCard";
import { ProfileCard } from "@/components/profile/ProfileCard";
import { TickerSkeleton } from "@/components/skeletons/TickerSkeleton";
import { HeroGallery } from "@/components/home/HeroGallery";
const AboutSection = lazy(() => import("@/components/home/AboutSection"));
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { ArrowRight, Share2, Lock, Mail, CheckCircle2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import {
  motion,
  AnimatePresence,
  useInView,
  useScroll,
  useTransform,
  useReducedMotion,
} from "motion/react";

// ── Animation utilities ──────────────────────────────────────────────────────
const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

function FadeUp({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.12 });
  const prefersReduced = useReducedMotion();
  if (prefersReduced)
    return (
      <div ref={ref} className={className}>
        {children}
      </div>
    );
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 28 }}
      transition={{ duration: 0.6, ease: EASE_OUT_EXPO, delay }}
    >
      {children}
    </motion.div>
  );
}

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};
const staggerItem = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: EASE_OUT_EXPO },
  },
};

function StaggerGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.08 });
  const prefersReduced = useReducedMotion();
  if (prefersReduced)
    return (
      <div ref={ref} className={className}>
        {children}
      </div>
    );
  return (
    <motion.div
      ref={ref}
      className={className}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={staggerContainer}
    >
      {children}
    </motion.div>
  );
}

function SlideReveal({
  color = "currentColor",
  height = 4,
  className,
  delay = 0,
  duration = 0.7,
}: {
  color?: string;
  height?: number;
  className?: string;
  delay?: number;
  duration?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const prefersReduced = useReducedMotion();
  if (prefersReduced)
    return (
      <div
        ref={ref}
        className={className}
        style={{ height, background: color, width: "100%" }}
      />
    );
  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ height, background: color, originX: 0 }}
      initial={{ scaleX: 0 }}
      animate={inView ? { scaleX: 1 } : { scaleX: 0 }}
      transition={{ duration, ease: EASE_OUT_EXPO, delay }}
    />
  );
}

function CountUp({
  value,
  duration = 1.2,
  className,
  style,
}: {
  value: string;
  duration?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const prefersReduced = useReducedMotion();
  const [display, setDisplay] = useState(prefersReduced ? value : "0");

  useEffect(() => {
    if (!inView || prefersReduced) {
      if (prefersReduced) setDisplay(value);
      return;
    }
    const numeric = parseFloat(value.replace(/[^0-9.]/g, ""));
    if (isNaN(numeric)) {
      setDisplay(value);
      return;
    }
    const startTime = performance.now();
    const durationMs = duration * 1000;
    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      const current = Math.round(eased * numeric);
      setDisplay(current.toLocaleString());
      if (progress < 1) requestAnimationFrame(step);
      else setDisplay(value);
    };
    requestAnimationFrame(step);
  }, [inView, value, duration, prefersReduced]);

  return (
    <span ref={ref} className={className} style={style}>
      {display}
    </span>
  );
}

function FadeIn({
  children,
  delay = 0,
  className,
  direction = "up",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  direction?: "up" | "left" | "right" | "none";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.12 });
  const prefersReduced = useReducedMotion();
  if (prefersReduced)
    return (
      <div ref={ref} className={className}>
        {children}
      </div>
    );
  const offsets = {
    up: { y: 20, x: 0 },
    left: { y: 0, x: -30 },
    right: { y: 0, x: 30 },
    none: { y: 0, x: 0 },
  };
  const { x, y } = offsets[direction];
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, x, y }}
      animate={inView ? { opacity: 1, x: 0, y: 0 } : { opacity: 0, x, y }}
      transition={{ duration: 0.6, ease: EASE_OUT_EXPO, delay }}
    >
      {children}
    </motion.div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

import { LiveNumber } from "@/components/live-counter/FlipDigit";
import {
  PREDICTIONS as FALLBACK_PREDICTIONS,
  type PredictionCard,
} from "@/data/predictions-data";
import {
  usePredictions,
  usePulseTopics,
  useHomepageConfig,
  useLiveCounts,
  useSiteSettings,
  type ApiPrediction,
} from "@/hooks/use-cms-data";
import { usePageTitle } from "@/hooks/use-page-title";

function apiToPredCard(p: ApiPrediction): PredictionCard {
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

async function copyText(text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {}
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.cssText = "position:fixed;top:-9999px;left:-9999px;opacity:0";
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

function ShareMenu({
  title,
  shareUrl,
  color = "#3B82F6",
  onUnlock,
}: {
  title: string;
  shareUrl: string;
  color?: string;
  onUnlock?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const doShare = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
    onUnlock?.();
    setOpen(false);
  };

  const handleToggleMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(!open);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleToggleMenu}
        className="p-1.5 rounded-sm transition-colors hover:bg-white/10"
        style={{ color }}
        title="Share"
      >
        <Share2 className="w-3.5 h-3.5" />
      </button>
      {open && (
        <div
          className="absolute right-0 top-full mt-1 z-50 bg-card border border-border rounded-sm shadow-xl p-2 min-w-[160px]"
          style={{ animation: "gateSlideIn 0.2s ease-out" }}
        >
          <button
            onClick={() =>
              doShare(
                `https://wa.me/?text=${encodeURIComponent(`${title} — ${shareUrl}`)}`,
              )
            }
            className="w-full text-left px-3 py-2 text-[11px] font-serif uppercase tracking-wider hover:bg-white/5 rounded-sm flex items-center gap-2"
          >
            <span className="text-[#25D366]">●</span> WhatsApp
          </button>
          <button
            onClick={() =>
              doShare(
                `https://x.com/intent/tweet?text=${encodeURIComponent(`"${title}" — The Tribunal`)}&url=${encodeURIComponent(shareUrl)}`,
              )
            }
            className="w-full text-left px-3 py-2 text-[11px] font-serif uppercase tracking-wider hover:bg-white/5 rounded-sm flex items-center gap-2"
          >
            <span className="text-foreground">●</span> X / Twitter
          </button>
          <button
            onClick={() =>
              doShare(
                `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
              )
            }
            className="w-full text-left px-3 py-2 text-[11px] font-serif uppercase tracking-wider hover:bg-white/5 rounded-sm flex items-center gap-2"
          >
            <span className="text-[#0A66C2]">●</span> LinkedIn
          </button>
          <button
            onClick={() =>
              doShare(
                `https://www.instagram.com/`,
              )
            }
            className="w-full text-left px-3 py-2 text-[11px] font-serif uppercase tracking-wider hover:bg-white/5 rounded-sm flex items-center gap-2"
          >
            <span className="text-[#E4405F]">●</span> Instagram
          </button>
          <div className="border-t border-border mt-1 pt-1">
            <button
              onClick={async () => {
                const ok = await copyText(shareUrl);
                setCopied(ok);
                onUnlock?.();
                setTimeout(() => {
                  setCopied(false);
                  setOpen(false);
                }, 1500);
              }}
              className="w-full text-left px-3 py-2 text-[11px] font-serif uppercase tracking-wider hover:bg-white/5 rounded-sm flex items-center gap-2"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="w-3 h-3 text-[#10B981]" /> Copied!
                </>
              ) : (
                <>
                  <span className="text-muted-foreground">●</span> Copy Link
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

type PredPhase = "vote" | "gate" | "locked";

function getPredPhase(predId: number): PredPhase {
  if (typeof window === "undefined") return "vote";
  const voted = localStorage.getItem(`tmh_pred_${predId}`);
  if (!voted) return "vote";
  const unlocked =
    localStorage.getItem("tmh_email_submitted") ||
    localStorage.getItem(`tmh_pred_unlocked_${predId}`);
  return unlocked ? "locked" : "gate";
}

function getPredVote(predId: number): "yes" | "no" | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(`tmh_pred_${predId}`) as "yes" | "no" | null;
}

const MENA_POP_BASE_DEFAULT = 541_000_000;
const MENA_POP_BASE_DATE = new Date("2026-01-01T00:00:00Z").getTime();
const MENA_GROWTH_RATE_DEFAULT = 0.0156;

function usePopulationCounter(
  basePopulation?: number,
  growthRatePercent?: number,
) {
  const base = basePopulation ?? MENA_POP_BASE_DEFAULT;
  const rate =
    growthRatePercent != null
      ? growthRatePercent / 100
      : MENA_GROWTH_RATE_DEFAULT;
  const perMs = (base * rate) / (365.25 * 24 * 60 * 60 * 1000);
  const calcPop = useCallback(() => {
    const elapsed = Date.now() - MENA_POP_BASE_DATE;
    return Math.floor(base + elapsed * perMs);
  }, [base, perMs]);
  const [pop, setPop] = useState(calcPop);
  useEffect(() => {
    const id = setInterval(() => setPop(calcPop()), 1000);
    return () => clearInterval(id);
  }, [calcPop]);
  return pop;
}

const FLAG_MAP: Record<string, string> = {
  AE: "🇦🇪",
  SA: "🇸🇦",
  EG: "🇪🇬",
  JO: "🇯🇴",
  LB: "🇱🇧",
  KW: "🇰🇼",
  BH: "🇧🇭",
  QA: "🇶🇦",
  OM: "🇴🇲",
  MA: "🇲🇦",
  TN: "🇹🇳",
  IQ: "🇮🇶",
  PS: "🇵🇸",
  TR: "🇹🇷",
  US: "🇺🇸",
  GB: "🇬🇧",
  DE: "🇩🇪",
  IN: "🇮🇳",
  AU: "🇦🇺",
};

interface ActivityItem {
  countryCode: string | null;
  countryName: string | null;
  pollId: number;
  questionSnippet: string;
  secondsAgo: number;
}

function formatSecondsAgo(s: number): string {
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function LiveActivity() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [tick, setTick] = useState(0);
  const { t } = useI18n();

  useEffect(() => {
    const baseUrl = import.meta.env?.VITE_API_BASE_URL ?? "";
    const fetchActivity = () => {
      fetch(`${baseUrl}/api/activity`)
        .then((r) => r.json())
        .then((d) => {
          if (d.activity?.length) setItems(d.activity);
        })
        .catch(() => {});
    };
    fetchActivity();
    const refresh = setInterval(fetchActivity, 30000);
    return () => clearInterval(refresh);
  }, []);

  useEffect(() => {
    if (items.length <= 1) return;
    const id = setInterval(() => {
      setTick((t) => t + 1);
      setActiveIdx((i) => (i + 1) % Math.min(items.length, 5));
    }, 4000);
    return () => clearInterval(id);
  }, [items.length]);

  if (items.length === 0) return null;

  const item = items[activeIdx];

  return (
    <section className="py-10 bg-secondary/20 border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 mb-4">
          <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse flex-shrink-0" />
          <p className="text-[9px] uppercase tracking-[0.3em] font-bold text-muted-foreground font-serif">
            {t("Live Activity")}
          </p>
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={`${activeIdx}-${tick}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
          >
            <Link href={`/debates/${item.pollId}`} className="group block">
              <p className="font-sans text-sm text-foreground/80 leading-relaxed group-hover:text-foreground transition-colors">
                <span className="mr-2">
                  {FLAG_MAP[item.countryCode ?? ""] ?? "🌍"}
                </span>
                <span className="text-muted-foreground">Someone from </span>
                <span className="font-bold text-foreground">
                  {item.countryName ?? item.countryCode ?? "the region"}
                </span>
                <span className="text-muted-foreground"> just voted on </span>
                <span className="text-primary font-bold group-hover:underline">
                  "{item.questionSnippet}"
                </span>
                <span className="text-muted-foreground text-[11px] ml-2">
                  · {formatSecondsAgo(item.secondsAgo)}
                </span>
              </p>
            </Link>
          </motion.div>
        </AnimatePresence>
        {items.length > 1 && (
          <div className="flex gap-1.5 mt-4">
            {Array.from({ length: Math.min(items.length, 5) }).map((_, i) => (
              <motion.button
                key={i}
                onClick={() => setActiveIdx(i)}
                className={cn(
                  "h-0.5",
                  i === activeIdx
                    ? "bg-primary"
                    : "bg-border hover:bg-foreground/40",
                )}
                animate={{ width: i === activeIdx ? 24 : 12 }}
                transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}
                whileTap={{ scale: 0.85 }}
                aria-label={`Activity ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

interface FeaturedPredProps {
  featured: PredictionCard;
  chartW: number;
  chartH: number;
  padL: number;
  padR: number;
  padT: number;
  padB: number;
  plotW: number;
  plotH: number;
  toX: (i: number) => number;
  toY: (v: number) => number;
  yesPoints: string;
  noPoints: string;
  yesArea: string;
  months: string[];
}

function FeaturedPredictionCard({
  featured,
  chartW,
  chartH,
  padL,
  padR,
  padT,
  padB,
  plotW,
  plotH,
  toX,
  toY,
  yesPoints,
  noPoints,
  yesArea,
  months,
}: FeaturedPredProps) {
  const [phase, setPhase] = useState<PredPhase>(() =>
    getPredPhase(featured.id),
  );
  const [vote, setVote] = useState<"yes" | "no" | null>(() =>
    getPredVote(featured.id),
  );
  const [email, setEmail] = useState("");
  const [emailDone, setEmailDone] = useState(false);
  const [newsletterOptIn, setNewsletterOptIn] = useState(true);
  const [hovIdx, setHovIdx] = useState<number | null>(null);
  const predUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/predictions`;

  // Re-sync vote/phase from localStorage when the prediction ID changes
  // (e.g. fallback → API data swap)
  useEffect(() => {
    setVote(getPredVote(featured.id));
    setPhase(getPredPhase(featured.id));
  }, [featured.id]);

  const handleVote = (choice: "yes" | "no") => {
    if (vote) return;
    setVote(choice);
    localStorage.setItem(`tmh_pred_${featured.id}`, choice);
    let token = localStorage.getItem("tmh_voter_token");
    if (!token) {
      token = crypto.randomUUID();
      localStorage.setItem("tmh_voter_token", token);
    }
    fetch(`/api/predictions/${featured.id}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ choice, voterToken: token }),
    }).catch(() => {});
    const alreadyUnlocked =
      localStorage.getItem("tmh_email_submitted") ||
      localStorage.getItem(`tmh_pred_unlocked_${featured.id}`);
    setTimeout(() => {
      if (alreadyUnlocked) {
        localStorage.setItem(`tmh_pred_unlocked_${featured.id}`, "true");
        setPhase("locked");
      } else {
        setPhase("gate");
      }
    }, 400);
  };

  const unlock = () => {
    localStorage.setItem(`tmh_pred_unlocked_${featured.id}`, "true");
    setPhase("locked");
  };

  const handleEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setEmailDone(true);
    localStorage.setItem("tmh_email_submitted", "true");
    fetch("/api/email-subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), source: "prediction_gate", newsletterOptIn }),
    }).catch(() => {});
    setTimeout(unlock, 800);
  };

  const noData = featured.data.map((v) => 100 - v);

  return (
    <div
      className="bg-card border border-border rounded-[4px] flex flex-col lg:flex-row gap-0 overflow-hidden"
      style={{ borderWidth: "1.5px" }}
    >
      <div className="flex-1 p-5">
        <p className="text-[9px] uppercase tracking-[0.15em] font-bold text-muted-foreground font-serif mb-2">
          Confidence Over Time — Yes %
        </p>
        <svg
          viewBox={`0 0 ${chartW} ${chartH}`}
          className="w-full"
          style={{ maxHeight: 160 }}
          onMouseLeave={() => setHovIdx(null)}
        >
          <defs>
            <linearGradient id="homeYesGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {[0, 25, 50, 75, 100].map((v) => (
            <g key={v}>
              <line
                x1={padL}
                x2={chartW - padR}
                y1={toY(v)}
                y2={toY(v)}
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="0.5"
              />
              <text
                x={padL - 4}
                y={toY(v) + 3}
                fill="rgba(255,255,255,0.25)"
                fontSize="6"
                textAnchor="end"
                fontFamily="'Barlow Condensed', sans-serif"
              >
                {v}
              </text>
            </g>
          ))}
          {featured.data.map((_, i) => {
            if (i % 3 !== 0 && i !== featured.data.length - 1) return null;
            const mi = i < months.length ? i : i % months.length;
            return (
              <text
                key={i}
                x={toX(i)}
                y={chartH - 4}
                fill="rgba(255,255,255,0.3)"
                fontSize="5.5"
                textAnchor="middle"
                fontFamily="'Barlow Condensed', sans-serif"
              >
                {months[mi]}
              </text>
            );
          })}
          <line
            x1={padL}
            x2={chartW - padR}
            y1={toY(50)}
            y2={toY(50)}
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="0.5"
            strokeDasharray="3,2"
          />
          <path d={yesArea} fill="url(#homeYesGrad)" />
          <polyline
            points={yesPoints}
            fill="none"
            stroke="#10B981"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <polyline
            points={noPoints}
            fill="none"
            stroke="#DC143C"
            strokeWidth="1.2"
            strokeLinejoin="round"
            opacity="0.7"
          />
          {hovIdx !== null && (
            <line
              x1={toX(hovIdx)}
              y1={padT}
              x2={toX(hovIdx)}
              y2={padT + plotH}
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="0.5"
            />
          )}
          {featured.data.map((v, i) => (
            <circle
              key={`yc${i}`}
              cx={toX(i)}
              cy={toY(v)}
              r={hovIdx === i ? 3 : 0}
              fill="#10B981"
              style={{ transition: "r 0.15s" }}
            />
          ))}
          {noData.map((v, i) => (
            <circle
              key={`nc${i}`}
              cx={toX(i)}
              cy={toY(v)}
              r={hovIdx === i ? 2.5 : 0}
              fill="#DC143C"
              style={{ transition: "r 0.15s" }}
            />
          ))}
          <circle
            cx={toX(featured.data.length - 1)}
            cy={toY(featured.data[featured.data.length - 1])}
            r="2.5"
            fill="#10B981"
          />
          <circle
            cx={toX(featured.data.length - 1)}
            cy={toY(noData[noData.length - 1])}
            r="2"
            fill="#DC143C"
          />
          {hovIdx === null && (
            <text
              x={toX(featured.data.length - 1) + 1}
              y={toY(featured.data[featured.data.length - 1]) - 4}
              fill="#10B981"
              fontSize="6"
              fontWeight="700"
              fontFamily="'Barlow Condensed', sans-serif"
            >
              {featured.data[featured.data.length - 1]}%
            </text>
          )}
          {featured.data.map((_, i) => {
            const slotW = plotW / (featured.data.length - 1);
            return (
              <rect
                key={`hit${i}`}
                x={toX(i) - slotW / 2}
                y={padT}
                width={slotW}
                height={plotH}
                fill="transparent"
                onMouseEnter={() => setHovIdx(i)}
              />
            );
          })}
          {hovIdx !== null &&
            (() => {
              const yVal = featured.data[hovIdx];
              const prev = hovIdx > 0 ? featured.data[hovIdx - 1] : yVal;
              const delta = yVal - prev;
              const tipW = 72;
              const tipH = 30;
              let tipX = toX(hovIdx) + 6;
              if (tipX + tipW > chartW - padR) tipX = toX(hovIdx) - tipW - 6;
              const tipY = Math.max(padT, toY(yVal) - tipH / 2);
              return (
                <g>
                  <rect
                    x={tipX}
                    y={tipY}
                    width={tipW}
                    height={tipH}
                    rx="2"
                    fill="rgba(30,30,30,0.92)"
                    stroke="rgba(255,255,255,0.15)"
                    strokeWidth="0.5"
                  />
                  <text
                    x={tipX + 4}
                    y={tipY + 9}
                    fill="rgba(255,255,255,0.6)"
                    fontSize="5.5"
                    fontFamily="'Barlow Condensed', sans-serif"
                  >
                    {months[hovIdx % 12]} 2026
                  </text>
                  <text
                    x={tipX + 4}
                    y={tipY + 18}
                    fill="#10B981"
                    fontSize="7"
                    fontWeight="700"
                    fontFamily="'Barlow Condensed', sans-serif"
                  >
                    {yVal}% YES
                  </text>
                  <text
                    x={tipX + 4}
                    y={tipY + 26}
                    fill={delta >= 0 ? "#10B981" : "#DC143C"}
                    fontSize="5.5"
                    fontFamily="'Barlow Condensed', sans-serif"
                  >
                    {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}% vs
                    last month
                  </text>
                </g>
              );
            })()}
        </svg>
        <p className="text-[9px] font-serif mt-2" style={{ color: "#10B981" }}>
          {featured.up ? "▲" : "▼"} Confidence moved {featured.up ? "+" : "-"}
          {featured.momentum}% in the last 30 days
        </p>
      </div>
      <div className="flex-1 p-5 border-t lg:border-t-0 lg:border-l border-border flex flex-col justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className="px-3 py-1 bg-foreground text-background text-[13px] font-bold uppercase tracking-[0.16em] font-serif">
              {featured.category}
            </span>
            <span
              className="px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.1em] font-serif rounded-sm"
              style={{
                background: "rgba(59,130,246,0.15)",
                border: "1px solid rgba(59,130,246,0.3)",
                color: "#3B82F6",
              }}
            >
              Resolves: {featured.resolves}
            </span>
            <ShareMenu
              title={featured.question}
              shareUrl={predUrl}
              color="#3B82F6"
              onUnlock={phase === "gate" ? unlock : undefined}
            />
          </div>
          <Link href="/predictions">
            <p
              className="font-serif font-black uppercase text-[15px] leading-tight text-foreground tracking-tight cursor-pointer hover:text-primary transition-colors"
              style={{ lineHeight: 1.15 }}
            >
              {featured.question}
            </p>
          </Link>
          <p className="text-[10px] text-muted-foreground font-serif mt-2">
            {featured.count} predictions locked in
          </p>
        </div>

        <AnimatePresence mode="wait">
          {phase === "vote" && (
            <motion.div
              key="pred-vote"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="space-y-2 mb-3">
                <div>
                  <div className="flex justify-between mb-1">
                    <span
                      className="text-[10px] uppercase tracking-[0.15em] font-bold font-serif"
                      style={{ color: "#10B981" }}
                    >
                      Yes
                    </span>
                    <span
                      className="text-[10px] font-bold font-serif"
                      style={{ color: "#10B981" }}
                    >
                      {featured.yes}%
                    </span>
                  </div>
                  <div
                    className="h-3 rounded-sm overflow-hidden"
                    style={{ background: "rgba(255,255,255,0.06)" }}
                  >
                    <div
                      className="h-full rounded-sm"
                      style={{
                        width: `${featured.yes}%`,
                        background: "#10B981",
                      }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span
                      className="text-[10px] uppercase tracking-[0.15em] font-bold font-serif"
                      style={{ color: "#DC143C" }}
                    >
                      No
                    </span>
                    <span
                      className="text-[10px] font-bold font-serif"
                      style={{ color: "#DC143C" }}
                    >
                      {featured.no}%
                    </span>
                  </div>
                  <div
                    className="h-3 rounded-sm overflow-hidden"
                    style={{ background: "rgba(255,255,255,0.06)" }}
                  >
                    <div
                      className="h-full rounded-sm"
                      style={{
                        width: `${featured.no}%`,
                        background: "#DC143C",
                      }}
                    />
                  </div>
                </div>
              </div>
              <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-serif mb-2 font-bold">
                Lock your prediction
              </p>
              <div className="flex gap-2">
                <motion.button
                  onClick={() => handleVote("yes")}
                  whileTap={{ scale: 0.97 }}
                  className="flex-1 py-2.5 border font-bold text-[11px] uppercase tracking-[0.12em] font-serif transition-colors duration-150 hover:bg-[#10B981] hover:border-[#10B981]"
                  style={{ borderColor: "#10B981", color: "#10B981" }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "#fff"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "#10B981"; }}
                >
                  Yes
                </motion.button>
                <motion.button
                  onClick={() => handleVote("no")}
                  whileTap={{ scale: 0.97 }}
                  className="flex-1 py-2.5 border font-bold text-[11px] uppercase tracking-[0.12em] font-serif transition-colors duration-150 hover:bg-[#DC143C] hover:border-[#DC143C]"
                  style={{ borderColor: "#DC143C", color: "#DC143C" }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "#fff"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "#DC143C"; }}
                >
                  No
                </motion.button>
              </div>
            </motion.div>
          )}

          {phase === "gate" && (
            <motion.div
              key="pred-gate"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="tmh-gate-card"
            >
              <div className="bg-background/50 border border-border p-4 rounded-sm space-y-3">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-[#3B82F6] font-serif">
                  <Lock className="w-3.5 h-3.5" />
                  Prediction locked — {vote?.toUpperCase()}
                </div>
                <p className="text-[10px] text-muted-foreground font-serif">
                  Share to see full confidence breakdown, or enter your email:
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      window.open(
                        `https://wa.me/?text=${encodeURIComponent(`${featured.question} — Lock your prediction: ${predUrl}`)}`,
                        "_blank",
                      );
                      setTimeout(unlock, 800);
                    }}
                    className="flex-1 py-2 bg-[#25D366] text-white text-[10px] font-bold uppercase tracking-wider font-serif rounded-sm hover:opacity-90 transition-opacity"
                  >
                    WhatsApp
                  </button>
                  <button
                    onClick={() => {
                      window.open(
                        `https://x.com/intent/tweet?text=${encodeURIComponent(`"${featured.question}" — The Tribunal`)}&url=${encodeURIComponent(predUrl)}`,
                        "_blank",
                      );
                      setTimeout(unlock, 800);
                    }}
                    className="flex-1 py-2 bg-foreground text-background text-[10px] font-bold uppercase tracking-wider font-serif rounded-sm hover:opacity-90 transition-opacity"
                  >
                    X
                  </button>
                  <button
                    onClick={() => {
                      window.open(
                        `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(predUrl)}`,
                        "_blank",
                      );
                      setTimeout(unlock, 800);
                    }}
                    className="flex-1 py-2 bg-[#0A66C2] text-white text-[10px] font-bold uppercase tracking-wider font-serif rounded-sm hover:opacity-90 transition-opacity"
                  >
                    LinkedIn
                  </button>
                </div>
                <div className="border-t border-border pt-3">
                  <form onSubmit={handleEmail} className="flex gap-2">
                    <div className="flex-1 flex items-center gap-2 border border-border px-3 py-2 bg-background rounded-sm">
                      <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="bg-transparent text-[11px] font-sans text-foreground outline-none flex-1 placeholder:text-muted-foreground/50"
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-3 py-2 bg-[#3B82F6] text-white text-[10px] font-bold uppercase tracking-wider font-serif rounded-sm hover:opacity-90 transition-opacity"
                    >
                      {emailDone ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        "Unlock"
                      )}
                    </button>
                  </form>
                  <label className="flex items-center gap-2 cursor-pointer select-none mt-2">
                    <input
                      type="checkbox"
                      checked={newsletterOptIn}
                      onChange={e => setNewsletterOptIn(e.target.checked)}
                      className="w-3 h-3 rounded-sm accent-[#3B82F6] cursor-pointer"
                    />
                    <span className="text-[9px] text-muted-foreground font-sans">
                      Send me The Tribunal newsletter
                    </span>
                  </label>
                </div>
              </div>
            </motion.div>
          )}

          {phase === "locked" && (
            <motion.div
              key="pred-locked"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <div className="space-y-2 mb-3">
                <div>
                  <div className="flex justify-between mb-1">
                    <span
                      className="text-[10px] uppercase tracking-[0.15em] font-bold font-serif"
                      style={{ color: "#10B981" }}
                    >
                      Yes
                    </span>
                    <span
                      className="text-[10px] font-bold font-serif"
                      style={{ color: "#10B981" }}
                    >
                      {featured.yes}%
                    </span>
                  </div>
                  <div
                    className="h-3 rounded-sm overflow-hidden"
                    style={{ background: "rgba(255,255,255,0.06)" }}
                  >
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${featured.yes}%` }}
                      transition={{ duration: 0.6 }}
                      className="h-full rounded-sm"
                      style={{ background: "#10B981" }}
                    />
                  </div>
                  <p className="text-[8px] text-muted-foreground font-serif mt-0.5">
                    {featured.up ? "▲" : "▼"} Up {featured.momentum}% this week
                  </p>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span
                      className="text-[10px] uppercase tracking-[0.15em] font-bold font-serif"
                      style={{ color: "#DC143C" }}
                    >
                      No
                    </span>
                    <span
                      className="text-[10px] font-bold font-serif"
                      style={{ color: "#DC143C" }}
                    >
                      {featured.no}%
                    </span>
                  </div>
                  <div
                    className="h-3 rounded-sm overflow-hidden"
                    style={{ background: "rgba(255,255,255,0.06)" }}
                  >
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${featured.no}%` }}
                      transition={{ duration: 0.6, delay: 0.1 }}
                      className="h-full rounded-sm"
                      style={{ background: "#DC143C" }}
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <span className="w-2 h-2 rounded-full bg-[#3B82F6] animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#3B82F6] font-serif">
                  ✓ You predicted {vote?.toUpperCase()} — Locked until{" "}
                  {featured.resolves}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <Link
                  href="/predictions"
                  className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground font-serif transition-colors flex items-center gap-1"
                >
                  More Predictions <ArrowRight className="w-3 h-3" />
                </Link>
                <ShareMenu
                  title={featured.question}
                  shareUrl={predUrl}
                  color="#3B82F6"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function SidebarPredictionItem({
  pred,
  sideVote: initialVote,
  sidePhase: initialPhase,
}: {
  pred: PredictionCard;
  sideVote: "yes" | "no" | null;
  sidePhase: PredPhase;
}) {
  const [vote, setVote] = useState(initialVote);
  const [phase, setPhase] = useState(initialPhase);
  const predUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/predictions`;

  useEffect(() => {
    setVote(getPredVote(pred.id));
    setPhase(getPredPhase(pred.id));
  }, [pred.id]);

  const handleQuickVote = (choice: "yes" | "no", e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (vote) return;
    setVote(choice);
    localStorage.setItem(`tmh_pred_${pred.id}`, choice);
    let token = localStorage.getItem("tmh_voter_token");
    if (!token) {
      token = crypto.randomUUID();
      localStorage.setItem("tmh_voter_token", token);
    }
    fetch(`/api/predictions/${pred.id}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ choice, voterToken: token }),
    }).catch(() => {});
    const unlocked =
      localStorage.getItem("tmh_email_submitted") ||
      localStorage.getItem(`tmh_pred_unlocked_${pred.id}`);
    if (unlocked) {
      localStorage.setItem(`tmh_pred_unlocked_${pred.id}`, "true");
      setPhase("locked");
    } else {
      setPhase("locked");
      localStorage.setItem(`tmh_pred_unlocked_${pred.id}`, "true");
    }
  };

  return (
    <Link href={`/predictions/${pred.id}`}>
      <motion.div
        className="py-3 border-b border-border group cursor-pointer"
        whileHover={{ x: 4 }}
        transition={{ duration: 0.2, ease: EASE_OUT_EXPO }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] uppercase tracking-widest text-[#3B82F6] font-serif font-bold">
              {pred.category}
            </p>
            <p className="font-serif font-black uppercase text-[12px] leading-tight text-foreground mt-1 group-hover:text-primary transition-colors">
              {pred.question.length > 70
                ? pred.question.slice(0, 70) + "…"
                : pred.question}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <div className="flex-shrink-0 w-16 h-8">
              <svg
                viewBox="0 0 60 24"
                className="w-full h-full"
                preserveAspectRatio="none"
              >
                <polyline
                  points={pred.data
                    .map(
                      (v, i) =>
                        `${(i / (pred.data.length - 1)) * 60},${24 - (v / 100) * 20}`,
                    )
                    .join(" ")}
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
                <polyline
                  points={pred.data
                    .map(
                      (v, i) =>
                        `${(i / (pred.data.length - 1)) * 60},${24 - ((100 - v) / 100) * 20}`,
                    )
                    .join(" ")}
                  fill="none"
                  stroke="#DC143C"
                  strokeWidth="1"
                  opacity="0.6"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <ShareMenu title={pred.question} shareUrl={predUrl} color="#3B82F6" />
          </div>
        </div>
        <div className="flex items-center gap-3 mt-1.5">
          <span
            className="text-[9px] font-bold font-serif"
            style={{ color: "#10B981" }}
          >
            Yes {pred.yes}%
          </span>
          <span
            className="text-[9px] font-bold font-serif"
            style={{ color: "#DC143C" }}
          >
            No {pred.no}%
          </span>
          {vote ? (
            <span className="text-[8px] font-bold font-serif ml-auto text-[#3B82F6]">
              ✓ {vote.toUpperCase()}
            </span>
          ) : (
            <span className="ml-auto flex gap-1">
              <motion.button
                onClick={(e) => handleQuickVote("yes", e)}
                whileTap={{ scale: 0.93 }}
                className="px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider font-serif border border-[#10B981]/40 text-[#10B981] hover:bg-[#10B981] hover:text-white transition-colors rounded-sm"
              >
                Y
              </motion.button>
              <motion.button
                onClick={(e) => handleQuickVote("no", e)}
                whileTap={{ scale: 0.93 }}
                className="px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider font-serif border border-[#DC143C]/40 text-[#DC143C] hover:bg-[#DC143C] hover:text-white transition-colors rounded-sm"
              >
                N
              </motion.button>
            </span>
          )}
        </div>
      </motion.div>
    </Link>
  );
}

export default function Home() {
  usePageTitle({
    description: "The voice of 541 million. Real debates, predictions, and voices from across MENA.",
  });
  // Fetch homepage CMS config first (needed for content selection)
  const { data: homepageConfig } = useHomepageConfig<{
    masthead?: { basePopulation?: number; growthRate?: number; countries?: string[] };
    populationBase?: number;
    populationBaseDate?: string;
    growthRate?: number;
    sectionStats?: {
      debates?: string;
      predictions?: string;
      pulse?: string;
      voices?: string;
    };
    sections?: Array<{ id: string; type: string; config: Record<string, unknown> }>;
  }>();

  // Extract CMS-selected content IDs
  const cmsSelectedDebateId = homepageConfig?.sections?.find(s => s.type === "lead_debate")?.config?.selectedDebateId as number | undefined;

  // Lead debate: use CMS-selected debate if set, otherwise fall back to featured
  const { data: defaultFeaturedPoll, isLoading: defaultFeaturedLoading } =
    useGetFeaturedPoll();
  const { data: cmsSelectedPoll, isLoading: cmsSelectedLoading } = useGetPoll(
    cmsSelectedDebateId ?? 0,
    { query: { enabled: !!cmsSelectedDebateId } as any },
  );
  const featuredPoll = cmsSelectedPoll ?? defaultFeaturedPoll;
  const featuredLoading = cmsSelectedDebateId ? cmsSelectedLoading : defaultFeaturedLoading;

  const { data: trendingPolls, isLoading: trendingLoading } = useListPolls({
    filter: "trending",
    limit: 5,
  });
  const { data: featuredProfiles, isLoading: profilesLoading } =
    useListProfiles({ filter: "featured", limit: 8 });
  const { data: categories } = useListCategories();
  const { data: apiPredictions, isLoading: predictionsLoading } = usePredictions();
  const { data: apiPulseTopics, isLoading: pulseLoading } = usePulseTopics();
  const { data: liveCounts } = useLiveCounts();
  const { data: siteSettings } = useSiteSettings();
  const majlisEnabled = siteSettings?.featureToggles?.majlis?.enabled ?? false;
  const voicesEnabled = siteSettings?.featureToggles?.voices?.enabled ?? true;
  const [ctaEmail, setCtaEmail] = useState("");
  const [ctaJoined, setCtaJoined] = useState(
    () => !!localStorage.getItem("tmh_cta_joined"),
  );
  const [pulseHovIdx, setPulseHovIdx] = useState<number | null>(null);
  const [astTime, setAstTime] = useState(() => {
    const now = new Date();
    return now.toLocaleTimeString("en-US", { timeZone: "Asia/Riyadh", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
  });
  useEffect(() => {
    const id = setInterval(() => {
      const now = new Date();
      setAstTime(now.toLocaleTimeString("en-US", { timeZone: "Asia/Riyadh", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true }));
    }, 1000);
    return () => clearInterval(id);
  }, []);
  const menaPop = usePopulationCounter(
    homepageConfig?.masthead?.basePopulation,
    homepageConfig?.masthead?.growthRate,
  );
  const { t, isAr } = useI18n();
  const prefersReducedMotion = useReducedMotion();
  const mastheadRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: mastheadProgress } = useScroll({
    target: mastheadRef,
    offset: ["start start", "end start"],
  });
  const mastheadBgY = useTransform(mastheadProgress, [0, 1], ["0%", "30%"]);

  const PREDICTIONS: PredictionCard[] = useMemo(() => {
    if (apiPredictions?.items?.length)
      return apiPredictions.items.map(apiToPredCard);
    return FALLBACK_PREDICTIONS;
  }, [apiPredictions]);

  const handleCtaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ctaEmail.trim()) return;
    localStorage.setItem("tmh_cta_joined", ctaEmail);
    setCtaJoined(true);
  };

  const tickerPolls = trendingPolls?.polls ?? [];
  const debateItems = tickerPolls.slice(0, 8).map((p) => ({
    topic:
      p.question?.length > 38
        ? p.question.substring(0, 36) + "…"
        : (p.question ?? "Debate"),
    badge: "DEBATE" as const,
    stat: `${(p.totalVotes ?? 0).toLocaleString()} votes`,
    href: `/debates/${p.id}`,
  }));
  const predictionItems = useMemo(() => {
    if (!apiPredictions?.items?.length) return [];
    return apiPredictions.items.slice(0, 8).map((p) => ({
      topic:
        p.question.length > 40
          ? p.question.substring(0, 38) + "…"
          : p.question,
      badge: "PREDICTION" as const,
      stat: `${p.yesPercentage}% yes`,
      href: `/predictions/${p.id}`,
    }));
  }, [apiPredictions]);
  const pulseItems = useMemo(() => {
    if (!apiPulseTopics?.items?.length) return [];
    return apiPulseTopics.items.slice(0, 8).map((t) => ({
      topic: t.title.length > 35 ? t.title.substring(0, 33) + "…" : t.title,
      badge: "PULSE" as const,
      stat: `${t.deltaUp ? "↑" : "↓"} ${t.delta}`,
      href: `/pulse?shared=${encodeURIComponent(t.topicId)}`,
    }));
  }, [apiPulseTopics]);
  const maxLen = Math.max(
    debateItems.length,
    predictionItems.length,
    pulseItems.length,
  );
  const interleaved: { topic: string; badge: string; stat: string; href: string }[] = [];
  for (let i = 0; i < maxLen; i++) {
    if (debateItems[i]) interleaved.push(debateItems[i]);
    if (predictionItems[i]) interleaved.push(predictionItems[i]);
    if (pulseItems[i]) interleaved.push(pulseItems[i]);
  }
  const tickerDoubled = [...interleaved, ...interleaved];

  const issueDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const issueNumber = (() => {
    const now = new Date()
    const start = new Date(2026, 0, 1)
    const months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()) + 1
    return String(Math.max(1, months)).padStart(3, "0")
  })()

  return (
    <Layout>
      <style>{`
        @keyframes bubble-float-1 { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-8px); } }
        @keyframes bubble-float-2 { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-12px); } }
        @keyframes bubble-float-3 { 0%,100% { transform: translateY(-4px); } 50% { transform: translateY(6px); } }
        .bubble-float-1 { animation: bubble-float-1 5s ease-in-out infinite; }
        .bubble-float-2 { animation: bubble-float-2 7s ease-in-out infinite; }
        .bubble-float-3 { animation: bubble-float-3 6s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .bubble-float-1, .bubble-float-2, .bubble-float-3 { animation: none; }
        }
        @keyframes digit-flip-in {
          0% { transform: translateY(-100%); opacity: 0; }
          60% { transform: translateY(5%); opacity: 1; }
          100% { transform: translateY(0); opacity: 1; }
        }
      `}</style>

      {/* ── MASTHEAD ── */}
      <motion.div
        ref={mastheadRef}
        className="bg-background"
        style={{
          background:
            "radial-gradient(ellipse at 50% -20%, rgba(220,20,60,0.07) 0%, transparent 65%)",
          backgroundPositionY: prefersReducedMotion ? undefined : mastheadBgY,
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-2 text-[9px] uppercase tracking-[0.18em] text-muted-foreground font-serif">
            <span>{t(`EST. 2026 · ISSUE NO. ${issueNumber}`)}</span>
            <span className="hidden sm:block">{issueDate}</span>
            <span className="text-primary font-bold font-mono tabular-nums">
              {astTime} AST
            </span>
          </div>

          <motion.div
            className="py-5 my-3"
            style={{
              borderTop: "2px solid #DC143C",
              borderBottom: "2px solid #DC143C",
            }}
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE_OUT_EXPO }}
          >
            <div className="flex flex-col lg:flex-row items-center lg:items-stretch gap-8 lg:gap-12">
              {/* Left: hero copy */}
              <div className="flex flex-col items-center lg:items-start justify-center flex-1 text-center lg:text-left">
                <motion.p
                  className="text-[10px] font-serif font-bold tracking-[0.28em] uppercase text-primary mb-3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  {t("The questions you can't ask out loud.")}
                </motion.p>
                <motion.h1
                  className="font-display font-black uppercase tracking-tight text-foreground leading-none"
                  style={{ fontSize: "clamp(2.5rem, 6vw, 5rem)", lineHeight: 0.92 }}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, ease: EASE_OUT_EXPO, delay: 0.1 }}
                >
                  {t("The Middle East,")}{" "}
                  <span className="italic font-display text-primary">{t("unfiltered.")}</span>
                </motion.h1>
                <motion.p
                  className="text-base sm:text-[17px] text-foreground/80 font-sans mt-5 max-w-xl leading-relaxed"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.55, ease: EASE_OUT_EXPO, delay: 0.4 }}
                >
                  {t("Anonymous votes, predictions, and trends on the topics nobody else will touch. Politics, religion, identity, money, power. From inside the region and watched by the world. 541 million people. One place where the truth is on record.")}
                </motion.p>
                <motion.div
                  className="mt-7 flex items-center gap-4 flex-wrap justify-center lg:justify-start"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.7 }}
                >
                  <Link
                    href="/debates"
                    className="inline-flex items-center gap-2 bg-primary text-white font-bold uppercase tracking-widest text-xs px-7 py-3 hover:bg-primary/90 transition-colors font-serif"
                  >
                    {t("See Today's Debate")} <ArrowRight className="w-3 h-3" />
                  </Link>
                  <Link
                    href="/about"
                    className="inline-flex items-center gap-2 text-foreground/70 hover:text-foreground font-bold uppercase tracking-widest text-xs px-2 py-3 transition-colors font-serif underline underline-offset-4 decoration-primary/40"
                  >
                    {t("What is this?")}
                  </Link>
                </motion.div>
              </div>

              {/* Right: HeroGallery */}
              <motion.div
                className="flex-shrink-0 w-full max-w-[280px] sm:max-w-[320px] lg:max-w-[360px] mx-auto lg:mx-0"
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.9, ease: EASE_OUT_EXPO, delay: 0.2 }}
              >
                <HeroGallery />
              </motion.div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* ── SECTION HOOKS ── */}
      <section className="bg-background border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <StaggerGrid className="grid grid-cols-2 md:grid-cols-4 gap-0">
            {[
              {
                href: "/debates",
                label: t("Debates"),
                desc: "Vote on the questions shaping MENA",
                count: String(
                  homepageConfig?.sectionStats?.debates ??
                    liveCounts?.debates ??
                    "422",
                ),
                accent: "#DC143C",
              },
              {
                href: "/predictions",
                label: t("Predictions"),
                desc: "Bet on what actually happens next",
                count: String(
                  homepageConfig?.sectionStats?.predictions ??
                    liveCounts?.predictions ??
                    apiPredictions?.total ??
                    "230",
                ),
                accent: "#3B82F6",
              },
              {
                href: "/pulse",
                label: t("The Pulse"),
                desc: "Real trends backed by real data",
                count: String(
                  homepageConfig?.sectionStats?.pulse ??
                    liveCounts?.pulseTopics ??
                    "78",
                ),
                accent: "#10B981",
              },
              ...(voicesEnabled ? [{
                href: "/voices",
                label: t("Voices"),
                desc: "The people shaping the region",
                count: String(
                  homepageConfig?.sectionStats?.voices ??
                    liveCounts?.voices ??
                    "103",
                ),
                accent: "#A855F7",
              }] : []),
            ].map((item, i) => (
              <motion.div
                key={item.href}
                variants={staggerItem}
                className={`${i % 2 !== 0 ? "border-l border-border" : ""} ${i >= 2 ? "border-t border-border md:border-t-0" : ""} ${i > 0 ? "md:border-l md:border-border" : ""}`}
              >
                <Link
                  href={item.href}
                  className="group flex flex-col items-center justify-center gap-1 py-3 px-2 md:px-4 hover:bg-secondary/30 transition-colors min-w-0"
                >
                  <div className="flex items-center gap-1.5 md:gap-3 min-w-0">
                    <span
                      style={{
                        width: 3,
                        height: 20,
                        background: item.accent,
                        flexShrink: 0,
                      }}
                    />
                    <span
                      className="truncate"
                      style={{
                        fontFamily: "'Barlow Condensed', sans-serif",
                        fontWeight: 800,
                        fontSize: "0.75rem",
                        textTransform: "uppercase",
                        letterSpacing: "0.12em",
                        color: "var(--foreground)",
                      }}
                    >
                      {item.label}
                    </span>
                    <CountUp
                      value={item.count}
                      style={{
                        fontFamily: "'Barlow Condensed', sans-serif",
                        fontWeight: 900,
                        fontSize: "0.85rem",
                        color: item.accent,
                        flexShrink: 0,
                      }}
                    />
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity -ml-1 shrink-0" />
                  </div>
                  <span
                    className="truncate max-w-full"
                    style={{
                      fontFamily: "DM Sans, sans-serif",
                      fontSize: "0.6rem",
                      color: "var(--muted-foreground)",
                      letterSpacing: "0.02em",
                    }}
                  >
                    {item.desc}
                  </span>
                </Link>
              </motion.div>
            ))}
          </StaggerGrid>
        </div>
      </section>

      {/* ── MIXED TICKER ── */}
      {(trendingLoading || predictionsLoading || pulseLoading) && interleaved.length === 0 ? (
        <TickerSkeleton />
      ) : interleaved.length > 0 ? (
      <div
        className="min-h-[48px]"
        style={{
          background: "#0D0D0D",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          overflow: "hidden",
        }}
      >
        <div className="tmh-ticker-scroll">
          {tickerDoubled.map((item, i) => (
            <Link
              key={i}
              href={item.href}
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
                  fontWeight: 800,
                  fontSize: "0.55rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  whiteSpace: "nowrap",
                  padding: "2px 6px",
                  background:
                    item.badge === "DEBATE"
                      ? "rgba(220,20,60,0.15)"
                      : item.badge === "PREDICTION"
                        ? "rgba(59,130,246,0.15)"
                        : "rgba(34,197,94,0.15)",
                  color:
                    item.badge === "DEBATE"
                      ? "#DC143C"
                      : item.badge === "PREDICTION"
                        ? "#3B82F6"
                        : "#22C55E",
                  border: `1px solid ${item.badge === "DEBATE" ? "rgba(220,20,60,0.25)" : item.badge === "PREDICTION" ? "rgba(59,130,246,0.25)" : "rgba(34,197,94,0.25)"}`,
                }}
              >
                {item.badge}
              </span>
              <span
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 700,
                  fontSize: "0.7rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "rgba(250,250,250,0.75)",
                  whiteSpace: "nowrap",
                }}
              >
                {item.topic}
              </span>
              <span
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 700,
                  fontSize: "0.78rem",
                  color: "#fff",
                  whiteSpace: "nowrap",
                }}
              >
                {item.stat}
              </span>
            </Link>
          ))}
        </div>
      </div>
      ) : null}

      {/* ── ABOUT ── */}
      <Suspense fallback={<div className="py-20" />}>
        <AboutSection />
      </Suspense>

      {/* ── FRONT PAGE: Lead Debate + Sidebar ── */}
      <section className="py-8 bg-background border-b border-border relative">
        <FadeUp>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-0">
            {/* LEFT: Today's Lead Debate */}
            <div className="lg:pr-8 lg:border-r lg:border-border pb-8 lg:pb-0">
              <FadeIn delay={0.1}>
              <div className="text-sm uppercase tracking-[0.22em] font-bold text-primary mb-5 flex items-center gap-2 font-serif">
                <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
                {t("TODAY'S LEAD DEBATE")}
              </div>
              </FadeIn>
              {featuredLoading ? (
                <div className="h-96 bg-secondary animate-pulse border border-border" />
              ) : featuredPoll ? (
                <PollCard poll={featuredPoll} featured />
              ) : null}
            </div>

            {/* RIGHT: Sidebar */}
            <div className="lg:pl-8 pt-8 lg:pt-0 border-t lg:border-t-0 border-border">
              <FadeIn delay={0.15}>
              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] uppercase tracking-[0.25em] font-bold text-muted-foreground font-serif">
                  {t("Latest Debates")}
                </p>
                <Link
                  href="/debates"
                  className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground font-serif transition-colors"
                >
                  {t("View All")}
                </Link>
              </div>
              </FadeIn>

              {trendingLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-16 bg-secondary animate-pulse" />
                  ))}
                </div>
              ) : (
                <StaggerGrid>
                  {trendingPolls?.polls?.slice(0, 4).map((poll) => (
                    <motion.div key={poll.id} variants={staggerItem}>
                    <Link href={`/debates/${poll.id}`}>
                      <motion.div
                        className="py-3 border-b border-border group cursor-pointer"
                        whileHover={{ x: 4 }}
                        transition={{ duration: 0.2, ease: EASE_OUT_EXPO }}
                      >
                        <p className="text-[11px] uppercase tracking-widest text-primary font-serif font-bold">
                          {poll.category}
                        </p>
                        <p className="font-serif font-black uppercase text-[13px] leading-tight text-foreground mt-1 group-hover:text-primary transition-colors">
                          {poll.question.length > 90
                            ? poll.question.slice(0, 90) + "…"
                            : poll.question}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1 font-serif">
                          {(poll.totalVotes ?? 0).toLocaleString()} votes
                        </p>
                      </motion.div>
                    </Link>
                    </motion.div>
                  ))}
                </StaggerGrid>
              )}
            </div>
          </div>
        </div>
        </FadeUp>
      </section>

      {/* ── PREDICTIONS ── */}
      <section
        id="predictions"
        className="py-8 bg-background border-b border-border relative"
      >
        <FadeUp delay={0.05}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-0">
            {/* LEFT: Today's Featured Prediction */}
            <div className="lg:pr-8 lg:border-r lg:border-border pb-8 lg:pb-0">
              <FadeIn delay={0.1}>
              <div className="text-base uppercase tracking-[0.2em] font-bold text-[#3B82F6] mb-5 flex items-center gap-2 font-serif">
                <span className="w-2 h-2 rounded-full bg-[#3B82F6] animate-pulse" />
                {t("FEATURED PREDICTION")}
              </div>
              </FadeIn>
              {(() => {
                const featured = PREDICTIONS[0];
                const noData = featured.data.map((v) => 100 - v);
                const months = [
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
                const chartW = 280;
                const chartH = 120;
                const padL = 28;
                const padR = 4;
                const padT = 8;
                const padB = 20;
                const plotW = chartW - padL - padR;
                const plotH = chartH - padT - padB;
                const toX = (i: number) =>
                  padL + (i / (featured.data.length - 1)) * plotW;
                const toY = (v: number) => padT + plotH - (v / 100) * plotH;
                const yesPoints = featured.data
                  .map((v, i) => `${toX(i)},${toY(v)}`)
                  .join(" ");
                const noPoints = noData
                  .map((v, i) => `${toX(i)},${toY(v)}`)
                  .join(" ");
                const yesArea = `M${featured.data.map((v, i) => `${toX(i)},${toY(v)}`).join(" L")} L${toX(featured.data.length - 1)},${padT + plotH} L${padL},${padT + plotH} Z`;
                return (
                  <FeaturedPredictionCard
                    featured={featured}
                    chartW={chartW}
                    chartH={chartH}
                    padL={padL}
                    padR={padR}
                    padT={padT}
                    padB={padB}
                    plotW={plotW}
                    plotH={plotH}
                    toX={toX}
                    toY={toY}
                    yesPoints={yesPoints}
                    noPoints={noPoints}
                    yesArea={yesArea}
                    months={months}
                  />
                );
              })()}
            </div>

            {/* RIGHT: Latest Predictions Sidebar */}
            <div className="lg:pl-8 pt-8 lg:pt-0 border-t lg:border-t-0 border-border">
              <FadeIn delay={0.15}>
              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] uppercase tracking-[0.25em] font-bold text-muted-foreground font-serif">
                  {t("Latest Predictions")}
                </p>
                <Link
                  href="/predictions"
                  className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground font-serif transition-colors"
                >
                  {t("View All")}
                </Link>
              </div>
              </FadeIn>

              <StaggerGrid>
                {(() => {
                  const seen = new Set<string>();
                  seen.add(PREDICTIONS[0].category);
                  const mixed: typeof PREDICTIONS = [];
                  for (const p of PREDICTIONS) {
                    if (mixed.length >= 3) break;
                    if (!seen.has(p.category)) {
                      seen.add(p.category);
                      mixed.push(p);
                    }
                  }
                  return mixed;
                })().map((pred) => {
                  const sideVote = getPredVote(pred.id);
                  const sidePhase = getPredPhase(pred.id);
                  return (
                    <motion.div key={pred.id} variants={staggerItem}>
                    <SidebarPredictionItem
                      pred={pred}
                      sideVote={sideVote}
                      sidePhase={sidePhase}
                    />
                    </motion.div>
                  );
                })}
              </StaggerGrid>
            </div>
          </div>
        </div>
        </FadeUp>
      </section>

      {/* ── THE PULSE ── */}
      <section
        id="pulse"
        className="py-8 bg-background border-b border-border relative"
      >
        <FadeUp delay={0.05}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-0">
            {/* LEFT: Today's Featured Pulse */}
            <div className="lg:pr-8 lg:border-r lg:border-border pb-8 lg:pb-0">
              <FadeIn delay={0.1}>
              <div className="text-sm uppercase tracking-[0.22em] font-bold text-[#10B981] mb-5 flex items-center gap-2 font-serif">
                <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
                {t("TODAY'S PULSE")}
              </div>
              </FadeIn>
              {(() => {
                const fallbackTopic = {
                  id: "sovereign-wealth",
                  tag: "MONEY",
                  tagColor: "#F59E0B",
                  title: "Sovereign Wealth Power",
                  stat: "$4.1 Trillion",
                  delta: "+18%",
                  deltaUp: true,
                  blurb:
                    "Gulf sovereign wealth funds now control $4.1T — more than the GDP of Germany. ADIA, PIF, QIA, Mubadala, and KIA are buying everything: Newcastle FC, Lucid Motors, Jio, AI labs. The Gulf is becoming the world's landlord.",
                  source: "SWF Institute / PIF Annual Report 2026",
                  sparkData: [
                    2.8, 2.9, 3.0, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 4.1,
                  ],
                };
                const apiTopic = apiPulseTopics?.items?.[0];
                const topic = apiTopic
                  ? {
                      id: apiTopic.topicId,
                      tag: apiTopic.tag,
                      tagColor: apiTopic.tagColor,
                      title: apiTopic.title,
                      stat: apiTopic.stat,
                      delta: apiTopic.delta,
                      deltaUp: apiTopic.deltaUp,
                      blurb: apiTopic.blurb,
                      source: apiTopic.source,
                      sparkData: apiTopic.sparkData,
                    }
                  : fallbackTopic;
                const chartW = 280,
                  chartH = 100,
                  padL = 28,
                  padR = 4,
                  padT = 8,
                  padB = 20;
                const plotW = chartW - padL - padR,
                  plotH = chartH - padT - padB;
                const maxV = Math.max(...topic.sparkData);
                const minV = Math.min(...topic.sparkData);
                const range = maxV - minV || 1;
                const toX = (i: number) =>
                  padL + (i / (topic.sparkData.length - 1)) * plotW;
                const toY = (v: number) =>
                  padT + plotH - ((v - minV) / range) * plotH;
                const pts = topic.sparkData
                  .map((v, i) => `${toX(i)},${toY(v)}`)
                  .join(" ");
                const area = `M${topic.sparkData.map((v, i) => `${toX(i)},${toY(v)}`).join(" L")} L${toX(topic.sparkData.length - 1)},${padT + plotH} L${padL},${padT + plotH} Z`;
                const months = [
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
                const pulseUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/pulse`;
                return (
                  <div
                    className="bg-card border border-border rounded-[4px] flex flex-col lg:flex-row gap-0 overflow-hidden"
                    style={{ borderWidth: "1.5px" }}
                  >
                    <div className="flex-1 p-5">
                      <p className="text-[9px] uppercase tracking-[0.15em] font-bold text-muted-foreground font-serif mb-2">
                        Trend Over 12 Months
                      </p>
                      <svg
                        viewBox={`0 0 ${chartW} ${chartH}`}
                        className="w-full"
                        style={{ maxHeight: 140 }}
                        onMouseLeave={() => setPulseHovIdx(null)}
                      >
                        <defs>
                          <linearGradient
                            id="homePulseGrad"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor={topic.tagColor}
                              stopOpacity="0.25"
                            />
                            <stop
                              offset="100%"
                              stopColor={topic.tagColor}
                              stopOpacity="0.02"
                            />
                          </linearGradient>
                        </defs>
                        {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
                          const v = minV + pct * range;
                          return (
                            <g key={idx}>
                              <line
                                x1={padL}
                                x2={chartW - padR}
                                y1={toY(v)}
                                y2={toY(v)}
                                stroke="rgba(255,255,255,0.06)"
                                strokeWidth="0.5"
                              />
                              <text
                                x={padL - 4}
                                y={toY(v) + 3}
                                fill="rgba(255,255,255,0.25)"
                                fontSize="5.5"
                                textAnchor="end"
                                fontFamily="'Barlow Condensed', sans-serif"
                              >
                                ${v.toFixed(1)}T
                              </text>
                            </g>
                          );
                        })}
                        {topic.sparkData.map((_, i) => {
                          if (i % 3 !== 0 && i !== topic.sparkData.length - 1)
                            return null;
                          return (
                            <text
                              key={i}
                              x={toX(i)}
                              y={chartH - 4}
                              fill="rgba(255,255,255,0.3)"
                              fontSize="5.5"
                              textAnchor="middle"
                              fontFamily="'Barlow Condensed', sans-serif"
                            >
                              {months[i]}
                            </text>
                          );
                        })}
                        <path d={area} fill="url(#homePulseGrad)" />
                        <polyline
                          points={pts}
                          fill="none"
                          stroke={topic.tagColor}
                          strokeWidth="1.8"
                          strokeLinejoin="round"
                        />
                        {pulseHovIdx !== null && (
                          <line
                            x1={toX(pulseHovIdx)}
                            y1={padT}
                            x2={toX(pulseHovIdx)}
                            y2={padT + plotH}
                            stroke="rgba(255,255,255,0.2)"
                            strokeWidth="0.5"
                          />
                        )}
                        {topic.sparkData.map((v, i) => (
                          <circle
                            key={`pc${i}`}
                            cx={toX(i)}
                            cy={toY(v)}
                            r={pulseHovIdx === i ? 3 : 0}
                            fill={topic.tagColor}
                            style={{ transition: "r 0.15s" }}
                          />
                        ))}
                        <circle
                          cx={toX(topic.sparkData.length - 1)}
                          cy={toY(topic.sparkData[topic.sparkData.length - 1])}
                          r="2.5"
                          fill={topic.tagColor}
                        />
                        {topic.sparkData.map((_, i) => {
                          const slotW = plotW / (topic.sparkData.length - 1);
                          return (
                            <rect
                              key={`ph${i}`}
                              x={toX(i) - slotW / 2}
                              y={padT}
                              width={slotW}
                              height={plotH}
                              fill="transparent"
                              onMouseEnter={() => setPulseHovIdx(i)}
                            />
                          );
                        })}
                        {pulseHovIdx !== null &&
                          (() => {
                            const val = topic.sparkData[pulseHovIdx];
                            const prev =
                              pulseHovIdx > 0
                                ? topic.sparkData[pulseHovIdx - 1]
                                : val;
                            const delta = val - prev;
                            const tipW = 72;
                            const tipH = 30;
                            let tipX = toX(pulseHovIdx) + 6;
                            if (tipX + tipW > chartW - padR)
                              tipX = toX(pulseHovIdx) - tipW - 6;
                            const tipY = Math.max(padT, toY(val) - tipH / 2);
                            return (
                              <g>
                                <rect
                                  x={tipX}
                                  y={tipY}
                                  width={tipW}
                                  height={tipH}
                                  rx="2"
                                  fill="rgba(30,30,30,0.92)"
                                  stroke="rgba(255,255,255,0.15)"
                                  strokeWidth="0.5"
                                />
                                <text
                                  x={tipX + 4}
                                  y={tipY + 9}
                                  fill="rgba(255,255,255,0.6)"
                                  fontSize="5.5"
                                  fontFamily="'Barlow Condensed', sans-serif"
                                >
                                  {months[pulseHovIdx]} 2026
                                </text>
                                <text
                                  x={tipX + 4}
                                  y={tipY + 18}
                                  fill={topic.tagColor}
                                  fontSize="7"
                                  fontWeight="700"
                                  fontFamily="'Barlow Condensed', sans-serif"
                                >
                                  ${val.toFixed(1)}T
                                </text>
                                <text
                                  x={tipX + 4}
                                  y={tipY + 26}
                                  fill={delta >= 0 ? "#10B981" : "#DC143C"}
                                  fontSize="5.5"
                                  fontFamily="'Barlow Condensed', sans-serif"
                                >
                                  {delta >= 0 ? "▲" : "▼"} $
                                  {Math.abs(delta).toFixed(2)}T vs prev
                                </text>
                              </g>
                            );
                          })()}
                      </svg>
                      <p
                        className="text-[9px] font-serif mt-2"
                        style={{ color: topic.tagColor }}
                      >
                        {topic.deltaUp ? "▲" : "▼"} {topic.delta} year-over-year
                      </p>
                    </div>
                    <div className="flex-1 p-5 border-t lg:border-t-0 lg:border-l border-border flex flex-col justify-center gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] font-serif"
                          style={{
                            background: `${topic.tagColor}20`,
                            border: `1px solid ${topic.tagColor}40`,
                            color: topic.tagColor,
                          }}
                        >
                          {topic.tag}
                        </span>
                        <ShareMenu
                          title={`${topic.title}: ${topic.stat}`}
                          shareUrl={pulseUrl}
                          color="#10B981"
                        />
                      </div>
                      <Link href={`/pulse?shared=${topic.id}`}>
                        <p
                          className="font-serif font-black uppercase text-[15px] leading-tight text-foreground tracking-tight cursor-pointer hover:text-primary transition-colors"
                          style={{ lineHeight: 1.15 }}
                        >
                          {topic.title}
                        </p>
                      </Link>
                      <div className="flex items-baseline gap-2">
                        <span
                          className="font-display font-black text-2xl"
                          style={{ color: topic.tagColor }}
                        >
                          {topic.stat}
                        </span>
                        <span
                          className={cn(
                            "text-[10px] font-bold font-serif",
                            topic.deltaUp ? "text-[#10B981]" : "text-[#DC143C]",
                          )}
                        >
                          {topic.deltaUp ? "▲" : "▼"} {topic.delta}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground font-sans leading-relaxed">
                        {topic.blurb}
                      </p>
                      <div className="flex items-center justify-between">
                        <p className="text-[8px] text-muted-foreground/60 font-serif uppercase tracking-widest">
                          Source: {topic.source}
                        </p>
                        <Link
                          href="/pulse"
                          className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground hover:text-[#10B981] font-serif transition-colors flex items-center gap-1"
                        >
                          Explore <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* RIGHT: Latest Pulse Sidebar */}
            <div className="lg:pl-8 pt-8 lg:pt-0 border-t lg:border-t-0 border-border">
              <FadeIn delay={0.15}>
              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] uppercase tracking-[0.25em] font-bold text-muted-foreground font-serif">
                  {t("Latest Trends")}
                </p>
                <Link
                  href="/pulse"
                  className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground font-serif transition-colors"
                >
                  {t("View All")}
                </Link>
              </div>
              </FadeIn>

              <StaggerGrid>
                {(apiPulseTopics?.items?.length
                  ? apiPulseTopics.items.slice(0, 3).map((t) => ({
                      id: t.topicId,
                      tag: t.tag,
                      tagColor: t.tagColor,
                      title: t.title,
                      stat: t.stat,
                      delta: t.delta,
                      deltaUp: t.deltaUp,
                      sparkData: t.sparkData,
                    }))
                  : [
                      {
                        id: "authoritarianism-index",
                        tag: "POWER",
                        tagColor: "#EF4444",
                        title: "Press Freedom Collapse",
                        stat: "17 of 19",
                        delta: "Not Free",
                        deltaUp: false,
                        sparkData: [
                          14, 14, 15, 15, 15, 16, 16, 16, 17, 17, 17, 17,
                        ],
                      },
                      {
                        id: "crypto-volume",
                        tag: "MONEY",
                        tagColor: "#F59E0B",
                        title: "Crypto Trading Volume",
                        stat: "$338B",
                        delta: "+74%",
                        deltaUp: true,
                        sparkData: [
                          89, 110, 125, 145, 160, 180, 210, 240, 268, 295, 318,
                          338,
                        ],
                      },
                      {
                        id: "women-workforce",
                        tag: "SOCIETY",
                        tagColor: "#EC4899",
                        title: "Women in the Workforce",
                        stat: "33.4%",
                        delta: "+9.2pp",
                        deltaUp: true,
                        sparkData: [
                          17, 19, 21, 23, 25, 26, 28, 29, 30, 31, 32, 33.4,
                        ],
                      },
                    ]
                ).map((t2, idx) => {
                  const max = Math.max(...t2.sparkData);
                  const min = Math.min(...t2.sparkData);
                  const rng = max - min || 1;
                  const pUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/pulse`;
                  return (
                    <motion.div
                      key={t2.id}
                      variants={staggerItem}
                    >
                    <Link href={`/pulse?shared=${t2.id}`}>
                    <motion.div
                      className="py-3 border-b border-border group cursor-pointer"
                      whileHover={{ x: 4 }}
                      transition={{ duration: 0.2, ease: EASE_OUT_EXPO }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p
                            className="text-[9px] uppercase tracking-widest font-serif font-bold"
                            style={{ color: t2.tagColor }}
                          >
                            {t2.tag}
                          </p>
                          <p className="font-serif font-black uppercase text-[12px] leading-tight text-foreground mt-1 group-hover:text-primary transition-colors">
                            {t2.title}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="flex-shrink-0 w-16 h-8">
                            <svg
                              viewBox="0 0 60 24"
                              className="w-full h-full"
                              preserveAspectRatio="none"
                            >
                              <polyline
                                points={t2.sparkData
                                  .map(
                                    (v, i) =>
                                      `${(i / (t2.sparkData.length - 1)) * 60},${24 - ((v - min) / rng) * 20}`,
                                  )
                                  .join(" ")}
                                fill="none"
                                stroke={t2.tagColor}
                                strokeWidth="1.5"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </div>
                          <ShareMenu
                            title={`${t2.title}: ${t2.stat}`}
                            shareUrl={pUrl}
                            color="#10B981"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span
                          className="text-[9px] font-bold font-serif"
                          style={{ color: t2.tagColor }}
                        >
                          {t2.stat}
                        </span>
                        <span
                          className={cn(
                            "text-[8px] font-bold font-serif ml-auto",
                            t2.deltaUp ? "text-[#10B981]" : "text-[#DC143C]",
                          )}
                        >
                          {t2.deltaUp ? "▲" : "▼"} {t2.delta}
                        </span>
                      </div>
                    </motion.div>
                    </Link>
                    </motion.div>
                  );
                })}
              </StaggerGrid>
            </div>
          </div>
        </div>
        </FadeUp>
      </section>

      {/* ── THE VOICES ── */}
      {voicesEnabled && (
      <section className="bg-foreground text-background py-20 border-b border-border">
        <FadeUp>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-4">
            <div>
              <h2 className="font-display font-black text-4xl md:text-5xl uppercase tracking-tight text-background leading-none">
                {t("The Voices")}
              </h2>
              <SlideReveal color="#DC143C" height={4} className="mt-3" delay={0.3} />
            </div>
            <Link
              href="/voices"
              className="hidden sm:inline-block text-[10px] font-bold uppercase tracking-widest text-background/70 hover:text-background font-serif"
            >
              {t("View All →")}
            </Link>
          </div>
          <FadeIn delay={0.15}>
          <p className="text-background/75 font-sans text-base mt-4 mb-10 max-w-xl">
            {t(
              "The founders, operators, and change-makers shaping the Middle East. Real people. Real stories.",
            )}
          </p>
          </FadeIn>

          {profilesLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-48 bg-background/10 animate-pulse border border-background/20"
                />
              ))}
            </div>
          ) : (
            <StaggerGrid className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {featuredProfiles?.profiles?.slice(0, 8).map((profile) => (
                <motion.div
                  key={profile.id}
                  variants={staggerItem}
                  whileHover={{ y: -4, transition: { duration: 0.2, ease: EASE_OUT_EXPO } }}
                  className="dark"
                >
                  <ProfileCard profile={profile} />
                </motion.div>
              ))}
            </StaggerGrid>
          )}

          <FadeUp delay={0.2}>
          <div className="mt-8 flex items-center gap-4 flex-wrap">
            <motion.div whileTap={{ scale: 0.97 }} className="inline-flex">
            <Link
              href="/voices"
              className="inline-flex items-center gap-2 bg-primary text-white font-bold uppercase tracking-widest text-xs px-8 py-3 hover:bg-primary/90 transition-colors font-serif"
            >
              {t("View All Voices")} <ArrowRight className="w-3 h-3" />
            </Link>
            </motion.div>
            {majlisEnabled && (
              <motion.div whileTap={{ scale: 0.97 }} className="inline-flex">
              <Link
                href="/majlis/login"
                className="inline-flex items-center gap-2 border border-background/30 text-background font-bold uppercase tracking-widest text-xs px-8 py-3 hover:bg-background/10 transition-colors font-serif"
              >
                <Lock className="w-3 h-3" />
                {t("Enter The Majlis")}
              </Link>
              </motion.div>
            )}
          </div>
          </FadeUp>
        </div>
        </FadeUp>
      </section>
      )}

      {/* ── EXPLORE TOPICS ── */}
      {categories?.categories && categories.categories.length > 0 && (
        <section className="py-20 bg-background border-b border-border">
          <FadeUp>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-12 border-l-4 border-primary pl-4">
              <h2 className="font-serif font-black uppercase text-2xl text-foreground">
                {t("Explore Topics")}
              </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {categories.categories.map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/debates?category=${cat.slug}`}
                  className="bg-secondary p-5 flex flex-col justify-between transition-all hover:bg-foreground hover:text-background group border border-border hover:-translate-y-0.5 hover:shadow-md duration-300"
                >
                  <span className="font-serif font-bold uppercase tracking-wider text-base mb-3 leading-tight">
                    {cat.name}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground group-hover:text-background/75">
                    {cat.pollCount} Debates
                  </span>
                </Link>
              ))}
            </div>
          </div>
          </FadeUp>
        </section>
      )}

      {/* ── LIVE ACTIVITY ── */}
      <LiveActivity />

      {/* ── NEWSLETTER CTA ── */}
      <section className="bg-foreground text-background py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row gap-12 md:gap-16 items-center">
            <FadeUp className="flex-1 md:basis-2/3">
              <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-primary mb-3 font-serif">
                {t("The Weekly Newsletter")}
              </p>
              <h2 className="font-display font-black text-4xl md:text-5xl uppercase leading-none tracking-tight text-background mb-4">
                {t("The Region's Opinion.")}
                <br />
                {t("Unfiltered.")}
              </h2>
              <p className="text-background/75 font-sans text-base leading-relaxed max-w-xl mb-3">
                Every week: the sharpest debates, the most controversial
                predictions, and the data MENA doesn't want you to see. No
                fluff. No PR. Just the raw pulse of{" "}
                <LiveNumber
                  value={menaPop}
                  className="tabular-nums relative top-1.5"
                />{" "}
                people.
              </p>
              <ul className="text-background/60 font-sans text-sm space-y-1.5 max-w-xl">
                <li className="flex items-center gap-2">
                  <span className="text-primary font-bold">→</span> Unlimited
                  voting on all debates & predictions
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary font-bold">→</span> Weekly
                  results breakdown — who voted what, and why it matters
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary font-bold">→</span> Early access
                  to new Voices and Pulse data drops
                </li>
              </ul>
            </FadeUp>
            <FadeIn direction="right" delay={0.15} className="w-full md:basis-1/3">
              <AnimatePresence mode="wait">
              {ctaJoined ? (
                <motion.div
                  key="joined"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
                  className="border-2 border-primary p-8 text-center"
                >
                  <p className="font-display font-black text-3xl uppercase text-background tracking-tight">
                    {t("You're In")}
                    <span className="text-primary">.</span>
                  </p>
                  <p className="text-[10px] uppercase tracking-widest text-background/70 mt-2 font-serif">
                    {t("Welcome to the conversation.")}
                  </p>
                </motion.div>
              ) : (
                <motion.div key="form" exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                <form
                  onSubmit={handleCtaSubmit}
                  className="flex flex-col gap-3"
                >
                  <input
                    type="email"
                    required
                    placeholder="your@email.com"
                    value={ctaEmail}
                    onChange={(e) => setCtaEmail(e.target.value)}
                    className="bg-background text-foreground border-none px-4 py-3 w-full focus:outline-none focus:ring-2 focus:ring-primary text-sm font-sans"
                  />
                  <motion.button
                    type="submit"
                    whileTap={{ scale: 0.97 }}
                    whileHover={{ scale: 1.02 }}
                    transition={{ duration: 0.15 }}
                    className="bg-primary text-white font-bold uppercase tracking-widest px-6 py-3 text-xs hover:bg-primary/90 font-serif"
                  >
                    {t("Join The Hustle")}
                  </motion.button>
                  <p className="text-[9px] text-background/60 font-sans">
                    {t("No spam. Unsubscribe anytime.")}
                  </p>
                </form>
                </motion.div>
              )}
              </AnimatePresence>
            </FadeIn>
          </div>
        </div>
      </section>
    </Layout>
  );
}
