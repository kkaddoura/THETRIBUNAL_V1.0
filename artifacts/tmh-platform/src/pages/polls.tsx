import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearch } from "wouter";
import { useListPolls, useListCategories } from "@workspace/api-client-react";
import type { Poll } from "@workspace/api-client-react";
import { Layout } from "@/components/layout/Layout";
import { PollCard } from "@/components/poll/PollCard";
import { usePageConfig } from "@/hooks/use-cms-data";
import { usePageTitle } from "@/hooks/use-page-title";
import { motion } from "motion/react";
import { TickerSkeleton } from "@/components/skeletons/TickerSkeleton";
import { DebateGridSkeleton } from "@/components/skeletons/DebateCardSkeleton";
import { LoadingDots } from "@/components/ui/loading-dots";
import { FilterSidebar } from "@/components/layout/FilterSidebar";
import { EditorialPageHero } from "@/components/layout/EditorialPageHero";
import { DebatesSections } from "@/components/debates/DebatesSections";
import { track } from "@/lib/analytics";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

type DebateTickerItem = { topic: string; votes: string; href?: string };

interface PollsConfig {
  hero?: { titleLine1?: string; titleLine2?: string; subtitle?: string };
  punctuations?: string[];
  ticker?: { enabled?: boolean; source?: string };
  emptyState?: { title?: string; body?: string };
  sections?: { enabled?: boolean; order?: number }[];
}

const TICKER_SOURCE_TO_FILTER: Record<string, "latest" | "trending" | "editors_picks"> = {
  latest_debates: "latest",
  trending_debates: "trending",
  featured_debates: "editors_picks",
};

const PAGE_SIZE = 30;

export default function Polls() {
  usePageTitle({
    title: "Debates",
    description:
      "Anonymous debates on the questions that matter across MENA. Vote, see results, and watch opinion shift in real time.",
  });

  const search = useSearch();
  const urlCategory = useMemo(() => {
    const params = new URLSearchParams(search);
    return params.get("category") || undefined;
  }, [search]);

  const { data: config, isLoading: configLoading } = usePageConfig<PollsConfig>("polls");
  const tickerEnabled = config?.ticker?.enabled !== false;
  const tickerFilter = TICKER_SOURCE_TO_FILTER[config?.ticker?.source ?? "trending_debates"] ?? "trending";

  // ---------------- Filter state ----------------
  const [category, setCategory] = useState<string | undefined>(urlCategory);
  const [searchQuery, setSearchQuery] = useState("");

  // Sync category state when ?category= changes (e.g., "See all" link)
  useEffect(() => {
    setCategory(urlCategory);
    if (urlCategory) setSearchQuery("");
  }, [urlCategory]);
  const [searchResults, setSearchResults] = useState<Poll[] | null>(null);
  const [searchTotal, setSearchTotal] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);

  const isFiltered = !!searchQuery.trim() || !!category;

  // Debounced search
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
      const ctrl = new AbortController();
      searchAbortRef.current = ctrl;
      track("search_used", { surface: "debates", queryLength: q.length });
      fetch(`/api/polls?search=${encodeURIComponent(q)}&limit=50`, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.polls) {
            setSearchResults(data.polls);
            setSearchTotal(data.total ?? data.polls.length);
          }
          setIsSearching(false);
        })
        .catch((err) => {
          if (err?.name !== "AbortError") setIsSearching(false);
        });
    }, 400);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [searchQuery]);

  // Category-filtered list (only meaningful when category is set; React Query caches the result)
  const { data: categoryPolls, isLoading: catLoading } = useListPolls({
    filter: "trending",
    category,
    limit: PAGE_SIZE,
    offset: 0,
  });

  // Categories for sidebar
  const { data: categoriesData } = useListCategories();

  // Ticker data (independent — uses CMS-configured source)
  const { data: tickerData, isLoading: tickerLoading } = useListPolls({
    filter: tickerFilter,
    limit: 10,
    offset: 0,
  });

  const filteredPolls: Poll[] = searchQuery.trim()
    ? (searchResults ?? [])
    : (categoryPolls?.polls ?? []);
  const filteredTotal = searchQuery.trim() ? searchTotal : (categoryPolls?.total ?? 0);
  const filteredLoading = isSearching || (!!category && catLoading);
  const hasConfiguredSections = Array.isArray(config?.sections)
    ? config.sections.some((section) => section && section.enabled !== false)
    : false;

  const DEBATE_TICKER = useMemo<DebateTickerItem[]>(() => {
    if (!tickerData?.polls?.length) return [];
    return tickerData.polls.slice(0, 10).map((p) => ({
      topic:
        p.question && p.question.length > 25
          ? p.question.substring(0, 23) + "…"
          : (p.question ?? "Debate"),
      votes: (p.totalVotes ?? 0).toLocaleString(),
      href: `/debates/${p.id}`,
    }));
  }, [tickerData]);

  const doubled = [...DEBATE_TICKER, ...DEBATE_TICKER];

  const allCount = categoriesData?.categories
    ? categoriesData.categories.reduce((s, c) => s + (c.pollCount ?? 0), 0)
    : 0;
  const heroStats = [
    { value: allCount, label: "Debates" },
    { value: categoriesData?.categories?.length ?? 0, label: "Categories" },
    { value: 19, label: "Countries" },
  ];

  return (
    <Layout>
      <EditorialPageHero
        eyebrow="THE DEBATES"
        titleLine1={config?.hero?.titleLine1 || "What people"}
        titleLine2={config?.hero?.titleLine2 || "believe"}
        subtitle={config?.hero?.subtitle || "Private voting on the questions the region avoids in public."}
        note="Vote privately. See where the region stands."
        punctuations={config?.punctuations ?? ["."]}
        stats={heroStats}
      >
        {tickerEnabled &&
          (tickerLoading && DEBATE_TICKER.length === 0 ? (
            <TickerSkeleton />
          ) : DEBATE_TICKER.length > 0 ? (
            <div className="overflow-hidden border-y border-white/[0.06] bg-[#0D0D0D]">
              <div className="tmh-ticker-scroll">
                {doubled.map((item, i) => (
                  <Link
                    key={i}
                    href={item.href ?? "/debates"}
                    className="flex cursor-pointer items-center gap-2.5 border-r border-white/10 px-8 py-[0.7rem] no-underline"
                  >
                    <span className="font-serif text-[0.8rem] font-bold uppercase tracking-[0.08em] text-white/75">{item.topic}</span>
                    <span className="font-serif text-[0.85rem] font-bold text-white">{item.votes}</span>
                    <span className="font-serif text-[0.83rem] font-bold text-primary">VOTES</span>
                  </Link>
                ))}
              </div>
            </div>
          ) : null)}
      </EditorialPageHero>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col lg:flex-row gap-8 lg:gap-12">
        <FilterSidebar
          search={{
            value: searchQuery,
            onChange: (v) => {
              setSearchQuery(v);
              setCategory(undefined);
            },
            placeholder: "Topic, keyword, country...",
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
            allCount,
          }}
        />

        <div className="flex-1 min-w-0">
          {isFiltered ? (
            <FilteredView
              polls={filteredPolls}
              total={filteredTotal}
              loading={filteredLoading}
              isSearching={isSearching}
              searchQuery={searchQuery}
              onClear={() => {
                setSearchQuery("");
                setCategory(undefined);
              }}
            />
          ) : !configLoading && !hasConfiguredSections ? (
            <FilteredView
              polls={filteredPolls}
              total={filteredTotal}
              loading={catLoading}
              isSearching={false}
              searchQuery=""
              onClear={() => {
                setSearchQuery("");
                setCategory(undefined);
              }}
            />
          ) : (
            <DebatesSections emptyState={config?.emptyState} />
          )}
        </div>
      </div>
    </Layout>
  );
}

