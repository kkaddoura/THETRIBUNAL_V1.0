import { useState, useEffect, useMemo } from "react";
import { api } from "@/lib/api";
import { Save, Plus, Trash2, GripVertical, Eye, EyeOff, ChevronDown, ChevronUp, X, ExternalLink, AlertTriangle } from "lucide-react";

const PAGE_KEY = "polls";

// Multi-select sections: categories OR tags are OR'd together across both
// types. `mode`, `manualPostIds`, `tag`, `categorySlug` are kept as optional
// legacy fields so we can migrate older configs on load (see migrateSection
// below) without forcing a DB script.
interface DebateSectionConfig {
  id: string;
  enabled: boolean;
  order: number;
  title: string;
  subtitle?: string;
  categorySlugs: string[];
  tags: string[];
  cardLimit: number;
  showSeeAll: boolean;
  // Legacy fields — preserved for round-trip safety but no longer edited.
  mode?: "manual" | "tag" | "category";
  manualPostIds?: number[];
  tag?: string;
  categorySlug?: string;
}

interface CategoryOption {
  slug: string;
  name: string;
  pollCount?: number;
}

interface DebatesPageConfig {
  hero: { titleLine1: string; titleLine2: string; subtitle: string };
  punctuations?: string[];
  ticker: { enabled: boolean; source: string };
  sortLabels?: { latest: string; trending: string; ending_soon: string };
  emptyState: { title: string; body: string };
  sections?: DebateSectionConfig[];
}

const DEFAULT_CARD_LIMIT = 8;
const MAX_CARD_LIMIT = 20;
const MAX_SECTIONS = 12;

function newSectionId() {
  return `s_${Math.random().toString(36).slice(2, 10)}`;
}

function defaultSection(order: number): DebateSectionConfig {
  return {
    id: newSectionId(),
    enabled: true,
    order,
    title: "New Section",
    subtitle: "",
    categorySlugs: [],
    tags: [],
    cardLimit: DEFAULT_CARD_LIMIT,
    showSeeAll: false,
  };
}

// Migrate a single saved section to the multi-select shape. Idempotent — if
// the section is already in the new shape, just normalises types.
// - mode: "category" + categorySlug → categorySlugs: [slug]
// - mode: "tag"      + tag          → tags: [tag]
// - mode: "manual" / unknown        → both empty (UI surfaces a warning)
function migrateSection(raw: any, fallbackOrder: number): DebateSectionConfig {
  const base: DebateSectionConfig = {
    id: typeof raw?.id === "string" && raw.id ? raw.id : newSectionId(),
    enabled: raw?.enabled !== false,
    order: typeof raw?.order === "number" ? raw.order : fallbackOrder,
    title: typeof raw?.title === "string" ? raw.title : "",
    subtitle: typeof raw?.subtitle === "string" ? raw.subtitle : "",
    categorySlugs: [],
    tags: [],
    cardLimit:
      typeof raw?.cardLimit === "number" && raw.cardLimit > 0
        ? Math.min(raw.cardLimit, MAX_CARD_LIMIT)
        : DEFAULT_CARD_LIMIT,
    showSeeAll: !!raw?.showSeeAll,
    mode: raw?.mode,
    manualPostIds: Array.isArray(raw?.manualPostIds) ? raw.manualPostIds : undefined,
    tag: typeof raw?.tag === "string" ? raw.tag : undefined,
    categorySlug: typeof raw?.categorySlug === "string" ? raw.categorySlug : undefined,
  };

  // Already on the new shape — trust + dedupe.
  if (Array.isArray(raw?.categorySlugs) || Array.isArray(raw?.tags)) {
    const cats = Array.isArray(raw?.categorySlugs)
      ? raw.categorySlugs.filter((s: any) => typeof s === "string" && s.trim())
      : [];
    const tgs = Array.isArray(raw?.tags)
      ? raw.tags.filter((s: any) => typeof s === "string" && s.trim()).map((s: string) => s.trim())
      : [];
    base.categorySlugs = Array.from(new Set(cats));
    base.tags = Array.from(new Set(tgs));
    return base;
  }

  // Legacy single-value shape.
  if (raw?.mode === "category" && typeof raw?.categorySlug === "string" && raw.categorySlug.trim()) {
    base.categorySlugs = [raw.categorySlug.trim()];
  } else if (raw?.mode === "tag" && typeof raw?.tag === "string" && raw.tag.trim()) {
    base.tags = [raw.tag.trim()];
  }
  // Manual mode (or anything else) → both empty; UI shows a "legacy manual
  // section" banner so the editor can pick filters or delete the section.
  return base;
}

