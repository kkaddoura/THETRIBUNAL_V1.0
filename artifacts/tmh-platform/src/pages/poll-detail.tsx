import { useRoute, Link } from "wouter"
import { useGetPoll, useListPolls, useGetPollTrends } from "@workspace/api-client-react"
import { Layout } from "@/components/layout/Layout"
import { PollCard } from "@/components/poll/PollCard"
import { TrendChart } from "@/components/poll/TrendChart"
import { ArrowLeft, AlertCircle, ArrowRight } from "lucide-react"
import { useVoter } from "@/hooks/use-voter"
import { usePageTitle } from "@/hooks/use-page-title"
import { Skeleton } from "@/components/ui/skeleton"
import { LoadingDots } from "@/components/ui/loading-dots"

function PollDetailSkeleton() {
  return (
    <div className="border border-border bg-card overflow-hidden">
      <div className="flex flex-col md:flex-row">
        {/* Left side skeleton */}
        <div className="p-6 md:p-10 flex-1 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <Skeleton className="h-5 w-20 bg-foreground/10" />
            <Skeleton className="h-4 w-12 bg-foreground/10" />
          </div>
          <Skeleton className="h-10 w-full bg-foreground/10" />
          <Skeleton className="h-10 w-3/4 bg-foreground/10" />
          <Skeleton className="h-4 w-full bg-foreground/10 mt-4" />
          <Skeleton className="h-4 w-2/3 bg-foreground/10" />
          <div className="pt-6 mt-auto border-t border-border">
            <Skeleton className="h-4 w-32 bg-foreground/10" />
          </div>
        </div>
        {/* Right side skeleton */}
        <div className="p-6 md:p-10 md:w-1/2 bg-background border-t md:border-t-0 md:border-l border-border space-y-4">
          <Skeleton className="h-4 w-28 bg-foreground/10" />
          <Skeleton className="h-14 w-full bg-foreground/10" />
          <Skeleton className="h-14 w-full bg-foreground/10" />
          <Skeleton className="h-14 w-full bg-foreground/10" />
        </div>
      </div>
    </div>
  )
}

