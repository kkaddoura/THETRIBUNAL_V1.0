import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
}

export function HorizontalScroller({ children, className, ariaLabel }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const updateBounds = () => {
    const el = scrollRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft >= max - 4);
  };

  useEffect(() => {
    updateBounds();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateBounds, { passive: true });
    const ro = new ResizeObserver(updateBounds);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateBounds);
      ro.disconnect();
    };
  }, []);

  const scrollByAmount = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const firstChild = el.firstElementChild as HTMLElement | null;
    const step = firstChild ? firstChild.getBoundingClientRect().width + 16 : el.clientWidth * 0.8;
    el.scrollBy({ left: direction === "left" ? -step : step, behavior: "smooth" });
  };

  return (
    <div className={cn("relative group", className)}>
      <div
        ref={scrollRef}
        aria-label={ariaLabel}
        className={cn(
          "flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth",
          "px-1 pb-2",
          "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        )}
      >
        {children}
      </div>

      <button
        type="button"
        onClick={() => scrollByAmount("left")}
        aria-label="Scroll left"
        className={cn(
          "hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 z-10",
          "w-9 h-9 items-center justify-center rounded-full",
          "bg-background/90 border border-border shadow-md",
          "text-foreground hover:bg-foreground hover:text-background transition-colors",
          "opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
          atStart && "pointer-events-none opacity-0 group-hover:opacity-30",
        )}
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <button
        type="button"
        onClick={() => scrollByAmount("right")}
        aria-label="Scroll right"
        className={cn(
          "hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 z-10",
          "w-9 h-9 items-center justify-center rounded-full",
          "bg-background/90 border border-border shadow-md",
          "text-foreground hover:bg-foreground hover:text-background transition-colors",
          "opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
          atEnd && "pointer-events-none opacity-0 group-hover:opacity-30",
        )}
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
}
