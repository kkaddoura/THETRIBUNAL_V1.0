import { useState, useEffect, useRef, useCallback, useMemo, lazy, Suspense } from "react";
import {
  useGetPoll,
  useListPolls,
  useListProfiles,
} from "@workspace/api-client-react";
import type { Poll } from "@workspace/api-client-react";
import { Layout } from "@/components/layout/Layout";
import { PollCard } from "@/components/poll/PollCard";
import { ProfileCard } from "@/components/profile/ProfileCard";
import { TickerSkeleton } from "@/components/skeletons/TickerSkeleton";
const AboutSection = lazy(() => import("@/components/home/AboutSection"));
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { ArrowRight, Share2, Lock, Mail, CheckCircle2, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import {
  motion,
  AnimatePresence,
  useInView,
  useScroll,
  useTransform,
  useReducedMotion,
} from "motion/react";
import { track } from "@/lib/analytics";

const API_BASE_HOME = import.meta.env?.VITE_API_BASE_URL ?? "";

interface LeadDebateScheduleSlot {
  id?: string;
  debateId?: number | null;
  startsAt?: string | null;
  endsAt?: string | null;
  enabled?: boolean;
}

interface HomeSectionConfig {
  id: string;
  type: string;
  config: {
    selectedDebateId?: number | null;
    leadDebateSchedule?: LeadDebateScheduleSlot[];
    [key: string]: unknown;
  };
}

const HOMEPAGE_DEBATE_LIMIT = 5;

type TickerItem = { topic: string; badge: string; stat: string; href: string };

const TICKER_MIN_VOTES = 1;
const TICKER_LIVE_STATUSES = new Set(["approved", "published", "live", "active"]);

function isLiveEditorialStatus(status?: string | null) {
  return !!status && TICKER_LIVE_STATUSES.has(status.toLowerCase());
}

function cleanTickerTopic(value?: string | null) {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

function isOpenTickerWindow(value?: string | null) {
  if (!value) return true;
  const time = new Date(value).getTime();
  return Number.isNaN(time) || time >= Date.now();
}

function resolveActiveLeadDebateId(section?: HomeSectionConfig): number | undefined {
  if (!section) return undefined;
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const schedule = Array.isArray(section.config.leadDebateSchedule)
    ? section.config.leadDebateSchedule
    : [];
  const activeSlot = [...schedule].reverse().find((slot) => {
    if (!slot || slot.enabled === false || !slot.debateId) return false;
    const startsAt = slot.startsAt || "";
    const endsAt = slot.endsAt || "";
    return (!startsAt || startsAt <= today) && (!endsAt || endsAt >= today);
  });
  return activeSlot?.debateId ?? section.config.selectedDebateId ?? undefined;
}

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

// Dummy live ticker — keeps the number changing every few seconds to convey
// active product usage. `mode="increment"` only goes up (e.g. cumulative votes);
// `mode="drift"` random-walks ± with optional upward bias (e.g. people online).
function LiveTicker({
  start,
  mode = "increment",
  minDelta = 1,
  maxDelta = 4,
  intervalMs = 2000,
  jitterMs = 1200,
  upBias = 0.5,
  min,
  max,
  lastDigitAccent = false,
  animation = "slide",
  className,
  style,
}: {
  start: number;
  mode?: "increment" | "drift";
  minDelta?: number;
  maxDelta?: number;
  intervalMs?: number;
  jitterMs?: number;
  upBias?: number; // drift mode only — probability of an up step (0..1)
  min?: number;
  max?: number;
  lastDigitAccent?: boolean;
  animation?: "slide" | "fade"; // slide = last-char slide; fade = whole-number cross-fade
  className?: string;
  style?: React.CSSProperties;
}) {
  const prefersReduced = useReducedMotion();
  const [n, setN] = useState(start);

  useEffect(() => {
    if (prefersReduced) return;
    let timeoutId: number;
    const schedule = () => {
      const delay = intervalMs + Math.random() * jitterMs;
      timeoutId = window.setTimeout(() => {
        setN((prev) => {
          const delta =
            minDelta + Math.floor(Math.random() * (maxDelta - minDelta + 1));
          let next: number;
          if (mode === "increment") {
            next = prev + delta;
          } else {
            const up = Math.random() < upBias;
            next = prev + (up ? delta : -delta);
          }
          if (typeof min === "number" && next < min) next = min + delta;
          if (typeof max === "number" && next > max) next = max - delta;
          return next;
        });
        schedule();
      }, delay);
    };
    schedule();
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [mode, minDelta, maxDelta, intervalMs, jitterMs, upBias, min, max, prefersReduced]);

  const display = n.toLocaleString();
  const prefix = display.length > 0 ? display.slice(0, -1) : "";
  const lastChar = display.length > 0 ? display.slice(-1) : "";
  const lastClass = lastDigitAccent ? "text-primary" : undefined;

  // Reduced-motion: no animation, just instant updates.
  if (prefersReduced) {
    return (
      <span className={className} style={style}>
        {prefix}
        <span className={lastClass}>{lastChar}</span>
      </span>
    );
  }

  // Fade mode: cross-fade the entire number on each tick.
  if (animation === "fade") {
    return (
      <span
        className={className}
        style={{ ...style, display: "inline-block", position: "relative" }}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={display}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            style={{ display: "inline-block" }}
          >
            {prefix}
            <span className={lastClass}>{lastChar}</span>
          </motion.span>
        </AnimatePresence>
      </span>
    );
  }

  // Slide mode (default): only the last char slides up on change.
  return (
    <span className={className} style={style}>
      {prefix}
      <span
        style={{
          display: "inline-block",
          position: "relative",
          overflow: "hidden",
          verticalAlign: "baseline",
        }}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={lastChar}
            initial={{ y: "0.55em", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "-0.55em", opacity: 0 }}
            transition={{ duration: 0.35, ease: EASE_OUT_EXPO }}
            className={lastClass}
            style={{ display: "inline-block" }}
          >
            {lastChar}
          </motion.span>
        </AnimatePresence>
      </span>
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
  useSiteSettings,
  useTopPost,
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
            className="w-full text-left px-3 py-2 text-[13px] font-serif uppercase tracking-wider hover:bg-white/5 rounded-sm flex items-center gap-2"
          >
            <span className="text-[#25D366]">●</span> WhatsApp
          </button>
          <button
            onClick={() =>
              doShare(
                `https://x.com/intent/tweet?text=${encodeURIComponent(`"${title}" — The Tribunal`)}&url=${encodeURIComponent(shareUrl)}`,
              )
            }
            className="w-full text-left px-3 py-2 text-[13px] font-serif uppercase tracking-wider hover:bg-white/5 rounded-sm flex items-center gap-2"
          >
            <span className="text-foreground">●</span> X / Twitter
          </button>
          <button
            onClick={() =>
              doShare(
                `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
              )
            }
            className="w-full text-left px-3 py-2 text-[13px] font-serif uppercase tracking-wider hover:bg-white/5 rounded-sm flex items-center gap-2"
          >
            <span className="text-[#0A66C2]">●</span> LinkedIn
          </button>
          <button
            onClick={() =>
              doShare(
                `https://www.instagram.com/`,
              )
            }
            className="w-full text-left px-3 py-2 text-[13px] font-serif uppercase tracking-wider hover:bg-white/5 rounded-sm flex items-center gap-2"
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
              className="w-full text-left px-3 py-2 text-[13px] font-serif uppercase tracking-wider hover:bg-white/5 rounded-sm flex items-center gap-2"
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

// ── Editable home-page copy (CMS-overridable via homepageConfig.content) ──────
// Every visible copy block below can be overridden from the CMS Homepage Manager.
// These objects are the source of truth for fallbacks; the CMS seeds matching keys.
export interface HomeContent {
  hero: {
    eyebrow: string; headline: string; subcopy: string; trustLine: string; accountMicrocopy: string;
    primaryCtaLabel: string; primaryCtaHref: string; secondaryCtaLabel: string; secondaryCtaHref: string;
    stats: Array<{ value: string; label: string }>;
  };
  intro: {
    heading: string; lead: string; body: string; statement: string; negations: string[];
    closing: string; trust: string; quote: string; quoteAuthor: string;
  };
  cards: { heading: string; items: Array<{ key: string; title: string; subtitle: string; body: string; cta: string }> };
  voices: { heading: string; subcopy: string };
  exploreTopics: { heading: string };
  newsletter: { eyebrow: string; heading: string; body: string; bullets: string[]; ctaLabel: string; disclaimer: string };
}

const HOME_CONTENT_DEFAULTS: HomeContent = {
  hero: {
    eyebrow: "The Region, On Record",
    headline: "The questions people avoid in public",
    subcopy: "Private voting on what the region really thinks about power, money, culture, work, media and the future.",
    trustLine: "Your vote is private. The result is public.",
    accountMicrocopy: "",
    primaryCtaLabel: "Cast Your Vote",
    primaryCtaHref: "/debates",
    secondaryCtaLabel: "How It Works",
    secondaryCtaHref: "/about#how-it-works",
    stats: [
      { value: "100+", label: "Live Questions" },
      { value: "19", label: "Countries Covered" },
      { value: "Private", label: "Votes" },
      { value: "Public", label: "Results" },
    ],
  },
  intro: {
    heading: "What is The Tribunal?",
    lead: "The sharpest read on what the region really thinks.",
    body: "The Tribunal asks direct questions about the Middle East and North Africa, then shows how people answer.",
    statement: "People vote privately. The result is public.",
    negations: ["It is not a news site.", "It is not a think tank.", "It is not a comment section."],
    closing: "It is a cleaner way to see what people are willing to say when their names are not attached.",
    trust: "Private does not mean fake. If it is not human, it does not count.",
    quote: "People do not lack opinions. They lack a place to say them honestly.",
    quoteAuthor: "— Kareem Kaddoura, Founder",
  },
  cards: {
    heading: "Editorial Product Index",
    items: [
      { key: "debates", title: "Debates", subtitle: "What people believe.", body: "Direct questions about work, money, identity, media, culture, power and the future. Vote privately. See where you stand.", cta: "Enter the Debates" },
      { key: "predictions", title: "Predictions", subtitle: "What people think will happen.", body: "Not what should happen. What people expect will happen. Track how confidence shifts over time. Sign up if you want to save your calls and come back to them later.", cta: "Make a Prediction" },
      { key: "pulse", title: "Pulse", subtitle: "What is actually happening.", body: "Sourced public signals that give context to the questions people are voting on.", cta: "Read The Pulse" },
      { key: "voices", title: "Voices", subtitle: "People with something to say.", body: "Curated profiles of people connected to the region through their work, choices and positions.", cta: "Explore Voices" },
      { key: "majlis", title: "The Gallery", subtitle: "A private room for serious conversation.", body: "A members only space for selected participants. No open comments. No algorithmic noise. No public performance.", cta: "Enter The Gallery" },
    ],
  },
  voices: {
    heading: "The Voices",
    subcopy: "Curated profiles of people with a clear connection to the region and a body of work we can verify.",
  },
  exploreTopics: { heading: "Explore Topics" },
  newsletter: {
    eyebrow: "The Weekly Brief",
    heading: "The sharpest questions and shifts from the week.",
    body: "A short weekly note from The Tribunal. New questions, live results, prediction shifts and the signals behind them.",
    bullets: ["New questions from the week", "Results worth paying attention to", "Prediction shifts as views change"],
    ctaLabel: "Get Updates",
    disclaimer: "No spam. Unsubscribe anytime.",
  },
};

// Shallow-merge each group; arrays are replaced wholesale when the CMS provides them.
function resolveHomeContent(cfg?: Partial<HomeContent>): HomeContent {
  const d = HOME_CONTENT_DEFAULTS;
  const c = (cfg ?? {}) as any;
  const cardsHeading =
    c.cards?.heading === "What you'll find here" ? d.cards.heading : c.cards?.heading;
  const cards = (c.cards?.items?.length ? c.cards.items : d.cards.items).map((item: HomeContent["cards"]["items"][number]) =>
    item.key === "majlis" ? { ...item, title: "The Gallery", cta: "Enter The Gallery" } : item
  );
  return {
    hero: { ...d.hero, ...c.hero, stats: c.hero?.stats?.length ? c.hero.stats : d.hero.stats },
    intro: { ...d.intro, ...c.intro, negations: c.intro?.negations?.length ? c.intro.negations : d.intro.negations },
    cards: { ...d.cards, ...c.cards, heading: cardsHeading ?? d.cards.heading, items: cards },
    voices: { ...d.voices, ...c.voices },
    exploreTopics: { ...d.exploreTopics, ...c.exploreTopics },
    newsletter: { ...d.newsletter, ...c.newsletter, bullets: c.newsletter?.bullets?.length ? c.newsletter.bullets : d.newsletter.bullets },
  };
}

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
          <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-muted-foreground font-serif">
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
                <span className="text-muted-foreground text-[13px] ml-2">
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
    // Use the canonical newsletter endpoint (the legacy /api/email-subscribe
    // path didn't exist on the server, so submissions were silently lost).
    fetch(`${API_BASE_HOME}/api/newsletter/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), source: "prediction_gate", newsletterOptIn }),
    }).catch(() => {});
    track("newsletter_subscribed", { source: "prediction_gate", optedIn: newsletterOptIn });
    setTimeout(unlock, 800);
  };

  const noData = featured.data.map((v) => 100 - v);

  return (
    <div
      className="bg-card border border-border rounded-[4px] flex flex-col lg:flex-row gap-0 overflow-hidden"
      style={{ borderWidth: "1.5px" }}
    >
      <div className="flex-1 px-6 pb-7 pt-4 sm:px-8 sm:pb-8 sm:pt-5">
        <p className="mb-1 text-left font-serif text-[13px] font-bold uppercase tracking-[0.15em] text-muted-foreground sm:text-sm">
          Confidence Over Time — Yes %
        </p>
        <svg
          viewBox={`0 0 ${chartW} ${chartH}`}
          className="w-full"
          style={{ maxHeight: 220 }}
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
                fontSize="7"
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
                fontSize="6.5"
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
              fontSize="7"
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
                    fontSize="6.5"
                    fontFamily="'Barlow Condensed', sans-serif"
                  >
                    {months[hovIdx % 12]} 2026
                  </text>
                  <text
                    x={tipX + 4}
                    y={tipY + 18}
                    fill="#10B981"
                    fontSize="8"
                    fontWeight="700"
                    fontFamily="'Barlow Condensed', sans-serif"
                  >
                    {yVal}% YES
                  </text>
                  <text
                    x={tipX + 4}
                    y={tipY + 26}
                    fill={delta >= 0 ? "#10B981" : "#DC143C"}
                    fontSize="6.5"
                    fontFamily="'Barlow Condensed', sans-serif"
                  >
                    {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}% vs
                    last month
                  </text>
                </g>
              );
            })()}
        </svg>
        <p
          className="mt-4 w-fit text-left font-serif text-[13px] font-bold tracking-[0.04em] sm:mt-5 sm:text-sm"
          style={{ color: featured.up ? "#10B981" : "#DC143C" }}
        >
          {featured.up ? "▲" : "▼"} Confidence moved {featured.up ? "+" : "-"}
          {featured.momentum}% in the last 30 days
        </p>
      </div>
      <div className="flex-1 p-6 sm:p-8 border-t lg:border-t-0 lg:border-l border-border flex flex-col justify-between gap-5">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className="px-3 py-1 bg-foreground text-background text-[13px] font-bold uppercase tracking-[0.16em] font-serif">
              {featured.category}
            </span>
            <span
              className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] font-serif rounded-sm"
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
              className="font-serif font-black uppercase text-xl sm:text-2xl text-foreground tracking-tight cursor-pointer hover:text-primary transition-colors"
              style={{ lineHeight: 1.08 }}
            >
              {featured.question}
            </p>
          </Link>
          <p className="text-[13px] text-muted-foreground font-serif mt-3">
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
                      className="text-[12px] uppercase tracking-[0.15em] font-bold font-serif"
                      style={{ color: "#10B981" }}
                    >
                      Yes
                    </span>
                    <span
                      className="text-[12px] font-bold font-serif"
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
                      className="text-[12px] uppercase tracking-[0.15em] font-bold font-serif"
                      style={{ color: "#DC143C" }}
                    >
                      No
                    </span>
                    <span
                      className="text-[12px] font-bold font-serif"
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
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-serif mb-2 font-bold">
                Lock your prediction
              </p>
              <div className="flex gap-2">
                <motion.button
                  onClick={() => handleVote("yes")}
                  whileTap={{ scale: 0.97 }}
                  className="flex-1 py-2.5 border font-bold text-[13px] uppercase tracking-[0.12em] font-serif transition-colors duration-150 hover:bg-[#10B981] hover:border-[#10B981]"
                  style={{ borderColor: "#10B981", color: "#10B981" }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "#fff"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "#10B981"; }}
                >
                  Yes
                </motion.button>
                <motion.button
                  onClick={() => handleVote("no")}
                  whileTap={{ scale: 0.97 }}
                  className="flex-1 py-2.5 border font-bold text-[13px] uppercase tracking-[0.12em] font-serif transition-colors duration-150 hover:bg-[#DC143C] hover:border-[#DC143C]"
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
                <div className="flex items-center gap-2 text-[12px] uppercase tracking-widest font-bold text-[#3B82F6] font-serif">
                  <Lock className="w-3.5 h-3.5" />
                  Prediction locked — {vote?.toUpperCase()}
                </div>
                <p className="text-[12px] text-muted-foreground font-serif">
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
                    className="flex-1 py-2 bg-[#25D366] text-white text-[12px] font-bold uppercase tracking-wider font-serif rounded-sm hover:opacity-90 transition-opacity"
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
                    className="flex-1 py-2 bg-foreground text-background text-[12px] font-bold uppercase tracking-wider font-serif rounded-sm hover:opacity-90 transition-opacity"
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
                    className="flex-1 py-2 bg-[#0A66C2] text-white text-[12px] font-bold uppercase tracking-wider font-serif rounded-sm hover:opacity-90 transition-opacity"
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
                        className="bg-transparent text-[13px] font-sans text-foreground outline-none flex-1 placeholder:text-muted-foreground/50"
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-3 py-2 bg-[#3B82F6] text-white text-[12px] font-bold uppercase tracking-wider font-serif rounded-sm hover:opacity-90 transition-opacity"
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
                    <span className="text-[10px] text-muted-foreground font-sans">
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
                      className="text-[12px] uppercase tracking-[0.15em] font-bold font-serif"
                      style={{ color: "#10B981" }}
                    >
                      Yes
                    </span>
                    <span
                      className="text-[12px] font-bold font-serif"
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
                  <p className="text-[9px] text-muted-foreground font-serif mt-0.5">
                    {featured.up ? "▲" : "▼"} Up {featured.momentum}% this week
                  </p>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span
                      className="text-[12px] uppercase tracking-[0.15em] font-bold font-serif"
                      style={{ color: "#DC143C" }}
                    >
                      No
                    </span>
                    <span
                      className="text-[12px] font-bold font-serif"
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
                <span className="text-[12px] font-bold uppercase tracking-widest text-[#3B82F6] font-serif">
                  ✓ You predicted {vote?.toUpperCase()} — Locked until{" "}
                  {featured.resolves}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <Link
                  href="/predictions"
                  className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground font-serif transition-colors flex items-center gap-1"
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
            <p className="text-[14px] uppercase tracking-widest text-[#3B82F6] font-serif font-bold">
              {pred.category}
            </p>
            <p className="font-serif font-black uppercase text-[15px] leading-tight text-foreground mt-1 group-hover:text-primary transition-colors">
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
            className="text-[11px] font-bold font-serif"
            style={{ color: "#10B981" }}
          >
            Yes {pred.yes}%
          </span>
          <span
            className="text-[11px] font-bold font-serif"
            style={{ color: "#DC143C" }}
          >
            No {pred.no}%
          </span>
          {vote ? (
            <span className="text-[9px] font-bold font-serif ml-auto text-[#3B82F6]">
              ✓ {vote.toUpperCase()}
            </span>
          ) : (
            <span className="ml-auto flex gap-1">
              <motion.button
                onClick={(e) => handleQuickVote("yes", e)}
                whileTap={{ scale: 0.93 }}
                className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider font-serif border border-[#10B981]/40 text-[#10B981] hover:bg-[#10B981] hover:text-white transition-colors rounded-sm"
              >
                Y
              </motion.button>
              <motion.button
                onClick={(e) => handleQuickVote("no", e)}
                whileTap={{ scale: 0.93 }}
                className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider font-serif border border-[#DC143C]/40 text-[#DC143C] hover:bg-[#DC143C] hover:text-white transition-colors rounded-sm"
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

function MixedTicker({ items }: { items: TickerItem[] }) {
  if (items.length === 0) return null;
  const doubled = [...items, ...items];

  return (
    <div
      className="min-h-[48px] overflow-hidden border-y border-white/10 bg-[#0D0D0D]"
      aria-label="Live questions and predictions"
    >
      <div className="tmh-ticker-scroll">
        {doubled.map((item, i) => (
          <Link
            key={`${item.href}-${i}`}
            href={item.href}
            className="flex items-center gap-2.5 border-r border-white/10 px-8 py-3 no-underline"
          >
            <span
              className={cn(
                "whitespace-nowrap border px-1.5 py-0.5 font-serif text-[10px] font-extrabold uppercase tracking-[0.12em]",
                item.badge === "DEBATE"
                  ? "border-primary/30 bg-primary/15 text-primary"
                  : item.badge === "PREDICTION"
                    ? "border-blue-500/30 bg-blue-500/15 text-blue-400"
                    : "border-green-500/30 bg-green-500/15 text-green-400",
              )}
            >
              {item.badge}
            </span>
            <span className="whitespace-nowrap font-serif text-[13px] font-bold uppercase tracking-[0.08em] text-white/75">
              {item.topic}
            </span>
            <span className="whitespace-nowrap font-serif text-sm font-bold text-white">
              {item.stat}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  usePageTitle({
    description: "Private voting on what the region really thinks about power, money, culture, work, media and the future.",
  });
  // Fetch homepage CMS config first (needed for content selection)
  const { data: homepageConfig, isLoading: homeConfigLoading } = useHomepageConfig<{
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
    sections?: HomeSectionConfig[];
    sectionVisibility?: Record<string, boolean>;
    content?: Partial<HomeContent>;
  }>();

  // Resolved, CMS-overridable home-page copy (falls back to HOME_CONTENT_DEFAULTS)
  const C = resolveHomeContent(homepageConfig?.content);

  // Per-section show/hide for experiments, driven by the CMS Homepage Manager
  // (Section Visibility tab). A section is visible unless explicitly set false,
  // so existing installs render exactly as before until a toggle is flipped.
  const sectionVisibility = homepageConfig?.sectionVisibility ?? {};
  const showSection = (key: string) => sectionVisibility[key] !== false;

  // Hold the hero copy hidden until the CMS config resolves, so the hardcoded
  // fallback text never flashes before the real (CMS) values load on first paint.
  // Falls back to true on error/cache hit, so defaults still show if there's no CMS value.
  const heroReady = !homeConfigLoading;

  // Extract CMS-selected content IDs
  const leadDebateSection = homepageConfig?.sections?.find((s) => s.type === "lead_debate");
  const cmsSelectedDebateId = resolveActiveLeadDebateId(leadDebateSection);

  // Top debate/prediction of the day (auto). A CMS-pinned lead debate wins;
  // otherwise the lead debate auto-replaces with the day's top debate.
  const { data: topPost } = useTopPost();
  const effectiveDebateId = cmsSelectedDebateId ?? topPost?.topDebate?.id;

  // Lead debate: dated CMS schedule → CMS fallback pick → top debate of the day → first trending debate.
  const { data: selectedPoll, isLoading: selectedPollLoading } = useGetPoll(
    effectiveDebateId ?? 0,
    { query: { enabled: !!effectiveDebateId } as any },
  );

  const { data: trendingPolls, isLoading: trendingLoading } = useListPolls({
    filter: "trending",
    limit: 5,
  });
  const featuredPoll = selectedPoll ?? trendingPolls?.polls?.[0];
  const featuredLoading = effectiveDebateId ? selectedPollLoading : trendingLoading;
  const leadDebateDeck = useMemo(() => {
    const byId = new Map<number, Poll>();
    if (featuredPoll) byId.set(featuredPoll.id, featuredPoll);
    for (const poll of trendingPolls?.polls ?? []) byId.set(poll.id, poll);
    return [...byId.values()].slice(0, 5);
  }, [featuredPoll, trendingPolls?.polls]);
  const [activeLeadId, setActiveLeadId] = useState<number | null>(null);
  const [completedLeadIds, setCompletedLeadIds] = useState<number[]>([]);
  const [showMoreDebatesModal, setShowMoreDebatesModal] = useState(false);
  const moreDebatesModalShownRef = useRef(false);
  const leadAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeLeadDebate =
    leadDebateDeck.find((poll) => poll.id === activeLeadId) ?? leadDebateDeck[0];
  const queuedLeadDebates = leadDebateDeck.filter(
    (poll) => poll.id !== activeLeadDebate?.id && !completedLeadIds.includes(poll.id),
  );

  useEffect(() => {
    if (leadDebateDeck.length === 0) return;
    setActiveLeadId((current) =>
      current && leadDebateDeck.some((poll) => poll.id === current)
        ? current
        : leadDebateDeck[0].id,
    );
  }, [leadDebateDeck]);

  useEffect(() => () => {
    if (leadAdvanceTimer.current) clearTimeout(leadAdvanceTimer.current);
  }, []);

  useEffect(() => {
    if (!showMoreDebatesModal) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowMoreDebatesModal(false);
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [showMoreDebatesModal]);

  const promoteLeadDebate = useCallback((pollId: number) => {
    if (leadAdvanceTimer.current) clearTimeout(leadAdvanceTimer.current);
    setActiveLeadId(pollId);
  }, []);

  const handleLeadVoteComplete = useCallback((pollId: number) => {
    const completed = new Set([...completedLeadIds, pollId]);
    const next = leadDebateDeck.find((poll) => !completed.has(poll.id));
    setCompletedLeadIds([...completed]);
    if (leadAdvanceTimer.current) clearTimeout(leadAdvanceTimer.current);
    const queueLimit = Math.min(HOMEPAGE_DEBATE_LIMIT, leadDebateDeck.length);
    if (!next || completed.size >= queueLimit) {
      leadAdvanceTimer.current = setTimeout(() => {
        if (moreDebatesModalShownRef.current) return;
        moreDebatesModalShownRef.current = true;
        setShowMoreDebatesModal(true);
        track("homepage_debate_limit_prompt_viewed", { answered: completed.size });
      }, 1400);
      return;
    }
    leadAdvanceTimer.current = setTimeout(() => setActiveLeadId(next.id), 1400);
  }, [completedLeadIds, leadDebateDeck]);
  const { data: featuredProfiles, isLoading: profilesLoading } =
    useListProfiles({ filter: "featured", limit: 8 });
  const { data: apiPredictions, isLoading: predictionsLoading } = usePredictions();
  const { data: apiPulseTopics, isLoading: pulseLoading } = usePulseTopics();
  const { data: siteSettings } = useSiteSettings();
  const majlisEnabled = siteSettings?.featureToggles?.majlis?.enabled ?? false;
  const voicesEnabled = siteSettings?.featureToggles?.voices?.enabled ?? false;
  const pulseEnabled = siteSettings?.featureToggles?.pulse?.enabled ?? false;
  const [pulseHovIdx, setPulseHovIdx] = useState<number | null>(null);
  const menaPop = usePopulationCounter(
    homepageConfig?.masthead?.basePopulation,
    homepageConfig?.masthead?.growthRate,
  );
  const { t } = useI18n();
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

  // Featured prediction: the day's top prediction if it's in the list, else the
  // first one. (Predictions have no separate CMS pin today.)
  const featuredPrediction = useMemo(() => {
    const topId = topPost?.topPrediction?.id;
    return (topId != null && PREDICTIONS.find((p) => p.id === topId)) || PREDICTIONS[0];
  }, [PREDICTIONS, topPost]);

  const debateItems = useMemo<TickerItem[]>(() => {
    const byId = new Map<number, Poll>();
    if (selectedPoll) byId.set(selectedPoll.id, selectedPoll);
    for (const poll of trendingPolls?.polls ?? []) byId.set(poll.id, poll);

    return [...byId.values()]
      .filter((poll) => {
        const topic = cleanTickerTopic(poll.question);
        return (
          topic.length > 0 &&
          isOpenTickerWindow(poll.endsAt) &&
          (poll.totalVotes ?? 0) >= TICKER_MIN_VOTES
        );
      })
      .slice(0, 4)
      .map((poll) => ({
        topic: cleanTickerTopic(poll.question),
        badge: "DEBATE",
        stat: `${(poll.totalVotes ?? 0).toLocaleString()} votes`,
        href: `/debates/${poll.id}`,
      }));
  }, [selectedPoll, trendingPolls]);

  const predictionItems = useMemo<TickerItem[]>(() => {
    if (!apiPredictions?.items?.length) return [];
    const topPredictionId = topPost?.topPrediction?.id;
    const sorted = [...apiPredictions.items].sort((a, b) => {
      if (a.id === topPredictionId) return -1;
      if (b.id === topPredictionId) return 1;
      if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
      return (b.totalCount ?? 0) - (a.totalCount ?? 0);
    });

    return sorted
      .filter((prediction) => {
        const topic = cleanTickerTopic(prediction.question);
        return (
          topic.length > 0 &&
          isLiveEditorialStatus(prediction.editorialStatus) &&
          isOpenTickerWindow(prediction.resolvesAt) &&
          (prediction.totalCount ?? 0) >= TICKER_MIN_VOTES
        );
      })
      .slice(0, 3)
      .map((prediction) => ({
        topic: cleanTickerTopic(prediction.question),
        badge: "PREDICTION",
        stat: `${prediction.yesPercentage}% yes`,
        href: `/predictions/${prediction.id}`,
      }));
  }, [apiPredictions, topPost]);

  const pulseItems = useMemo<TickerItem[]>(() => {
    if (!pulseEnabled) return [];
    if (!apiPulseTopics?.items?.length) return [];
    return apiPulseTopics.items
      .filter((topic) => cleanTickerTopic(topic.title).length > 0 && isLiveEditorialStatus(topic.editorialStatus))
      .slice(0, 3)
      .map((topic) => ({
        topic: cleanTickerTopic(topic.title),
        badge: "PULSE",
        stat: `${topic.deltaUp ? "↑" : "↓"} ${topic.delta}`,
        href: `/pulse?shared=${encodeURIComponent(topic.topicId)}`,
      }));
  }, [apiPulseTopics, pulseEnabled]);
  const maxTickerLength = Math.max(
    debateItems.length,
    predictionItems.length,
    pulseItems.length,
  );
  const tickerItems: TickerItem[] = [];
  for (let index = 0; index < maxTickerLength; index += 1) {
    if (debateItems[index]) tickerItems.push(debateItems[index]);
    if (predictionItems[index]) tickerItems.push(predictionItems[index]);
    if (pulseItems[index]) tickerItems.push(pulseItems[index]);
  }
  const visibleTickerItems = tickerItems.length >= 2 ? tickerItems : [];

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
      {showSection("hero") && (
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
          <motion.div
            className="py-8 my-3 sm:py-10"
            style={{
              borderTop: "2px solid #DC143C",
            }}
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE_OUT_EXPO }}
          >
            <div className="flex flex-col items-center gap-8">
              {/* Hero copy */}
              <div
                className="flex flex-col items-center justify-center w-full text-center"
                style={{ opacity: heroReady ? 1 : 0, transition: "opacity 0.35s ease" }}
              >
                {/* Eyebrow */}
                <motion.div
                  className="flex items-center gap-2.5 mb-5"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.15 }}
                >
                  <span className="relative flex w-2 h-2">
                    <span className="absolute inline-flex w-full h-full rounded-full bg-[#10B981] opacity-60 animate-ping" />
                    <span className="relative inline-flex w-2 h-2 rounded-full bg-[#10B981]" />
                  </span>
                  <span className="font-serif font-bold text-[12px] tracking-[0.32em] uppercase text-[#10B981]">
                    {t(C.hero.eyebrow)}
                  </span>
                </motion.div>
                {/* Headline */}
                <motion.h1
                  className="font-serif font-black uppercase tracking-[-0.01em] text-foreground text-center max-w-5xl"
                  style={{ fontSize: "clamp(2.2rem, 6vw, 4.5rem)", lineHeight: 0.95 }}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.75, ease: EASE_OUT_EXPO, delay: 0.1 }}
                >
                  {t(C.hero.headline)}
                  <span className="text-primary">.</span>
                </motion.h1>
              </div>

            </div>
          </motion.div>
        </div>
      </motion.div>
      )}

      {/* ── SUBTLE PARTICIPATION CTAS ── */}
      {showSection("lead_debate") && showSection("ticker") && (
        <nav
          className="border-b border-border/60 bg-background"
          aria-label={t("Choose how to participate")}
        >
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-8 gap-y-5 px-4 pb-10 pt-5 sm:gap-x-14 sm:px-6 sm:pb-12 sm:pt-6 lg:px-8">
            <Link
              href="/debates"
              className="group inline-flex min-h-10 items-center gap-2 bg-primary px-6 py-3 font-serif text-[12px] font-bold uppercase tracking-[0.14em] text-primary-foreground transition-colors hover:bg-primary/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:px-8"
            >
              {t("Join a debate")}
              <ArrowRight className="h-3 w-3 text-current transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
            <Link
              href="/predictions"
              className="group inline-flex min-h-10 items-center border-b-2 border-primary/70 px-2 py-2.5 font-serif text-[12px] font-bold uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:border-primary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              {t("Make a prediction")}
            </Link>
          </div>
        </nav>
      )}

      {/* ── LIVE EDITORIAL TICKER ── */}
      {showSection("lead_debate") && showSection("ticker") && (
        (trendingLoading || predictionsLoading || pulseLoading) && visibleTickerItems.length === 0
          ? <TickerSkeleton />
          : <MixedTicker items={visibleTickerItems} />
      )}

      {/* ── FRONT PAGE: Lead Debate + Sidebar ── */}
      {showSection("lead_debate") && (
      <section id="debates" className="scroll-mt-20 bg-background py-8 border-b border-border relative">
        <FadeUp>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div
            className={cn(
              "grid grid-cols-1 gap-0",
              (trendingLoading || queuedLeadDebates.length > 0) && "lg:grid-cols-[1fr_320px]",
            )}
          >
            <div
              className={cn(
                (trendingLoading || queuedLeadDebates.length > 0) && "pb-8 lg:border-r lg:border-border lg:pb-0 lg:pr-8",
              )}
            >
              <FadeIn delay={0.1}>
              <div className="mb-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 font-serif text-sm font-bold uppercase tracking-[0.22em] text-primary">
                  <span className="h-2 w-2 rounded-full bg-[#10B981] animate-pulse" />
                  {t("TODAY'S LEAD DEBATE")}
                </div>
                {completedLeadIds.length > 0 && (
                  <span className="font-serif text-[10px] font-bold uppercase tracking-widest text-muted-foreground" aria-live="polite">
                    {completedLeadIds.length} answered
                  </span>
                )}
              </div>
              </FadeIn>
              {featuredLoading ? (
                <div className="h-96 bg-secondary animate-pulse border border-border" />
              ) : activeLeadDebate ? (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeLeadDebate.id}
                    initial={{ opacity: 0, x: 28 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -28 }}
                    transition={{ duration: 0.35, ease: EASE_OUT_EXPO }}
                  >
                    <PollCard
                      poll={activeLeadDebate}
                      featured
                      onVoteComplete={handleLeadVoteComplete}
                    />
                  </motion.div>
                </AnimatePresence>
              ) : null}

              {!trendingLoading && queuedLeadDebates.length === 0 && (
                <FadeIn delay={0.15}>
                  <div className="mt-5 border border-border bg-secondary/40 p-6 text-left">
                    <p className="font-serif text-sm font-black uppercase tracking-wide text-foreground">
                      Queue complete
                    </p>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      You have weighed in on every featured question.
                    </p>
                    <Link
                      href="/debates"
                      className="mt-4 inline-flex items-center gap-2 font-serif text-[10px] font-bold uppercase tracking-widest text-primary"
                    >
                      Find more debates <ArrowRight className="h-3 w-3" aria-hidden="true" />
                    </Link>
                  </div>
                </FadeIn>
              )}
            </div>

            {(trendingLoading || queuedLeadDebates.length > 0) && (
            <aside className="lg:pl-8 pt-8 lg:pt-0 border-t lg:border-t-0 border-border" aria-label="Upcoming debates">
              <FadeIn delay={0.15}>
              <div className="mb-5 flex items-center justify-between gap-3 border-l-4 border-primary pl-4">
                <h2 className="font-serif text-[12px] font-bold uppercase tracking-[0.25em] text-muted-foreground">
                  {t("Latest Debates")}
                </h2>
                <Link
                  href="/debates"
                  className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground font-serif transition-colors"
                >
                  {t("View All")}
                </Link>
              </div>
              </FadeIn>

              {trendingLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-28 bg-secondary animate-pulse border border-border" />
                  ))}
                </div>
              ) : (
                <div className="max-h-[46rem] space-y-4 overflow-y-auto pr-1 [scrollbar-width:thin]" role="list" aria-live="polite">
                  <AnimatePresence initial={false}>
                    {queuedLeadDebates.map((poll, index) => (
                      <motion.button
                        key={poll.id}
                        type="button"
                        role="listitem"
                        onClick={() => promoteLeadDebate(poll.id)}
                        layout
                        initial={{ opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: 36 }}
                        transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}
                        className="group w-full border border-border bg-card px-5 py-6 text-left transition-colors hover:border-primary hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-serif text-[11px] font-bold uppercase tracking-[0.22em] text-[#3B82F6]">
                            {poll.category}
                          </span>
                          <span
                            className={cn(
                              "font-serif text-[10px] font-black uppercase tracking-widest",
                              index === 0 ? "text-[#10B981]" : "text-[#D97706] dark:text-[#F59E0B]",
                            )}
                          >
                            {index === 0 ? "Next" : "In queue"}
                          </span>
                        </div>
                        <p className="mt-4 font-serif text-[15px] font-black uppercase leading-tight text-foreground transition-colors group-hover:text-primary">
                          {poll.question.length > 90
                            ? poll.question.slice(0, 90) + "..."
                            : poll.question}
                        </p>
                        <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
                          <span className="font-serif text-[11px] font-bold uppercase tracking-[0.14em] text-[#D97706] dark:text-[#F59E0B]">
                            {(poll.totalVotes ?? 0).toLocaleString()} votes
                          </span>
                          <span className="flex items-center gap-1 font-serif text-[10px] font-bold uppercase tracking-widest text-primary transition-colors group-hover:text-primary/75">
                            Make lead <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                          </span>
                        </div>
                      </motion.button>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </aside>
            )}
          </div>
        </div>
        </FadeUp>
      </section>
      )}

      {/* ── PREDICTIONS ── */}
      {showSection("predictions") && (
      <section
        id="predictions"
        className="py-8 bg-background border-b border-border relative"
      >
        <FadeUp delay={0.05}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div>
            {/* Today's Featured Prediction */}
            <div>
              <FadeIn delay={0.1}>
              <div className="text-base uppercase tracking-[0.2em] font-bold text-[#3B82F6] mb-5 flex items-center gap-2 font-serif">
                <span className="w-2 h-2 rounded-full bg-[#3B82F6] animate-pulse" />
                {t("FEATURED PREDICTION")}
              </div>
              </FadeIn>
              {(() => {
                const featured = featuredPrediction;
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

            {/* More predictions */}
            <div className="mt-8 border-t border-border pt-6">
              <FadeIn delay={0.15}>
              <div className="flex items-center justify-between mb-4">
                <p className="text-[12px] uppercase tracking-[0.25em] font-bold text-muted-foreground font-serif">
                  {t("Latest Predictions")}
                </p>
                <Link
                  href="/predictions"
                  className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground font-serif transition-colors"
                >
                  {t("View All")}
                </Link>
              </div>
              </FadeIn>

              <StaggerGrid className="grid grid-cols-1 gap-x-8 md:grid-cols-3">
                {(() => {
                  const seen = new Set<string>();
                  seen.add(featuredPrediction.category);
                  const mixed: typeof PREDICTIONS = [];
                  for (const p of PREDICTIONS) {
                    if (mixed.length >= 3) break;
                    if (p.id === featuredPrediction.id) continue;
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
      )}

      {/* ── THE PULSE ── (hidden until Pulse toggle is ON) */}
      {pulseEnabled && showSection("pulse") && (
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
                      <p className="text-[11px] uppercase tracking-[0.15em] font-bold text-muted-foreground font-serif mb-2">
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
                        className="text-[10px] font-serif mt-2"
                        style={{ color: topic.tagColor }}
                      >
                        {topic.deltaUp ? "▲" : "▼"} {topic.delta} year-over-year
                      </p>
                    </div>
                    <div className="flex-1 p-5 border-t lg:border-t-0 lg:border-l border-border flex flex-col justify-center gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="px-2.5 py-1 text-[13px] font-bold uppercase tracking-[0.18em] font-serif"
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
                          className="font-serif font-black text-2xl"
                          style={{ color: topic.tagColor }}
                        >
                          {topic.stat}
                        </span>
                        <span
                          className={cn(
                            "text-[12px] font-bold font-serif",
                            topic.deltaUp ? "text-[#10B981]" : "text-[#DC143C]",
                          )}
                        >
                          {topic.deltaUp ? "▲" : "▼"} {topic.delta}
                        </span>
                      </div>
                      <p className="text-[13px] text-muted-foreground font-sans leading-relaxed">
                        {topic.blurb}
                      </p>
                      <div className="flex items-center justify-between">
                        <p className="text-[9px] text-muted-foreground/60 font-serif uppercase tracking-widest">
                          Source: {topic.source}
                        </p>
                        <Link
                          href="/pulse"
                          className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-[#10B981] font-serif transition-colors flex items-center gap-1"
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
                <p className="text-[12px] uppercase tracking-[0.25em] font-bold text-muted-foreground font-serif">
                  {t("Latest Trends")}
                </p>
                <Link
                  href="/pulse"
                  className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground font-serif transition-colors"
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
                            className="text-[10px] uppercase tracking-widest font-serif font-bold"
                            style={{ color: t2.tagColor }}
                          >
                            {t2.tag}
                          </p>
                          <p className="font-serif font-black uppercase text-[14px] leading-tight text-foreground mt-1 group-hover:text-primary transition-colors">
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
                          className="text-[10px] font-bold font-serif"
                          style={{ color: t2.tagColor }}
                        >
                          {t2.stat}
                        </span>
                        <span
                          className={cn(
                            "text-[9px] font-bold font-serif ml-auto",
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
      )}

      {/* ── THE VOICES ── */}
      {voicesEnabled && showSection("voices") && (
      <section className="bg-foreground text-background py-20 border-b border-border">
        <FadeUp>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-4">
            <div>
              <h2 className="font-serif font-black text-4xl md:text-5xl uppercase tracking-tight text-background leading-none">
                {t(C.voices.heading)}
              </h2>
              <SlideReveal color="#DC143C" height={4} className="mt-3" delay={0.3} />
            </div>
            <Link
              href="/voices"
              className="hidden sm:inline-block text-[12px] font-bold uppercase tracking-widest text-background/70 hover:text-background font-serif"
            >
              {t("View All →")}
            </Link>
          </div>
          <FadeIn delay={0.15}>
          <p className="text-background/75 font-sans text-base mt-4 mb-10 max-w-xl">
            {t(C.voices.subcopy)}
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
                {t("Enter The Gallery")}
              </Link>
              </motion.div>
            )}
          </div>
          </FadeUp>
        </div>
        </FadeUp>
      </section>
      )}

      {/* ── ABOUT ── */}
      {showSection("about") && (
      <Suspense fallback={null}>
        <AboutSection />
      </Suspense>
      )}

      {/* ── LIVE ACTIVITY ── */}
      {showSection("live_activity") && <LiveActivity />}

      <AnimatePresence>
        {showMoreDebatesModal && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/75 px-4 py-8 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setShowMoreDebatesModal(false);
            }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="more-debates-title"
              aria-describedby="more-debates-description"
              className="relative w-full max-w-lg border-2 border-foreground bg-background p-6 shadow-[10px_10px_0_#DC143C] sm:p-8"
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}
            >
              <button
                type="button"
                onClick={() => setShowMoreDebatesModal(false)}
                className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center border border-border text-muted-foreground transition-colors hover:border-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="Close"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
              <p className="font-serif text-[11px] font-bold uppercase tracking-[0.28em] text-primary">
                Featured queue complete
              </p>
              <h2
                id="more-debates-title"
                className="mt-3 max-w-md font-serif text-3xl font-black uppercase leading-none text-foreground sm:text-4xl"
              >
                Looking for more debates?
              </h2>
              <p id="more-debates-description" className="mt-4 max-w-md font-sans text-sm leading-relaxed text-muted-foreground sm:text-base">
                You have answered the featured questions. Explore every active debate, or stay here to review the results you unlocked.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/debates"
                  onClick={() => track("homepage_debate_limit_cta_clicked", { answered: completedLeadIds.length })}
                  className="inline-flex items-center justify-center gap-2 bg-primary px-6 py-3 font-serif text-xs font-bold uppercase tracking-[0.16em] text-white transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  Explore all debates <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
                <button
                  type="button"
                  onClick={() => setShowMoreDebatesModal(false)}
                  className="px-5 py-3 font-serif text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  Not now
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
}
