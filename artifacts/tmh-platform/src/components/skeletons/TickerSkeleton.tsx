export function TickerSkeleton() {
  return (
    <div
      style={{
        background: "#0D0D0D",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        overflow: "hidden",
        height: 48,
        position: "relative",
      }}
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/[0.04] to-transparent z-10" />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          height: "100%",
          gap: "0.6rem",
          padding: "0 2rem",
          whiteSpace: "nowrap",
        }}
      >
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.55rem",
              padding: "0 1.4rem 0 0",
              borderRight: "1px solid rgba(255,255,255,0.08)",
              flex: "0 0 auto",
            }}
          >
            <div style={{ width: 56, height: 14, background: "rgba(255,255,255,0.07)" }} />
            <div style={{ width: 160, height: 11, background: "rgba(255,255,255,0.05)" }} />
            <div style={{ width: 52, height: 12, background: "rgba(255,255,255,0.07)" }} />
          </div>
        ))}
      </div>
    </div>
  );
}
