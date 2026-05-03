import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useListPolls, useListCategories } from "@workspace/api-client-react";
import type { Poll } from "@workspace/api-client-react";
import { Layout } from "@/components/layout/Layout";
import { PollCard } from "@/components/poll/PollCard";
import { cn } from "@/lib/utils";
import { usePageConfig } from "@/hooks/use-cms-data";
import { usePageTitle } from "@/hooks/use-page-title";
import { TitlePunctuation } from "@/components/TitlePunctuation";
import { motion } from "motion/react";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import { LoadingDots } from "@/components/ui/loading-dots";
import { DebateGridSkeleton } from "@/components/skeletons/DebateCardSkeleton";
import { TickerSkeleton } from "@/components/skeletons/TickerSkeleton";
import { FilterSidebar } from "@/components/layout/FilterSidebar";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

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

type DebateTickerItem = { topic: string; votes: string; href?: string };

interface PollsConfig {
  hero?: { titleLine1?: string; titleLine2?: string; subtitle?: string };
  punctuations?: string[];
  tickerItems?: Array<{ topic: string; votes: string }>;
  tickerSource?: string;
}

export default function Polls() {
  usePageTitle({
    title: "Debates",
    description: "Anonymous debates on the questions that matter across MENA. Vote, see results, and watch opinion shift in real time.",
  });
  const [location] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const initialCategory = searchParams.get("category") || undefined;

  const [filter, setFilter] = useState<"latest" | "trending" | "most_voted">(
    "trending",
  );
  const [category, setCategory] = useState<string | undefined>(initialCategory);
  const [searchQuery, setSearchQuery] = useState("");
  const PAGE_SIZE = 30;

  // Paginated polling: accumulate pages as user scrolls
  const [offset, setOffset] = useState(0);
  const [allPolls, setAllPolls] = useState<Poll[]>([]);
  const [serverTotal, setServerTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const prevKey = useRef("");

  // Server-side search with 400ms debounce
  const [searchResults, setSearchResults] = useState<Poll[] | null>(null);
  const [searchTotal, setSearchTotal] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (searchAbortRef.current) searchAbortRef.current.abort();

    const q = searchQuery.trim();
    if (!q) {
      setSearchResults(null);
      setSearchTotal(0);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchTimerRef.current = setTimeout(() => {
      const controller = new AbortController();
      searchAbortRef.current = controller;
      fetch(`/api/polls?search=${encodeURIComponent(q)}&limit=50`, { signal: controller.signal })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.polls) {
            setSearchResults(data.polls);
            setSearchTotal(data.total ?? data.polls.length);
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

  const { data: pollsData, isLoading } = useListPolls({
    filter,
    category,
    limit: PAGE_SIZE,
    offset: 0,
  });
  const { data: categoriesData } = useListCategories();
  const { data: config } = usePageConfig<PollsConfig>("polls");

  // Reset accumulated polls when filter/category changes
  useEffect(() => {
    const key = `${filter}|${category ?? ""}`;
    if (key !== prevKey.current) {
      prevKey.current = key;
      setOffset(0);
      setAllPolls([]);
    }
  }, [filter, category]);

  // Merge first page from React Query
  useEffect(() => {
    if (pollsData?.polls && offset === 0) {
      setAllPolls(pollsData.polls);
      setServerTotal(pollsData.total ?? pollsData.polls.length);
    }
  }, [pollsData, offset]);

  const canLoadMore = allPolls.length < serverTotal;

  const loadMore = useCallback(async () => {
    if (loadingMore || !canLoadMore) return;
    setLoadingMore(true);
    const nextOffset = allPolls.length;
    try {
      const params = new URLSearchParams();
      params.set("filter", filter);
      if (category) params.set("category", category);
      params.set("limit", String(PAGE_SIZE));
      params.set("offset", String(nextOffset));
      const res = await fetch(`/api/polls?${params}`);
      if (res.ok) {
        const data = await res.json();
        setAllPolls(prev => [...prev, ...(data.polls ?? [])]);
        setServerTotal(data.total ?? serverTotal);
        setOffset(nextOffset);
      }
    } catch {}
    setLoadingMore(false);
  }, [loadingMore, canLoadMore, allPolls.length, filter, category, serverTotal]);

  const filteredPolls = useMemo(() => {
    if (searchQuery.trim()) return searchResults ?? [];
    return allPolls;
  }, [allPolls, searchResults, searchQuery]);

  const { sentinelRef, visibleItems: visiblePolls, hasMore } = useInfiniteScroll(filteredPolls, 10);
  const tabs = [
    { id: "trending", label: "Trending" },
    { id: "latest", label: "Latest" },
    { id: "most_voted", label: "Most Voted" },
  ] as const;

  const hero = config?.hero;

  const DEBATE_TICKER = useMemo<DebateTickerItem[]>(() => {
    if (!pollsData?.polls?.length) return [];
    return pollsData.polls.slice(0, 10).map((p) => ({
      topic:
        p.question && p.question.length > 25
          ? p.question.substring(0, 23) + "…"
          : (p.question ?? "Debate"),
      votes: (p.totalVotes ?? 0).toLocaleString(),
      href: `/debates/${p.id}`,
    }));
  }, [pollsData]);

  const doubled = [...DEBATE_TICKER, ...DEBATE_TICKER];

  return (
    <Layout>
      <div className="bg-foreground text-background border-b border-border">
        <motion.div
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-10"
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
            Debates
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
            {hero?.titleLine1 || "What Does the Region"}<br />
            {hero?.titleLine2 || "Actually Think?"}<TitlePunctuation punctuations={config?.punctuations} />
          </motion.h1>
          <p
            className="text-text2/60 pl-2"
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700,
              fontSize: "0.78rem",
              textTransform: "uppercase",
            }}
          >
            {hero?.subtitle ||
              "Not what they say at dinner. What they vote for here."}
          </p>
        </motion.div>

        {isLoading && DEBATE_TICKER.length === 0 ? (
        <TickerSkeleton />
        ) : DEBATE_TICKER.length > 0 ? (
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
                href={item.href ?? "/debates"}
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
                  {item.topic}
                </span>
                <span
                  style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    color: "#fff",
                  }}
                >
                  {item.votes}
                </span>
                <span
                  style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontWeight: 700,
                    fontSize: "0.72rem",
                    color: "#DC143C",
                  }}
                >
                  VOTES
                </span>
              </Link>
            ))}
          </div>
        </div>
        ) : null}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col lg:flex-row gap-12">
        <FilterSidebar
          search={{
            value: searchQuery,
            onChange: (v) => {
              setSearchQuery(v);
              setCategory(undefined);
            },
            placeholder: "Topic, keyword, country...",
          }}
          sort={{
            value: filter,
            onChange: (v) => setFilter(v as typeof filter),
            options: tabs,
          }}
          categories={{
            items: (categoriesData?.categories ?? []).map((c) => ({
              key: c.slug,
              label: c.name,
              count: c.pollCount ?? 0,
            })),
            activeKey: category ?? "ALL",
            onSelect: (key) => {
              setCategory(key === "ALL" ? undefined : key);
              setSearchQuery("");
            },
            allLabel: "All Topics",
            allCount: categoriesData?.categories
              ? categoriesData.categories.reduce((sum, c) => sum + (c.pollCount ?? 0), 0)
              : serverTotal,
          }}
        />

        <div className="flex-1">
          {isLoading || isSearching ? (
            <div className="space-y-4">
              {isSearching && (
                <div className="flex items-center gap-2 py-4">
                  <LoadingDots text={`Searching for "${searchQuery}"`} />
                </div>
              )}
              <DebateGridSkeleton />
            </div>
          ) : filteredPolls.length === 0 ? (
            <motion.div
              className="text-center py-20 border border-border border-dashed bg-secondary/30"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
            >
              <h3 className="font-serif font-bold text-2xl uppercase tracking-wider text-foreground mb-2">
                No debates found
              </h3>
              <p className="text-sm text-muted-foreground mb-6 font-sans">
                {searchQuery
                  ? `No results for "${searchQuery}". Try a different search.`
                  : "Try adjusting your filters to find more discussions."}
              </p>
              <button
                onClick={() => {
                  setFilter("trending");
                  setCategory(undefined);
                  setSearchQuery("");
                }}
                className="text-xs font-bold uppercase tracking-widest text-primary hover:text-foreground transition-colors"
              >
                Clear all filters
              </button>
            </motion.div>
          ) : (
            <>
              {searchQuery && (
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-4 font-serif">
                  {filteredPolls.length} result
                  {filteredPolls.length !== 1 ? "s" : ""} for "{searchQuery}"
                </p>
              )}
              <motion.div
                className="grid grid-cols-1 xl:grid-cols-2 gap-8"
                initial="hidden"
                animate="visible"
                variants={staggerContainer}
              >
                {visiblePolls.map((poll) => (
                  <motion.div key={poll.id} variants={staggerItem}>
                    <PollCard poll={poll} />
                  </motion.div>
                ))}
              </motion.div>
              {hasMore && (
                <div ref={sentinelRef} className="flex justify-center py-8">
                  <LoadingDots />
                </div>
              )}
              {/* Load more from server when all visible items rendered but more exist on server */}
              {!hasMore && canLoadMore && !searchQuery.trim() && (
                <div className="flex justify-center py-8">
                  <button
                    onClick={loadMore}
                    disabled={loadingMore}
                    className={cn(
                      "px-6 py-3 text-xs uppercase tracking-widest font-bold border border-border transition-colors",
                      loadingMore
                        ? "text-muted-foreground opacity-50"
                        : "text-foreground hover:bg-foreground hover:text-background"
                    )}
                  >
                    {loadingMore ? "Loading..." : `Load More (${allPolls.length} of ${serverTotal})`}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
