import type { ReactNode } from "react";
import { TitlePunctuation } from "@/components/TitlePunctuation";
import { useI18n } from "@/lib/i18n";

interface EditorialPageHeroProps {
  eyebrow: string;
  titleLine1: string;
  titleLine2: string;
  subtitle: string;
  note: string;
  punctuations?: string[];
  stats: Array<{ value: string | number; label: string }>;
  children?: ReactNode;
}

export function EditorialPageHero({
  eyebrow,
  titleLine1,
  titleLine2,
  subtitle,
  note,
  punctuations,
  stats,
  children,
}: EditorialPageHeroProps) {
  const { t, isAr } = useI18n();

  return (
    <section className="border-b border-border bg-foreground text-background">
      <div className="mx-auto max-w-7xl px-4 pb-10 pt-16 sm:px-6 lg:px-8">
        <p className="mb-2 font-serif text-[0.78rem] font-bold uppercase tracking-[0.28em] text-primary">
          {t(eyebrow)}
        </p>
        <h1
          className="mb-2 font-serif text-[clamp(2rem,5vw,3.5rem)] font-black uppercase leading-[1.05] tracking-[-0.01em] text-background"
          style={{ fontFamily: isAr ? "'IBM Plex Sans Arabic', sans-serif" : undefined }}
        >
          {t(titleLine1)}
          <br />
          {t(titleLine2)}
          <TitlePunctuation punctuations={punctuations} />
        </h1>
        <p className="font-serif text-[0.9rem] font-bold uppercase tracking-[0.18em]">
          {t(subtitle)}
        </p>
        <p className="mt-2 font-sans text-[0.78rem] italic text-white/65">
          {t(note)}
        </p>
      </div>

      {children}

      <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-2 border-t border-white/[0.06] bg-[#0D0D0D] px-4 py-[0.65rem]">
        {stats.map((stat, index) => (
          <div key={stat.label} className="contents">
            {index > 0 && <span className="h-3.5 w-px bg-white/10" aria-hidden="true" />}
            <span className="font-serif text-[0.83rem] font-bold uppercase tracking-[0.15em] text-white/75">
              <strong className="mr-1.5 text-[0.85rem] font-black text-primary">{stat.value}</strong>
              {t(stat.label)}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