export default function PollDetail() {
  const [, params] = useRoute("/debates/:id")
  const id = params?.id ? parseInt(params.id) : 0
  const { hasVoted, profile } = useVoter()

  const { data: poll, isLoading, error } = useGetPoll(id)
  usePageTitle(poll?.question)

  const { data: relatedData } = useListPolls(
    { category: poll?.categorySlug, limit: 8 },
    { query: { enabled: !!poll?.categorySlug } as any }
  )

  const { data: trendData } = useGetPollTrends(id)

  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 lg:py-16" data-testid="poll-detail-loading">
          {/* Back link skeleton */}
          <Skeleton className="h-4 w-36 mb-8 bg-foreground/10" />

          <div className="flex flex-col lg:flex-row gap-10">
            {/* Main content skeleton */}
            <div className="flex-1 space-y-10">
              <PollDetailSkeleton />

              {/* Trend chart skeleton */}
              <div className="border border-border bg-card p-6 md:p-10">
                <Skeleton className="h-1 w-8 mb-6 bg-foreground/10" />
                <Skeleton className="h-6 w-56 mb-6 bg-foreground/10" />
                <Skeleton className="h-48 w-full bg-foreground/10" />
              </div>
            </div>

            {/* Sidebar skeleton */}
            <div className="lg:w-80 flex-shrink-0 space-y-6">
              <Skeleton className="h-5 w-32 bg-foreground/10" />
              {[1, 2, 3].map(i => (
                <div key={i} className="border border-border bg-card p-5 space-y-3">
                  <Skeleton className="h-3 w-16 bg-foreground/10" />
                  <Skeleton className="h-5 w-full bg-foreground/10" />
                  <Skeleton className="h-5 w-2/3 bg-foreground/10" />
                  <Skeleton className="h-3 w-20 bg-foreground/10 mt-2" />
                </div>
              ))}
            </div>
          </div>

          {/* Loading indicator */}
          <div className="flex justify-center py-6">
            <LoadingDots text="Loading debate" />
          </div>
        </div>
      </Layout>
    )
  }

  if (error || !poll) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 py-24 text-center">
          <AlertCircle className="w-16 h-16 text-primary mx-auto mb-6" />
          <h1 className="text-4xl font-serif font-black uppercase tracking-tight mb-4">Debate not found</h1>
          <p className="text-muted-foreground mb-8 font-sans">This debate might have been removed or the link is invalid.</p>
          <Link href="/debates" className="bg-foreground text-background px-6 py-3 font-bold text-xs uppercase tracking-widest hover:bg-primary transition-colors">
            Back to Debates
          </Link>
        </div>
      </Layout>
    )
  }

  const allRelated = (relatedData?.polls ?? []).filter(p => p.id !== poll.id)
  const unvotedRelated = allRelated.filter(p => !hasVoted(p.id))
  const sidebarRelated = unvotedRelated.length >= 3
    ? unvotedRelated.slice(0, 5)
    : allRelated.slice(0, 5)
  const bottomRelated = unvotedRelated.length >= 2
    ? unvotedRelated.slice(0, 2)
    : allRelated.slice(0, 2)

  const categoryVoted = profile?.categories[poll.categorySlug ?? ""] ?? 0
  const categoryTotal = relatedData?.total ?? 0
  const categoryLeft = Math.max(0, categoryTotal - categoryVoted)

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 lg:py-16">
        <Link href="/debates" className="inline-flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground font-bold mb-8 transition-colors">
          <ArrowLeft className="w-3 h-3" /> Back to All Debates
        </Link>

        <div className="flex flex-col lg:flex-row gap-10">
          {/* Main content */}
          <div className="flex-1 min-w-0">
            <div className="mb-16">
              <PollCard poll={poll} featured />
            </div>

            {trendData?.dataPoints?.length ? (
              <div className="bg-card border border-border p-6 md:p-10 mb-16">
                <div className="h-px w-8 bg-primary mb-6" />
                <h3 className="font-serif font-black uppercase text-xl tracking-wider mb-6">
                  How Opinion Has Shifted
                </h3>
                <TrendChart pollId={poll.id} />
              </div>
            ) : null}

            {poll.context && (
              <div className="bg-background border border-border p-8 md:p-12 mb-16">
                <h3 className="font-serif font-black uppercase text-2xl tracking-wider flex items-center gap-3 mb-6">
                  The Context
                </h3>
                <div className="prose prose-lg dark:prose-invert max-w-none text-muted-foreground font-sans">
                  <p>{poll.context}</p>
                </div>

                {poll.tags && poll.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-8 pt-6 border-t border-border">
                    {poll.tags.map(tag => (
                      <span key={tag} className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 bg-secondary text-foreground border border-border">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Related Polls / Cross-sell (bottom, for mobile or extra) */}
            {bottomRelated.length > 0 && (
              <div id="cross-sell-polls">
                <div className="border-l-4 border-primary pl-4 mb-3">
                  <h3 className="font-serif font-black uppercase text-3xl tracking-tight">Keep Voting</h3>
                </div>
                {categoryVoted > 0 && categoryTotal > 0 && (
                  <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-serif mb-8">
                    You've voted on {categoryVoted} of {categoryTotal} debates in {poll.category}.
                    {categoryLeft > 0 && <span className="text-primary font-bold"> {categoryLeft} left.</span>}
                  </p>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {bottomRelated.map(p => (
                    <PollCard key={p.id} poll={p} />
                  ))}
                </div>
                {categoryLeft > 0 && (
                  <div className="mt-8 text-center">
                    <Link
                      href={`/debates?category=${poll.categorySlug}`}
                      className="inline-flex items-center gap-2 px-6 py-3 border border-primary text-primary font-bold text-xs uppercase tracking-widest hover:bg-primary hover:text-white transition-all duration-200"
                    >
                      Browse {categoryLeft} More in {poll.category} <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right sidebar: Related Debates */}
          <div className="lg:w-80 flex-shrink-0 lg:sticky lg:top-24 lg:self-start">
            {sidebarRelated.length > 0 && (
              <div className="space-y-0">
                <div className="border-l-4 border-primary pl-3 mb-6">
                  <p className="text-[10px] uppercase tracking-[0.25em] font-bold text-muted-foreground">
                    Related in
                  </p>
                  <h4 className="font-serif font-black uppercase text-lg tracking-tight text-foreground">
                    {poll.category}
                  </h4>
                </div>

                <div className="space-y-4">
                  {sidebarRelated.map(related => (
                    <Link
                      key={related.id}
                      href={`/debates/${related.id}`}
                      className="group block border border-border bg-card hover:border-primary/40 transition-all duration-200 p-5"
                    >
                      <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-muted-foreground">
                        {related.category}
                      </span>
                      <h5 className="font-serif font-black uppercase text-sm tracking-tight text-foreground group-hover:text-primary transition-colors mt-1.5 leading-snug line-clamp-3">
                        {related.question}
                      </h5>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                        <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">
                          {(related.totalVotes ?? 0).toLocaleString()} votes
                        </span>
                        <span className="text-[9px] uppercase tracking-widest text-primary font-bold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          Vote <ArrowRight className="w-2.5 h-2.5" />
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>

                {categoryTotal > sidebarRelated.length && (
                  <Link
                    href={`/debates?category=${poll.categorySlug}`}
                    className="block text-center mt-6 text-[10px] uppercase tracking-widest font-bold text-primary hover:text-foreground transition-colors border border-border hover:border-primary/40 py-3"
                  >
                    View all {poll.category} debates ({categoryTotal})
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}