function FilteredView({
  polls,
  total,
  loading,
  isSearching,
  searchQuery,
  onClear,
}: {
  polls: Poll[];
  total: number;
  loading: boolean;
  isSearching: boolean;
  searchQuery: string;
  onClear: () => void;
}) {
  if (loading) {
    return (
      <div className="space-y-4">
        {isSearching && (
          <div className="flex items-center gap-2 py-4">
            <LoadingDots text={`Searching for "${searchQuery}"`} />
          </div>
        )}
        <DebateGridSkeleton />
      </div>
    );
  }

  if (polls.length === 0) {
    return (
      <motion.div
        className="text-center py-20 border border-border border-dashed bg-secondary/30"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
      >
        <h3 className="font-serif font-bold text-2xl uppercase tracking-wider text-foreground mb-2">
          No debates found
        </h3>
        <p className="text-sm text-muted-foreground mb-6 font-sans">
          {searchQuery
            ? `No results for "${searchQuery}". Try a different search.`
            : "Try adjusting your filters."}
        </p>
        <button
          onClick={onClear}
          className="text-xs font-bold uppercase tracking-widest text-primary hover:text-foreground transition-colors"
        >
          Clear filters
        </button>
      </motion.div>
    );
  }

  return (
    <div>
      <p className="text-[12px] uppercase tracking-widest text-muted-foreground mb-4 font-serif">
        {polls.length} of {total} debate{total === 1 ? "" : "s"}
        {searchQuery ? ` for "${searchQuery}"` : ""}
      </p>
      <div className="columns-1 [column-gap:2rem] xl:columns-2">
        {polls.map((poll) => (
          <div key={poll.id} className="mb-8 inline-block w-full break-inside-avoid align-top">
            <PollCard poll={poll} />
          </div>
        ))}
      </div>
    </div>
  );
}
