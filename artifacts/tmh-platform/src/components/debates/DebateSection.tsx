import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Poll, PollListResponse } from "@workspace/api-client-react";
import { HorizontalScroller } from "./HorizontalScroller";
import { PollTeaserCard } from "./PollTeaserCard";
import { DebateCardSkeleton } from "@/components/skeletons/DebateCardSkeleton";
import { useVoter } from "@/hooks/use-voter";

const SECTION_FETCH_LIMIT = 60;
// How long a just-voted card stays before it drops out and the next pool
// item slides into its place (long enough for the in-card "Vote Recorded"
// confirmation + collapse to play).
const VOTE_GRACE_MS = 2400;

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
  const gracedRef = useRef<Set<number>>(new Set());
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const [, bump] = useState(0);

  if (data && data !== poolRef.current) {
    poolRef.current = data;
    initiallyVotedRef.current = new Set(data.filter((p) => hasVoted(p.id)).map((p) => p.id));
  }

  // Re-runs whenever the user votes on a pool item (votedInPool changes).
  const votedInPool = data ? data.reduce((n, p) => n + (hasVoted(p.id) ? 1 : 0), 0) : 0;
  useEffect(() => {
    if (!data) return;
    const initial = initiallyVotedRef.current;
    for (const p of data) {
      if (
        hasVoted(p.id) &&
        !initial.has(p.id) &&
        !gracedRef.current.has(p.id) &&
        !timersRef.current.has(p.id)
      ) {
        gracedRef.current.add(p.id);
        const t = setTimeout(() => {
          gracedRef.current.delete(p.id);
          timersRef.current.delete(p.id);
          bump((n) => n + 1);
        }, VOTE_GRACE_MS);
        timersRef.current.set(p.id, t);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, votedInPool]);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
    };
  }, []);

  const initial = initiallyVotedRef.current;
  const visiblePolls = data
    ? data.filter((p) => !initial.has(p.id) && (!hasVoted(p.id) || gracedRef.current.has(p.id)))
    : [];

  // Hide section entirely when no posts (Decision E2) or all are filtered out
  if (!isLoading && visiblePolls.length === 0) return null;

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
      ) : (
        <HorizontalScroller ariaLabel={section.title}>
          {visiblePolls.map((poll) => (
            <div
              key={poll.id}
              className="snap-start shrink-0 w-[85%] sm:w-[55%] lg:w-[38%] xl:w-[32%] min-h-[340px] sm:min-h-[360px]"
            >
              <PollTeaserCard poll={poll} />
            </div>
          ))}
        </HorizontalScroller>
      )}
    </section>
  );
}