export default function PageDebates() {
  const [config, setConfig] = useState<DebatesPageConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([]);

  useEffect(() => {
    // Saved config may be partial (older entries pre-date some fields, fresh
    // installs start empty). Backfill every required key with a sane default
    // so the JSX below can read .ticker.enabled etc. without crashing.
    const defaults: DebatesPageConfig = {
      hero: { titleLine1: "", titleLine2: "", subtitle: "" },
      ticker: { enabled: true, source: "latest_debates" },
      emptyState: { title: "", body: "" },
      sections: [],
    };
    api
      .getPage(PAGE_KEY)
      .then((c: any) => {
        const raw = c ?? {};
        const rawSections = Array.isArray(raw.sections) ? raw.sections : [];
        const cfg: DebatesPageConfig = {
          ...defaults,
          ...raw,
          hero: { ...defaults.hero, ...(raw.hero ?? {}) },
          ticker: { ...defaults.ticker, ...(raw.ticker ?? {}) },
          emptyState: { ...defaults.emptyState, ...(raw.emptyState ?? {}) },
          // Migrate each saved section on load. Legacy single-value shapes
          // (mode: "category"|"tag"|"manual") are mapped to the new multi-
          // select shape; manual sections come through as empty filter
          // sections + the editor surfaces a warning banner on the card.
          sections: rawSections.map((s: any, idx: number) => migrateSection(s, idx)),
        };
        setConfig(cfg);
      })
      .catch((err: unknown) => {
        console.error(err);
        setConfig(defaults);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const cats: any[] = data?.categories ?? [];
        setCategoryOptions(
          cats
            .filter((c) => c?.slug)
            .map((c) => ({ slug: c.slug, name: c.name ?? c.slug, pollCount: c.pollCount })),
        );
      })
      .catch(() => setCategoryOptions([]));
  }, []);

  const save = async () => {
    if (!config) return;
    setSaving(true);
    try {
      await api.updatePage(PAGE_KEY, config as unknown as Record<string, unknown>);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const sections = config?.sections ?? [];
  const sortedSections = useMemo(
    () => [...sections].sort((a, b) => a.order - b.order),
    [sections],
  );

  const updateSections = (next: DebateSectionConfig[]) => {
    if (!config) return;
    setConfig({ ...config, sections: next });
  };

  const addSection = () => {
    if (!config) return;
    if (sections.length >= MAX_SECTIONS) {
      alert(`Maximum ${MAX_SECTIONS} sections allowed`);
      return;
    }
    const nextOrder = sections.length === 0 ? 0 : Math.max(...sections.map((s) => s.order)) + 1;
    const created = defaultSection(nextOrder);
    updateSections([...sections, created]);
    setExpandedSection(created.id);
    // New section + its editor render below the existing list. Without
    // scrolling, the user just sees "New Section · 0 debates picked" at the
    // top of the row and misses the editor (title, mode, picker) sitting
    // below the fold. Scroll the editor into view + autofocus the title
    // input so they can rename + link a topic right away.
    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-section-id="${created.id}"]`) as HTMLElement | null;
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      const input = el?.querySelector<HTMLInputElement>('input[type="text"]');
      input?.focus();
      input?.select();
    });
  };

  const removeSection = (id: string) => {
    updateSections(sections.filter((s) => s.id !== id));
    if (expandedSection === id) setExpandedSection(null);
  };

  const updateSection = (id: string, patch: Partial<DebateSectionConfig>) => {
    updateSections(sections.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const moveSection = (id: string, direction: "up" | "down") => {
    const sorted = [...sections].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((s) => s.id === id);
    if (direction === "up" && idx > 0) {
      const prev = sorted[idx - 1].order;
      sorted[idx - 1].order = sorted[idx].order;
      sorted[idx].order = prev;
    } else if (direction === "down" && idx < sorted.length - 1) {
      const next = sorted[idx + 1].order;
      sorted[idx + 1].order = sorted[idx].order;
      sorted[idx].order = next;
    }
    updateSections(sorted);
  };

  if (loading) return <div className="text-center py-12 text-muted-foreground">Loading...</div>;
  if (!config) return <div className="text-center py-12 text-red-500">Failed to load debates page config</div>;

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold uppercase tracking-wide">Debates Page Config<span className="text-primary">.</span></h1>
        <div className="flex items-center gap-2">
          <a
            href="/debates"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 bg-card border border-border text-foreground rounded-sm text-sm hover:bg-accent"
          >
            <ExternalLink className="w-3.5 h-3.5" /> View Page
          </a>
          <button onClick={save} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-sm text-sm hover:bg-primary/90 disabled:opacity-50">
            <Save className="w-4 h-4" /> {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
          </button>
        </div>
      </div>

      <section className="border border-border rounded-sm p-4 space-y-3">
        <h2 className="font-serif text-lg font-bold uppercase tracking-wide">Hero</h2>
        <div>
          <label className="block text-xs text-muted-foreground uppercase tracking-wider mb-1">Title Line 1</label>
          <input value={config.hero.titleLine1} onChange={e => setConfig({ ...config, hero: { ...config.hero, titleLine1: e.target.value } })} placeholder="Line 1" className="w-full px-3 py-2 bg-background border border-border rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground uppercase tracking-wider mb-1">Title Line 2</label>
          <div className="flex items-center gap-2">
            <input value={config.hero.titleLine2} onChange={e => setConfig({ ...config, hero: { ...config.hero, titleLine2: e.target.value } })} placeholder="Line 2" className="flex-1 px-3 py-2 bg-background border border-border rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
            <input value={(config.punctuations ?? ["."]).join("")} onChange={e => setConfig({ ...config, punctuations: e.target.value ? e.target.value.split("") : [] })} placeholder="." className="w-16 px-2 py-2 bg-background border border-border rounded-sm text-sm text-primary font-bold text-center focus:outline-none focus:ring-1 focus:ring-primary" title="Punctuation (renders in primary color)" />
          </div>
        </div>
        <textarea value={config.hero.subtitle} onChange={e => setConfig({ ...config, hero: { ...config.hero, subtitle: e.target.value } })} rows={2} placeholder="Subtitle" className="w-full px-3 py-2 bg-background border border-border rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none" />
      </section>

      <section className="border border-border rounded-sm p-4 space-y-3">
        <h2 className="font-serif text-lg font-bold uppercase tracking-wide">Ticker</h2>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={config.ticker.enabled} onChange={e => setConfig({ ...config, ticker: { ...config.ticker, enabled: e.target.checked } })} className="rounded" />
          Ticker Enabled
        </label>
        <div>
          <label className="block text-[0.6rem] text-muted-foreground uppercase mb-0.5">Source</label>
          <select value={config.ticker.source} onChange={e => setConfig({ ...config, ticker: { ...config.ticker, source: e.target.value } })} className="w-full px-2 py-1.5 bg-background border border-border rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary">
            <option value="latest_debates">Latest Debates</option>
            <option value="trending_debates">Trending Debates</option>
            <option value="featured_debates">Featured Debates</option>
          </select>
        </div>
      </section>

      <section className="border border-border rounded-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-serif text-lg font-bold uppercase tracking-wide">Sections</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Each section becomes a horizontal-scroll row on the public page. Use up/down to reorder, eye to hide.
              Max {MAX_SECTIONS} sections.
            </p>
          </div>
          <button
            onClick={addSection}
            disabled={sections.length >= MAX_SECTIONS}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-sm text-sm hover:bg-primary/90 disabled:opacity-40"
          >
            <Plus className="w-3.5 h-3.5" /> Add Section
          </button>
        </div>

        {sortedSections.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border rounded-sm">
            No sections yet. Click "Add Section" to create one.
          </p>
        ) : (
          <div className="space-y-2">
            {sortedSections.map((section) => (
              <div key={section.id} data-section-id={section.id} className="border border-border rounded-md bg-card">
                <div className="flex items-center gap-3 px-4 py-3">
                  <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{section.title || "(untitled)"}</p>
                    <p className="text-xs text-muted-foreground">
                      {(() => {
                        const catCount = section.categorySlugs.length;
                        const tagCount = section.tags.length;
                        if (catCount === 0 && tagCount === 0) return "No filters — empty section";
                        const parts: string[] = [];
                        if (catCount > 0) parts.push(`${catCount} categor${catCount === 1 ? "y" : "ies"}`);
                        if (tagCount > 0) parts.push(`${tagCount} tag${tagCount === 1 ? "" : "s"}`);
                        return parts.join(" + ");
                      })()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => moveSection(section.id, "up")} className="p-1 text-muted-foreground hover:text-foreground"><ChevronUp className="w-4 h-4" /></button>
                    <button onClick={() => moveSection(section.id, "down")} className="p-1 text-muted-foreground hover:text-foreground"><ChevronDown className="w-4 h-4" /></button>
                    <button
                      onClick={() => updateSection(section.id, { enabled: !section.enabled })}
                      className={`p-1.5 rounded ${section.enabled ? "text-green-500" : "text-muted-foreground"}`}
                      title={section.enabled ? "Visible on public page" : "Hidden"}
                    >
                      {section.enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
                      className="p-1 text-muted-foreground hover:text-foreground text-xs"
                    >
                      {expandedSection === section.id ? "Close" : "Edit"}
                    </button>
                    <button onClick={() => removeSection(section.id)} className="p-1 text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>

                {expandedSection === section.id && (
                  <div className="px-4 pb-4 pt-1 border-t border-border space-y-3">
                    {/*
                      Legacy "manual" sections from before the multi-select
                      refactor migrate to empty filter sections (no
                      categories, no tags). Surface a clear banner so editors
                      know to either configure filters or delete the section.
                      The same banner also covers brand-new sections that
                      haven't had any filters picked yet, which is fine —
                      message reads cleanly in both cases.
                    */}
                    {section.categorySlugs.length === 0 && section.tags.length === 0 && (
                      <div className="flex items-start gap-2 px-3 py-2 border border-red-500/40 bg-red-500/10 rounded-sm text-xs text-red-300">
                        <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                        <span>
                          {section.mode === "manual"
                            ? "Legacy manual section — pick categories/tags or delete."
                            : "No filters selected — pick at least one category or tag, or delete this section."}
                        </span>
                      </div>
                    )}

                    <Field label="Section Title">
                      <input
                        type="text"
                        value={section.title}
                        onChange={(e) => updateSection(section.id, { title: e.target.value })}
                        placeholder="e.g. Top Picks This Week"
                        className="w-full px-3 py-2 bg-background border border-border rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </Field>

                    <Field label="Subtitle (optional)">
                      <input
                        type="text"
                        value={section.subtitle ?? ""}
                        onChange={(e) => updateSection(section.id, { subtitle: e.target.value })}
                        placeholder="Short context line shown beneath the title"
                        className="w-full px-3 py-2 bg-background border border-border rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </Field>

                    {/*
                      Filters: categories + tags. OR within each list, OR
                      across both lists ("show debates matching ANY selected
                      category OR ANY selected tag"). Newest-first.
                    */}
                    <CategoryMultiPicker
                      options={categoryOptions}
                      slugs={section.categorySlugs}
                      onChange={(slugs) => updateSection(section.id, { categorySlugs: slugs })}
                    />
                    <TagMultiPicker
                      tags={section.tags}
                      onChange={(tags) => updateSection(section.id, { tags })}
                    />

                    <div className="grid grid-cols-2 gap-3">
                      <Field label={`Cards shown (max ${MAX_CARD_LIMIT})`}>
                        <input
                          type="number"
                          min={1}
                          max={MAX_CARD_LIMIT}
                          value={section.cardLimit}
                          onChange={(e) => {
                            const n = Math.max(1, Math.min(Number(e.target.value) || DEFAULT_CARD_LIMIT, MAX_CARD_LIMIT));
                            updateSection(section.id, { cardLimit: n });
                          }}
                          className="w-full px-3 py-2 bg-background border border-border rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </Field>
                      <Field label="See-all link">
                        <label className="flex items-center gap-2 text-sm pt-2">
                          <input
                            type="checkbox"
                            checked={section.showSeeAll}
                            onChange={(e) => updateSection(section.id, { showSeeAll: e.target.checked })}
                            className="accent-primary"
                          />
                          Show "See all →" link
                        </label>
                      </Field>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="border border-border rounded-sm p-4 space-y-3">
        <h2 className="font-serif text-lg font-bold uppercase tracking-wide">Empty State</h2>
        <input value={config.emptyState.title} onChange={e => setConfig({ ...config, emptyState: { ...config.emptyState, title: e.target.value } })} placeholder="Title" className="w-full px-3 py-2 bg-background border border-border rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
        <textarea value={config.emptyState.body} onChange={e => setConfig({ ...config, emptyState: { ...config.emptyState, body: e.target.value } })} rows={2} placeholder="Body" className="w-full px-3 py-2 bg-background border border-border rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none" />
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-muted-foreground uppercase tracking-wider mb-1">{label}</label>
      {children}
    </div>
  );
}

// Multi-select chips for categories. OR within the picker (server treats
// multiple categories as a SQL IN list). Click an unselected category to
// add; click a chip's X (or the chip again) to remove.
function CategoryMultiPicker({
  options,
  slugs,
  onChange,
}: {
  options: CategoryOption[];
  slugs: string[];
  onChange: (slugs: string[]) => void;
}) {
  const selectedSet = useMemo(() => new Set(slugs), [slugs]);
  const selected = useMemo(
    () => slugs.map((s) => options.find((o) => o.slug === s) ?? { slug: s, name: s }),
    [slugs, options],
  );
  const available = useMemo(
    () => options.filter((o) => !selectedSet.has(o.slug)),
    [options, selectedSet],
  );

  const remove = (slug: string) => onChange(slugs.filter((s) => s !== slug));
  const add = (slug: string) => {
    if (!slug || selectedSet.has(slug)) return;
    onChange([...slugs, slug]);
  };

  return (
    <div className="space-y-1">
      <Field label={`Categories (${selected.length})`}>
        {selected.length === 0 ? (
          <p className="text-xs text-muted-foreground border border-dashed border-border rounded-sm py-2 px-2 text-center">
            None selected. Pick one or more below.
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {selected.map((c) => (
              <span
                key={c.slug}
                className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 bg-primary/20 border border-primary/40 rounded-sm text-xs"
                title={c.slug}
              >
                {c.name}
                <button
                  onClick={() => remove(c.slug)}
                  className="p-0.5 text-muted-foreground hover:text-red-400"
                  title="Remove"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </Field>
      <select
        value=""
        onChange={(e) => {
          add(e.target.value);
          // Reset native select back to placeholder so the same option can
          // be re-picked after removal in the same session.
          e.currentTarget.value = "";
        }}
        className="w-full px-3 py-2 bg-background border border-border rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary"
      >
        <option value="">— Add a category —</option>
        {available.map((c) => (
          <option key={c.slug} value={c.slug}>
            {c.name}
            {typeof c.pollCount === "number" ? ` (${c.pollCount})` : ""}
          </option>
        ))}
      </select>
      <p className="text-xs text-muted-foreground">
        Debates matching ANY selected category will appear (OR logic).
      </p>
    </div>
  );
}

// Multi-tag chip input. Comma or Enter splits / commits the typed term.
// Tags are lowercased + trimmed + de-duped at write time.
function TagMultiPicker({
  tags,
  onChange,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  const commit = (raw: string) => {
    const next = new Set(tags);
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
      .forEach((t) => next.add(t));
    onChange(Array.from(next));
    setDraft("");
  };

  const remove = (t: string) => onChange(tags.filter((x) => x !== t));

  return (
    <div className="space-y-1">
      <Field label={`Tags (${tags.length})`}>
        {tags.length === 0 ? (
          <p className="text-xs text-muted-foreground border border-dashed border-border rounded-sm py-2 px-2 text-center">
            None yet. Type below and press Enter or comma.
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 bg-secondary/60 border border-border rounded-sm text-xs"
              >
                {t}
                <button
                  onClick={() => remove(t)}
                  className="p-0.5 text-muted-foreground hover:text-red-400"
                  title="Remove"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </Field>
      <input
        type="text"
        value={draft}
        onChange={(e) => {
          const v = e.target.value;
          // Commit on comma typed mid-string so a paste of "a,b,c" lands as
          // three chips even without an Enter press.
          if (v.includes(",")) {
            commit(v);
            return;
          }
          setDraft(v);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (draft.trim()) commit(draft);
          } else if (e.key === "Backspace" && !draft && tags.length > 0) {
            // Quick remove-last on backspace in an empty input.
            onChange(tags.slice(0, -1));
          }
        }}
        onBlur={() => {
          if (draft.trim()) commit(draft);
        }}
        placeholder="e.g. israel-palestine, economy, energy"
        className="w-full px-3 py-2 bg-background border border-border rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary"
      />
      <p className="text-xs text-muted-foreground">
        Debates matching ANY selected tag will appear (OR logic, also OR'd with categories).
      </p>
    </div>
  );
}
