export function LoadingDots({ text = "Checking for more items" }: { text?: string }) {
  return (
    <span
      className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground font-serif"
    >
      {text}
      <span className="inline-flex ml-0.5 gap-[2px]">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="inline-block w-[3px] h-[3px] rounded-full bg-primary/60"
            style={{
              animation: "wave 1.2s ease-in-out infinite",
              animationDelay: `${i * 0.15}s`,
            }}
          />
        ))}
      </span>
      <style>{`
        @keyframes wave {
          0%, 60%, 100% { opacity: 0.3; transform: translateY(0); }
          30% { opacity: 1; transform: translateY(-3px); }
        }
      `}</style>
    </span>
  );
}
