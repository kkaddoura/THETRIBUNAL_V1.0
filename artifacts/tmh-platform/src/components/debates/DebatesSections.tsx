import { useMemo } from "react";
import { usePageConfig } from "@/hooks/use-cms-data";
import { DebateSection, type DebateSectionConfig } from "./DebateSection";
import { PastVotedSection } from "./PastVotedSection";

interface DebatesPageConfig {
  sections?: DebateSectionConfig[];
}

interface Props {
  emptyState?: { title?: string; body?: string };
}

export function DebatesSections({ emptyState }: Props) {
  const { data, isLoading } = usePageConfig<DebatesPageConfig>("polls");

  const sections = useMemo(() => {
    const list = Array.isArray(data?.sections) ? data!.sections! : [];
    return list
      .filter((s) => s && s.enabled !== false)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [data]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center text-muted-foreground text-sm">
        Loading debates...
      </div>
    );
  }

  if (sections.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center border border-dashed border-border bg-secondary/30">
        <h3 className="font-serif font-bold text-2xl uppercase tracking-wider text-foreground mb-2">
          {emptyState?.title || "No debates yet"}
        </h3>
        <p className="text-sm text-muted-foreground font-sans">
          {emptyState?.body || "Check back soon — new debates are added regularly."}
        </p>
      </div>
    );
  }

  return (
    <div>
      {sections.map((section) => (
        <DebateSection key={section.id} section={section} />
      ))}
      <PastVotedSection />
    </div>
  );
}
