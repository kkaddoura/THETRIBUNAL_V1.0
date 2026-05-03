"use client";
import React, { useEffect, useRef, useCallback } from "react";
import { useInView } from "motion/react";
import { cn } from "@/lib/utils";

type EncryptedTextProps = {
  text: string;
  className?: string;
  revealDelayMs?: number;
  charset?: string;
  flipDelayMs?: number;
  encryptedClassName?: string;
  revealedClassName?: string;
};

const DEFAULT_CHARSET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-={}[];:,.<>/?";

function randomChar(charset: string): string {
  return charset.charAt(Math.floor(Math.random() * charset.length));
}

export const EncryptedText: React.FC<EncryptedTextProps> = ({
  text,
  className,
  revealDelayMs = 50,
  charset = DEFAULT_CHARSET,
  flipDelayMs = 50,
  encryptedClassName,
  revealedClassName,
}) => {
  const containerRef = useRef<HTMLSpanElement>(null);
  const isInView = useInView(containerRef, { once: true });
  const spanRefs = useRef<(HTMLSpanElement | null)[]>([]);

  // Pre-compute class strings once so we don't call cn() every frame
  const encryptedCls = encryptedClassName ?? "";
  const revealedCls = revealedClassName ?? "";

  const setSpanRef = useCallback(
    (index: number) => (el: HTMLSpanElement | null) => {
      spanRefs.current[index] = el;
    },
    [],
  );

  useEffect(() => {
    if (!isInView || !text) return;

    const chars = text.split("");
    const len = chars.length;
    const spans = spanRefs.current;
    let revealCount = 0;
    let lastFlipTime = 0;
    let rafId: number;

    // Initialize all spans to scrambled state
    for (let i = 0; i < len; i++) {
      const span = spans[i];
      if (!span) continue;
      span.textContent = chars[i] === " " ? " " : randomChar(charset);
      span.className = encryptedCls;
    }

    const startTime = performance.now();

    const update = (now: number) => {
      const elapsed = now - startTime;
      const newRevealCount = Math.min(
        len,
        Math.floor(elapsed / Math.max(1, revealDelayMs)),
      );

      // Reveal newly solved characters via DOM
      for (let i = revealCount; i < newRevealCount; i++) {
        const span = spans[i];
        if (!span) continue;
        span.textContent = chars[i] === " " ? " " : chars[i];
        span.className = revealedCls;
      }
      revealCount = newRevealCount;

      if (revealCount >= len) return;

      // Scramble unrevealed characters on the flip interval
      if (now - lastFlipTime >= flipDelayMs) {
        for (let i = revealCount; i < len; i++) {
          const span = spans[i];
          if (!span || chars[i] === " ") continue;
          span.textContent = randomChar(charset);
        }
        lastFlipTime = now;
      }

      rafId = requestAnimationFrame(update);
    };

    rafId = requestAnimationFrame(update);

    return () => cancelAnimationFrame(rafId);
  }, [isInView, text, revealDelayMs, charset, flipDelayMs, encryptedCls, revealedCls]);

  if (!text) return null;

  return (
    <span ref={containerRef} className={cn(className)} aria-label={text} role="text">
      {text.split("").map((char, i) => (
        <span key={i} ref={setSpanRef(i)}>
          {char === " " ? " " : "\u00A0"}
        </span>
      ))}
    </span>
  );
};
