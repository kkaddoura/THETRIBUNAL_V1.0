const Shimmer = () => (
  <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-background/20 to-transparent" />
)

export function FeaturedPredictionSkeleton() {
  return (
    <div
      style={{
        background: "var(--card)",
        border: "1.5px solid rgba(16,185,129,0.2)",
        borderRadius: 12,
        padding: "2rem",
        marginBottom: "2rem",
      }}
    >
      <div className="grid md:grid-cols-[55fr_45fr] gap-8">
        {/* Chart area */}
        <div>
          <div className="h-3 w-40 bg-secondary mb-4 relative overflow-hidden"><Shimmer /></div>
          <div className="h-[200px] w-full bg-secondary rounded relative overflow-hidden"><Shimmer /></div>
          <div className="h-3 w-48 bg-secondary mt-3 rounded relative overflow-hidden"><Shimmer /></div>
        </div>

        {/* Content area */}
        <div className="flex flex-col gap-4">
          {/* Badges */}
          <div className="flex gap-2">
            <div className="h-5 w-16 bg-secondary relative overflow-hidden"><Shimmer /></div>
            <div className="h-5 w-28 bg-secondary relative overflow-hidden"><Shimmer /></div>
          </div>

          {/* Description */}
          <div className="h-3.5 w-full bg-secondary rounded relative overflow-hidden"><Shimmer /></div>

          {/* Title (2 lines) */}
          <div className="space-y-2">
            <div className="h-5 w-full bg-secondary relative overflow-hidden"><Shimmer /></div>
            <div className="h-5 w-2/3 bg-secondary relative overflow-hidden"><Shimmer /></div>
          </div>

          {/* Participation count */}
          <div className="h-3.5 w-36 bg-secondary rounded relative overflow-hidden"><Shimmer /></div>

          {/* Confidence bars */}
          <div className="space-y-2">
            <div className="h-8 w-full bg-secondary rounded relative overflow-hidden"><Shimmer /></div>
            <div className="h-8 w-full bg-secondary rounded relative overflow-hidden"><Shimmer /></div>
          </div>

          {/* Vote buttons */}
          <div className="flex gap-2">
            <div className="h-[52px] flex-1 bg-secondary rounded relative overflow-hidden"><Shimmer /></div>
            <div className="h-[52px] flex-1 bg-secondary rounded relative overflow-hidden"><Shimmer /></div>
          </div>

          {/* Lock notice */}
          <div className="h-3 w-56 bg-secondary rounded relative overflow-hidden"><Shimmer /></div>
        </div>
      </div>
    </div>
  )
}

export function PredictionGridCardSkeleton() {
  return (
    <div
      style={{
        background: "var(--card)",
        border: "1.5px solid rgba(220,20,60,0.15)",
        borderRadius: 10,
        padding: "1.4rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.85rem",
      }}
    >
      {/* Sparkline */}
      <div className="h-[56px] w-full bg-secondary rounded relative overflow-hidden" style={{ margin: "0 -0.5rem", width: "calc(100% + 1rem)" }}>
        <Shimmer />
      </div>

      {/* Badges */}
      <div className="flex gap-1.5 items-center">
        <div className="h-5 w-16 bg-secondary relative overflow-hidden"><Shimmer /></div>
        <div className="h-5 w-28 bg-secondary relative overflow-hidden"><Shimmer /></div>
      </div>

      {/* Question title */}
      <div className="space-y-1.5">
        <div className="h-4 w-full bg-secondary relative overflow-hidden"><Shimmer /></div>
        <div className="h-4 w-4/5 bg-secondary relative overflow-hidden"><Shimmer /></div>
      </div>

      {/* Participation */}
      <div className="h-3.5 w-32 bg-secondary rounded relative overflow-hidden"><Shimmer /></div>

      {/* Confidence bars */}
      <div className="space-y-2">
        <div className="h-7 w-full bg-secondary rounded relative overflow-hidden"><Shimmer /></div>
        <div className="h-7 w-full bg-secondary rounded relative overflow-hidden"><Shimmer /></div>
      </div>

      {/* Resolution date */}
      <div className="h-3 w-28 bg-secondary relative overflow-hidden"><Shimmer /></div>

      {/* Vote buttons */}
      <div className="flex gap-2">
        <div className="h-[44px] flex-1 bg-secondary rounded relative overflow-hidden"><Shimmer /></div>
        <div className="h-[44px] flex-1 bg-secondary rounded relative overflow-hidden"><Shimmer /></div>
      </div>

      {/* Lock notice */}
      <div className="h-3 w-52 bg-secondary rounded relative overflow-hidden"><Shimmer /></div>
    </div>
  )
}

export function PredictionGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <>
      <div className="mb-12">
        <FeaturedPredictionSkeleton />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {Array.from({ length: count }).map((_, i) => (
          <PredictionGridCardSkeleton key={i} />
        ))}
      </div>
    </>
  )
}
