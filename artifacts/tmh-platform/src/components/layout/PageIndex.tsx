import { useEffect, useState, useRef } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export interface PageIndexSection {
  id: string;
  label: string;
}

export interface PageIndexProps {
  sections: PageIndexSection[];
  /** Pixel offset from the top of the viewport when scrolling to a section (compensates for fixed navbar). Default 80. */
  scrollOffset?: number;
  /** Optional title shown above the list. */
  title?: string;
}

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

export function PageIndex({ sections, scrollOffset = 80, title = "On This Page" }: PageIndexProps) {
  const [activeId, setActiveId] = useState<string | null>(sections[0]?.id ?? null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (!sections.length) return;

    const visible = new Map<string, number>();

    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visible.set(entry.target.id, entry.boundingClientRect.top);
          } else {
            visible.delete(entry.target.id);
          }
        }
        if (visible.size === 0) return;
        const topmost = [...visible.entries()].sort((a, b) => a[1] - b[1])[0];
        setActiveId(topmost[0]);
      },
      {
        rootMargin: `-${scrollOffset + 20}px 0px -60% 0px`,
        threshold: 0,
      },
    );

    for (const section of sections) {
      const el = document.getElementById(section.id);
      if (el) observerRef.current.observe(el);
    }

    return () => observerRef.current?.disconnect();
  }, [sections, scrollOffset]);

  const handleClick = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - scrollOffset;
    window.scrollTo({ top, behavior: "smooth" });
    setActiveId(id);
  };

  if (!sections.length) return null;

  const activeIndex = sections.findIndex((s) => s.id === activeId);

  return (
    <motion.nav
      aria-label={title}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, ease: EASE_OUT_EXPO, delay: 0.4 }}
      className="hidden lg:block fixed right-6 top-1/2 -translate-y-1/2 z-30 w-72"
    >
      <div className="bg-background/95 backdrop-blur-sm border border-border shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
        <div className="border-b border-border px-5 pt-4 pb-3 flex items-center justify-between">
          <p className="font-serif font-black uppercase text-xs tracking-[0.2em] text-foreground">
            {title}<span className="text-primary">.</span>
          </p>
          <span className="font-display text-xs font-bold text-muted-foreground tabular-nums">
            {String(Math.max(activeIndex + 1, 1)).padStart(2, "0")}
            <span className="opacity-50">/{String(sections.length).padStart(2, "0")}</span>
          </span>
        </div>

        <ul className="relative py-2.5">
          {/* Sliding red accent bar on the active item */}
          <motion.div
            className="absolute left-0 w-[3px] bg-primary"
            initial={false}
            animate={{
              top: `calc(${Math.max(activeIndex, 0)} * 44px + 10px)`,
              opacity: activeIndex >= 0 ? 1 : 0,
            }}
            transition={{ type: "tween", duration: 0.35, ease: [0.22, 1.0, 0.36, 1] }}
            style={{ height: 44 }}
          />

          {sections.map((section, i) => {
            const isActive = activeId === section.id;
            return (
              <li key={section.id}>
                <button
                  onClick={() => handleClick(section.id)}
                  className={cn(
                    "group w-full flex items-center gap-3 pl-5 pr-4 text-left transition-colors",
                    "h-11",
                    isActive
                      ? "text-foreground bg-secondary/60"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/30",
                  )}
                >
                  <span
                    className={cn(
                      "font-display text-[11px] font-bold tabular-nums tracking-wider transition-colors",
                      isActive ? "text-primary" : "text-muted-foreground/60 group-hover:text-foreground",
                    )}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="font-serif uppercase text-[12px] tracking-[0.14em] font-bold truncate">
                    {section.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="border-t border-border px-5 py-2.5 flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-primary animate-pulse" />
          <span className="text-[10px] uppercase tracking-[0.22em] font-serif font-bold text-muted-foreground">
            Scroll to navigate
          </span>
        </div>
      </div>
    </motion.nav>
  );
}
