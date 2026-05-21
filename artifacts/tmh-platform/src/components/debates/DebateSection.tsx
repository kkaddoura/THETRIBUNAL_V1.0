import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Poll, PollListResponse } from "@workspace/api-client-react";
import { HorizontalScroller } from "./HorizontalScroller";
import { PollTeaserCard } from "./PollTeaserCard";
import { DebateCardSkeleton } from "@/components/skeletons/DebateCardSkeleton";
import { useVoter } from "@/hooks/use-voter";

const SECTION_FETCH_LIMIT = 60;
// A just-voted card lives through two phases before the next pool item
// takes its place:
//   1. "held"    — stays put at full opacity long enough for the in-card
//                   "Vote Recorded" confirmation + collapse to play.
//   2. "exiting"  — slides left + fades, then is removed so siblings reflow.
// Total visible grace ≈ VOTE_HOLD_MS + VOTE_EXIT_MS (~3450ms).
const VOTE_HOLD_MS = 3000;
const VOTE_EXIT_MS = 450;
// Kept for callers/readers expecting a single tunable: total grace window.
const VOTE_GRACE_MS = VOTE_HOLD_MS + VOTE_EXIT_MS;

export interface DebateSectionConfig {
  id: string;
  enabled: boolean;
  order: number;
  title: string;
  subtitle?: string;
  mode: "manual" | "tag" | "category";
  manualPostIds?: number[];
  tag?: string;
  categorySlug?: string;
  cardLimit: number;
  showSeeAll: boolean;
}

interface Props {
  section: DebateSectionConfig;
}

async function fetchSectionPolls(section: DebateSectionConfig): Promise<Poll[]> {
  const params = new URLSearchParams();
  params.set("limit", String(Math.max(section.cardLimit, SECTION_FETCH_LIMIT)));
  if (section.mode === "manual") {
    const ids = (section.manualPostIds ?? []).filter((n) => Number.isFinite(n) && n > 0);
    if (ids.length === 0) return [];
    params.set("ids", ids.join(","));
  } else if (section.mode === "category") {
    const slug = (section.categorySlug ?? "").trim();
    if (!slug) return [];
    params.set("category", slug);
    params.set("filter", "latest");
  } else {
    const tag = (section.tag ?? "").trim();
    if (!tag) return [];
    params.set("tag", tag);
  }
  const res = await fetch(`/api/polls?${params.toString()}`);
  if (!res.ok) return [];
  const data: PollListResponse = await res.json();
  return data.polls ?? [];
}

