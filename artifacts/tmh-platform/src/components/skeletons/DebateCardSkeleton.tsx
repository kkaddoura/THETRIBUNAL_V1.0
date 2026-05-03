const Shimmer = () => (
  <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-background/20 to-transparent" />
)

export function DebateCardSkeleton() {
  return (
    <div className="bg-card border border-border flex flex-col">
      {/* Question + metadata panel */}
      <div className="p-6 sm:p-8 flex-1 flex flex-col">
        {/* Category badge + live dot */}
        <div className="flex items-center gap-3 mb-4">
          <div className="h-5 w-20 bg-secondary relative overflow-hidden"><Shimmer /></div>
          <div className="h-4 w-12 bg-secondary relative overflow-hidden"><Shimmer /></div>
        </div>

        {/* Question title (2 lines, text-3xl) */}
        <div className="space-y-2.5 mb-4">
          <div className="h-7 w-full bg-secondary relative overflow-hidden"><Shimmer /></div>
          <div className="h-7 w-3/4 bg-secondary relative overflow-hidden"><Shimmer /></div>
        </div>

        {/* Context text (2 lines) */}
        <div className="space-y-2 mb-4">
          <div className="h-3.5 w-full bg-secondary rounded relative overflow-hidden"><Shimmer /></div>
          <div className="h-3.5 w-5/6 bg-secondary rounded relative overflow-hidden"><Shimmer /></div>
        </div>

        {/* Bottom metadata bar */}
        <div className="mt-auto pt-6 border-t border-border flex items-center justify-between">
          <div className="h-3 w-24 bg-secondary relative overflow-hidden"><Shimmer /></div>
          <div className="h-3 w-14 bg-secondary relative overflow-hidden"><Shimmer /></div>
        </div>
      </div>

      {/* Vote panel */}
      <div className="p-6 sm:p-8 bg-background border-t border-border flex flex-col gap-3">
        {[0, 1, 2].map((j) => (
          <div key={j} className="h-12 w-full bg-secondary relative overflow-hidden"><Shimmer /></div>
        ))}
      </div>
    </div>
  )
}

export function DebateGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
      {Array.from({ length: count }).map((_, i) => (
        <DebateCardSkeleton key={i} />
      ))}
    </div>
  )
}
