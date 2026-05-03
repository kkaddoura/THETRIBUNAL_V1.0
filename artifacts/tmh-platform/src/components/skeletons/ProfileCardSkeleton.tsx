const Shimmer = () => (
  <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-background/20 to-transparent" />
)

export function ProfileCardSkeleton() {
  return (
    <div className="bg-card border border-border flex flex-col h-full overflow-hidden">
      {/* Image area — matches aspect-[3/4] on desktop, h-48 on mobile */}
      <div className="w-full aspect-[3/4] sm:aspect-[3/4] bg-secondary relative overflow-hidden flex-shrink-0">
        <Shimmer />
      </div>

      {/* Content */}
      <div className="p-4 sm:p-5 flex flex-col flex-1 gap-2">
        {/* Name */}
        <div className="h-5 w-3/4 bg-secondary relative overflow-hidden"><Shimmer /></div>

        {/* Headline (2 lines) */}
        <div className="space-y-1.5">
          <div className="h-3.5 w-full bg-secondary rounded relative overflow-hidden"><Shimmer /></div>
          <div className="h-3.5 w-2/3 bg-secondary rounded relative overflow-hidden"><Shimmer /></div>
        </div>

        {/* Role + company */}
        <div className="h-3 w-4/5 bg-secondary relative overflow-hidden"><Shimmer /></div>

        {/* Location */}
        <div className="h-3 w-1/3 bg-secondary relative overflow-hidden"><Shimmer /></div>

        {/* CTA button */}
        <div className="mt-auto pt-2">
          <div className="h-9 w-full bg-secondary border border-border relative overflow-hidden"><Shimmer /></div>
        </div>
      </div>
    </div>
  )
}

export function ProfileGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <ProfileCardSkeleton key={i} />
      ))}
    </div>
  )
}
