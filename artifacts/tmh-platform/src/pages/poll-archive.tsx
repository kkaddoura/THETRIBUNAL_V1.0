import { useState } from "react"
import { useListPolls, useListCategories } from "@workspace/api-client-react"
import { Layout } from "@/components/layout/Layout"
import { PollCard } from "@/components/poll/PollCard"
import { cn } from "@/lib/utils"
import { usePageTitle } from "@/hooks/use-page-title"

const SORT_OPTIONS = [
  { value: "recent", label: "Most Recent" },
  { value: "trending", label: "Most Voted" },
  { value: "editors_picks", label: "Editor's Picks" },
]

export default function PollArchive() {
  usePageTitle({
    title: "Debate Archive",
    description: "Browse past debates and see how MENA voted on the questions that shaped the conversation.",
  });
  const [category, setCategory] = useState("")
  const [sort, setSort] = useState("recent")
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 12

  const { data: pollsData, isLoading } = useListPolls({
    filter: sort as any,
    category: category || undefined,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  })
  const { data: categoriesData } = useListCategories()

  const polls = pollsData?.polls ?? []
  const total = pollsData?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <Layout>
      {/* Header */}
      <div className="bg-foreground text-background py-16 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-[10px] uppercase tracking-[0.3em] font-bold text-primary mb-4 font-serif">
            The Archive
          </div>
          <h1 className="font-display font-black text-5xl md:text-6xl uppercase tracking-tight text-background leading-none">
            Every Question<br />We've Ever Asked.
          </h1>
          <p className="text-background/70 font-sans text-base mt-4">
            {total > 0 ? `${total} debates. ${(polls.reduce((a, p) => a + (p.totalVotes ?? 0), 0)).toLocaleString()}+ votes. Browse them all.` : "Browse the full debate archive."}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="border-b border-border bg-background sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 py-4">
            {/* Sort */}
            <div className="flex items-center gap-2">
              {SORT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { setSort(opt.value); setPage(0) }}
                  className={cn(
                    "px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] font-bold transition-all font-serif",
                    sort === opt.value
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground border border-border"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="hidden sm:block h-5 w-px bg-border" />

            {/* Category filter */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => { setCategory(""); setPage(0) }}
                className={cn(
                  "px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] font-bold transition-all font-serif",
                  !category
                    ? "bg-primary text-white"
                    : "text-muted-foreground hover:text-foreground border border-border"
                )}
              >
                All
              </button>
              {categoriesData?.categories.map(cat => (
                <button
                  key={cat.slug}
                  onClick={() => { setCategory(cat.slug); setPage(0) }}
                  className={cn(
                    "px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] font-bold transition-all font-serif",
                    category === cat.slug
                      ? "bg-primary text-white"
                      : "text-muted-foreground hover:text-foreground border border-border"
                  )}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Poll Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-64 bg-secondary animate-pulse border border-border" />
            ))}
          </div>
        ) : polls.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-muted-foreground font-sans text-lg">No debates in this category yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {polls.map(poll => (
              <PollCard key={poll.id} poll={poll} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-12">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-6 py-2 border border-border text-[10px] uppercase tracking-widest font-bold font-serif text-foreground disabled:opacity-30 hover:bg-foreground hover:text-background transition-colors"
            >
              ← Prev
            </button>
            <span className="text-[11px] text-muted-foreground font-serif uppercase tracking-widest">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-6 py-2 border border-border text-[10px] uppercase tracking-widest font-bold font-serif text-foreground disabled:opacity-30 hover:bg-foreground hover:text-background transition-colors"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </Layout>
  )
}