export function DebateSection({ section }: Props) {
  const queryKey =
    section.mode === "manual"
      ? ["debates-section", section.id, "ids", section.manualPostIds]
      : section.mode === "category"
        ? ["debates-section", section.id, "category", section.categorySlug]
        : ["debates-section", section.id, "tag", section.tag];

  const enabled =
    section.mode === "manual"
      ? (section.manualPostIds ?? []).length > 0
      : section.mode === "category"
        ? !!section.categorySlug?.trim()
        : !!section.tag?.trim();

  const { data, isLoading } = useQuery<Poll[]>({
    queryKey,
    queryFn: () => fetchSectionPolls(section),
    staleTime: 60_000,
    enabled,
  });

  const { hasVoted } = useVoter();

  // Polls already voted when this pool arrives never appear. A poll voted
  // *in this session* (here) gets a short grace window so its confirmation
  // can play, then it drops out — and because the section over-fetches a
  // deep pool, the next unseen item slides straight into its place.
  const poolRef = useRef<Poll[] | null>(null);
  const initiallyVotedRef = useRef<Set<number>>(new Set());
  // Polls still rendered post-vote (held OR exiting).
  const gracedRef = useRef<Set<number>>(new Set());
  // Subset of gracedRef currently playing the slide-left + fade exit.
  const exitingRef = useRef<Set<number>>(new Set());
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const unmountedRef = useRef(false);
  const [, bump] = useState(0);

  if (data && data !== poolRef.current) {
    poolRef.current = data;
    initiallyVotedRef.current = new Set(data.filter((p) => hasVoted(p.id)).map((p) => p.id));
  }

  // Detect newly-voted polls SYNCHRONOUSLY during render (not in a post-
  // render useEffect): otherwise the filter below runs first on the
  // vote-triggered re-render with `hasVoted=true` and grace empty, so the
  // card unmounts in that frame — the user-visible "card disappears
  // immediately on vote" bug. Mutating refs + scheduling timers during
  // render is a deliberate side effect; the guards (`!gracedRef.current.has`
  // / `!timersRef.current.has`) keep it idempotent across Strict Mode
  // re-invocations and React 18 render retries (refs persist across both).
  if (data) {
    const initialNow = initiallyVotedRef.current;
    for (const p of data) {
      if (
        hasVoted(p.id) &&
        !initialNow.has(p.id) &&
        !gracedRef.current.has(p.id) &&
        !timersRef.current.has(p.id)
      ) {
        const id = p.id;
        gracedRef.current.add(id);
        // Phase 1 (held): stay put at full opacity ~3s — lets the in-card
        // "Vote Recorded" confirmation play.
        const holdTimer = setTimeout(() => {
          if (unmountedRef.current) return;
          exitingRef.current.add(id);
          bump((n) => n + 1);
          // Phase 2 (exiting): slide-left + fade ~450ms, then drop from
          // the pool so siblings reflow and the next item slides in.
          const exitTimer = setTimeout(() => {
            if (unmountedRef.current) return;
            gracedRef.current.delete(id);
            exitingRef.current.delete(id);
            timersRef.current.delete(id);
            bump((n) => n + 1);
          }, VOTE_EXIT_MS);
          timersRef.current.set(id, exitTimer);
        }, VOTE_HOLD_MS);
        timersRef.current.set(id, holdTimer);
      }
    }
  }

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      unmountedRef.current = true;
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
    };
  }, []);

  const initial = initiallyVotedRef.current;
  const visiblePolls = data
    ? data.filter((p) => !initial.has(p.id) && (!hasVoted(p.id) || gracedRef.current.has(p.id)))
    : [];

  // Section has zero posts from the server (manual list empty, tag/category
  // unused) — hide entirely.
  if (!isLoading && (data?.length ?? 0) === 0) return null;

  // Posts exist but the user has voted on all of them. Keep the section
  // visible with an "all caught up" empty state instead of yanking the
  // whole section out — yanking caused a "card disappears and reappears"
  // flicker when a section had a single card and the user voted on it.
  const allCaughtUp = !isLoading && visiblePolls.length === 0;

  return (
    <section className="py-12 sm:py-14 border-t border-foreground/15 first:border-t-0 first:pt-4">
      <div className="mb-6 px-1">
        <span className="block h-0.5 w-10 bg-primary mb-3" aria-hidden />
        <h2
          className="font-black uppercase text-foreground"
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: "clamp(1.3rem, 2.5vw, 1.75rem)",
            letterSpacing: "-0.01em",
            lineHeight: 1.05,
          }}
        >
          {section.title}
        </h2>
        {section.subtitle && (
          <p className="text-sm text-muted-foreground mt-2 font-sans">{section.subtitle}</p>
        )}
      </div>

      {isLoading ? (
        <div className="flex gap-4 overflow-hidden px-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="shrink-0 w-[85%] sm:w-[55%] lg:w-[38%] xl:w-[32%] min-h-[340px] sm:min-h-[360px]">
              <DebateCardSkeleton />
            </div>
          ))}
        </div>
      ) : allCaughtUp ? (
        <div className="px-1 py-10 border border-dashed border-foreground/15 bg-secondary/20 text-center">
          <p className="font-serif font-bold text-base uppercase tracking-wider text-foreground/80">
            You're all caught up here.
          </p>
          <p className="text-xs text-muted-foreground mt-1.5 font-sans">
            You've voted on every debate in this section.
          </p>
        </div>
      ) : (
        <HorizontalScroller ariaLabel={section.title}>
          <style>{`
            .tmh-poll-item {
              transition: transform ${VOTE_EXIT_MS}ms cubic-bezier(.4,0,.2,1),
                          opacity ${VOTE_EXIT_MS}ms cubic-bezier(.4,0,.2,1);
              will-change: transform, opacity;
            }
            .tmh-poll-exit {
              transform: translateX(-115%);
              opacity: 0;
              pointer-events: none;
            }
          `}</style>
          {visiblePolls.map((poll) => (
            <div
              key={poll.id}
              className={
                "tmh-poll-item snap-start shrink-0 w-[85%] sm:w-[55%] lg:w-[38%] xl:w-[32%] min-h-[340px] sm:min-h-[360px]" +
                (exitingRef.current.has(poll.id) ? " tmh-poll-exit" : "")
              }
            >
              <PollTeaserCard poll={poll} />
            </div>
          ))}
        </HorizontalScroller>
      )}
    </section>
  );
}
