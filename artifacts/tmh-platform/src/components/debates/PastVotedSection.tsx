import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Poll, PollListResponse } from "@workspace/api-client-react";
import { HorizontalScroller } from "./HorizontalScroller";
import { PollTeaserCard } from "./PollTeaserCard";
import { DebateCardSkeleton } from "@/components/skeletons/DebateCardSkeleton";
import { useVoter } from "@/hooks/use-voter";

const MAX_PAST_VOTED = 50;

async function fetchPollsByIds(ids: number[]): Promise<Poll[]> {
  if (ids.length === 0) return [];
  const params = new URLSearchParams();
  params.set("ids", ids.join(","));
  params.set("limit", String(Math.min(ids.length, MAX_PAST_VOTED)));
  const res = await fetch(`/api/polls?${params.toString()}`);
  if (!res.ok) return [];
  const data: PollListResponse = await res.json();
  return data.polls ?? [];
}

export function PastVotedSection() {
  const { profile, votes } = useVoter();

  // Most recent vote first. Prefer profile.pollsVoted (chronological append
  // order) and fall back to the votes map keys for migrated profiles.
  const orderedIds = useMemo(() => {
    const fromProfile = profile?.pollsVoted ?? [];
    const fromVotes = Object.keys(votes).map((k) => Number(k)).filter(Boolean);
    const merged: number[] = [];
    const seen = new Set<number>();
    for (const id of fromProfile) {
      if (!seen.has(id)) {
        merged.push(id);
        seen.add(id);
      }
    }
    for (const id of fromVotes) {
      if (!seen.has(id)) {
        merged.push(id);
        seen.add(id);
      }
    }
    return merged.reverse().slice(0, MAX_PAST_VOTED);
  }, [profile?.pollsVoted, votes]);

  const { data, isLoading } = useQuery<Poll[]>({
    queryKey: ["debates-past-voted", orderedIds],
    queryFn: () => fetchPollsByIds(orderedIds),
    staleTime: 60_000,
    enabled: orderedIds.length > 0,
  });

  if (orderedIds.length === 0) return null;
  if (!isLoading && (!data || data.length === 0)) return null;

  return (
    <section className="py-12 sm:py-14 border-t border-foreground/15">
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
          Past Voted
        </h2>
        <p className="text-sm text-muted-foreground mt-2 font-sans">
          Debates you've already weighed in on. Most recent first.
        </p>
      </div>

      {isLoading ? (
        <div className="flex gap-4 overflow-hidden px-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="shrink-0 w-[85%] sm:w-[55%] lg:w-[38%] xl:w-[32%] min-h-[340px] sm:min-h-[360px]"
            >
              <DebateCardSkeleton />
            </div>
          ))}
        </div>
      ) : (
        <HorizontalScroller ariaLabel="Past Voted">
          {(data ?? []).map((poll) => (
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
