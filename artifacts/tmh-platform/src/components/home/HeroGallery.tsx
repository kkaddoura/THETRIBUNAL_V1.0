import { useState, useEffect, useRef, useMemo } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";

const STRIP_COUNT = 8;
const ROTATE_INTERVAL_MS = 5000;
const STRIP_DURATION_MS = 700;
const STRIP_STAGGER_MS = 35;
const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

export interface HeroPoster {
  src: string;
  topic: string;
  question: string;
  href: string;
}

export const DEFAULT_POSTERS: HeroPoster[] = [
  {
    src: "/images/hero-images/1.avif",
    topic: "US × Iran",
    question: "Will the US and Iran be at open war by the end of 2026?",
    href: "/debates",
  },
  {
    src: "/images/hero-images/2.avif",
    topic: "Strait of Hormuz",
    question: "Will the Strait of Hormuz be closed at any point in 2026?",
    href: "/debates",
  },
  {
    src: "/images/hero-images/3.avif",
    topic: "Gaza",
    question: "Should the international community force a permanent ceasefire in Gaza?",
    href: "/debates",
  },
  {
    src: "/images/hero-images/4.avif",
    topic: "Regional Exodus",
    question: "Should MENA's 24 million displaced be treated as one crisis, not many?",
    href: "/debates",
  },
];

export interface HeroGalleryProps {
  posters?: HeroPoster[];
}

export function HeroGallery({ posters = DEFAULT_POSTERS }: HeroGalleryProps) {
  const [, navigate] = useLocation();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduceMotion = useReducedMotion();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (paused || posters.length <= 1) return;
    intervalRef.current = setInterval(() => {
      setCurrentIdx((i) => (i + 1) % posters.length);
    }, ROTATE_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [paused, posters.length]);

  const current = posters[currentIdx];
  const stripIndices = useMemo(() => Array.from({ length: STRIP_COUNT }, (_, i) => i), []);

  const handleClick = () => {
    if (current?.href) navigate(current.href);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    } else if (e.key === "ArrowRight") {
      setCurrentIdx((i) => (i + 1) % posters.length);
    } else if (e.key === "ArrowLeft") {
      setCurrentIdx((i) => (i - 1 + posters.length) % posters.length);
    }
  };

  return (
    <div
      className="group relative w-full aspect-[3/4] overflow-hidden bg-secondary border border-border cursor-pointer select-none"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`${current.topic}: ${current.question}`}
    >
      {reduceMotion ? (
        <img
          src={current.src}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        stripIndices.map((i) => {
          const goingDown = i % 2 === 0;
          return (
            <div
              key={i}
              className="absolute top-0 bottom-0 overflow-hidden"
              style={{
                left: `${(i / STRIP_COUNT) * 100}%`,
                width: `${100 / STRIP_COUNT}%`,
              }}
            >
              <AnimatePresence initial={false}>
                <motion.div
                  key={currentIdx}
                  className="absolute inset-0"
                  style={{
                    backgroundImage: `url("${current.src}")`,
                    backgroundSize: `${STRIP_COUNT * 100}% 100%`,
                    backgroundPosition: `${(i / Math.max(STRIP_COUNT - 1, 1)) * 100}% 0%`,
                    backgroundRepeat: "no-repeat",
                  }}
                  initial={{ y: goingDown ? "-101%" : "101%" }}
                  animate={{ y: "0%" }}
                  exit={{ y: goingDown ? "101%" : "-101%" }}
                  transition={{
                    duration: STRIP_DURATION_MS / 1000,
                    ease: EASE_OUT_EXPO,
                    delay: (i * STRIP_STAGGER_MS) / 1000,
                  }}
                />
              </AnimatePresence>
            </div>
          );
        })
      )}

      {/* Gradient scrim for legibility of overlay text */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/85 via-black/20 to-black/40" />

      {/* Top label */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between text-[10px] uppercase tracking-[0.22em] font-bold font-serif text-white/80">
        <AnimatePresence mode="wait">
          <motion.span
            key={`topic-${currentIdx}`}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.35, ease: EASE_OUT_EXPO, delay: 0.1 }}
            className="flex items-center gap-1.5"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            {current.topic}
          </motion.span>
        </AnimatePresence>
        <span className="tabular-nums text-white/60">
          {String(currentIdx + 1).padStart(2, "0")}/{String(posters.length).padStart(2, "0")}
        </span>
      </div>

      {/* Bottom: question + CTA */}
      <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
        <AnimatePresence mode="wait">
          <motion.p
            key={`q-${currentIdx}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.45, ease: EASE_OUT_EXPO, delay: 0.15 }}
            className="font-serif font-black uppercase text-white text-[15px] sm:text-base leading-tight tracking-tight mb-3"
          >
            {current.question}
          </motion.p>
        </AnimatePresence>
        <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] font-bold font-serif text-primary group-hover:text-white transition-colors">
          Where do you stand? →
        </span>
      </div>

      {/* Progress dots */}
      <div className="absolute top-12 right-3 flex flex-col gap-1.5">
        {posters.map((_, i) => (
          <button
            key={i}
            onClick={(e) => {
              e.stopPropagation();
              setCurrentIdx(i);
            }}
            aria-label={`Go to poster ${i + 1}`}
            className={`w-1.5 h-1.5 rounded-full transition-all ${
              i === currentIdx ? "bg-primary scale-125" : "bg-white/40 hover:bg-white/70"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
