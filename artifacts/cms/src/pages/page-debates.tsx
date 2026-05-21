import { useState, useEffect, useMemo, useRef } from "react";
import { api } from "@/lib/api";
import { Save, Plus, Trash2, GripVertical, Eye, EyeOff, ChevronDown, ChevronUp, X, ExternalLink, Search } from "lucide-react";

const PAGE_KEY = "polls";

interface DebateSectionConfig {
  id: string;
  enabled: boolean;
  order: number;
  title: string;
  subtitle?: string;
  mode: "manual" | "tag" | "category";
  manualPostIds: number[];
  tag: string;
  categorySlug: string;
  cardLimit: number;
  showSeeAll: boolean;
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

interface DebateOption {
  id: number;
  question: string;
  category?: string;
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
    mode: "manual",
    manualPostIds: [],
    tag: "",
    categorySlug: "",
    cardLimit: DEFAULT_CARD_LIMIT,
    showSeeAll: false,
  };
}

export default function PageDebates() {
  const [config, setConfig] = useState<DebatesPageConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [debateOptions, setDebateOptions] = useState<DebateOption[]>([]);
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
        const cfg: DebatesPageConfig = {
          ...defaults,
          ...raw,
          hero: { ...defaults.hero, ...(raw.hero ?? {}) },
          ticker: { ...defaults.ticker, ...(raw.ticker ?? {}) },
          emptyState: { ...defaults.emptyState, ...(raw.emptyState ?? {}) },
          sections: Array.isArray(raw.sections) ? raw.sections : [],
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
    api
      .getDebates("approved")
      .then((res: any) => {
        const raw: any[] = res?.items ?? res ?? [];
        setDebateOptions(
          raw.map((r: any) => ({ id: r.id, question: r.question, category: r.category })),
        );
      })
      .catch(() => setDebateOptions([]));
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
    <div className="space-y-6 max-w-4xl">
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
                    <p className="text-xs text-muted-foreground capitalize">
                      {section.mode === "manual"
                        ? `${section.manualPostIds.length} debate${section.manualPostIds.length === 1 ? "" : "s"} picked`
                        : section.mode === "tag"
                          ? section.tag ? `Tag: ${section.tag}` : "Tag: (not set)"
                          : section.categorySlug
                            ? `Category: ${categoryOptions.find((c) => c.slug === section.categorySlug)?.name ?? section.categorySlug}`
                            : "Category: (not set)"}
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

                    <Field label="Population Mode">
                      <div className="flex items-center gap-4 text-sm flex-wrap">
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            checked={section.mode === "manual"}
                            onChange={() => updateSection(section.id, { mode: "manual" })}
                          />
                          Manual pick
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            checked={section.mode === "category"}
                            onChange={() => updateSection(section.id, { mode: "category" })}
                          />
                          Category (newest first)
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            checked={section.mode === "tag"}
                            onChange={() => updateSection(section.id, { mode: "tag" })}
                          />
                          Tag (newest first)
                        </label>
                      </div>
                    </Field>

                    {section.mode === "manual" && (
                      <ManualPicker
                        options={debateOptions}
                        selectedIds={section.manualPostIds}
                        onChange={(ids) => updateSection(section.id, { manualPostIds: ids })}
                      />
                    )}
                    {section.mode === "category" && (
                      <CategoryPicker
                        options={categoryOptions}
                        slug={section.categorySlug}
                        onChange={(slug) => updateSection(section.id, { categorySlug: slug })}
                      />
                    )}
                    {section.mode === "tag" && (
                      <TagPicker
                        tag={section.tag}
                        onChange={(tag) => updateSection(section.id, { tag })}
                      />
                    )}

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

function ManualPicker({
  options,
  selectedIds,
  onChange,
}: {
  options: DebateOption[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const optionById = useMemo(() => {
    const m = new Map<number, DebateOption>();
    for (const o of options) m.set(o.id, o);
    return m;
  }, [options]);

  const selected = useMemo(
    () => selectedIds.map((id) => optionById.get(id)).filter((o): o is DebateOption => !!o),
    [selectedIds, optionById],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return options
      .filter((o) => !selectedIds.includes(o.id))
      .filter((o) =>
        !q ||
        o.question?.toLowerCase().includes(q) ||
        String(o.id).includes(q) ||
        o.category?.toLowerCase().includes(q),
      )
      .slice(0, 25);
  }, [options, selectedIds, search]);

  const add = (id: number) => {
    onChange([...selectedIds, id]);
    setSearch("");
  };
  const remove = (id: number) => onChange(selectedIds.filter((i) => i !== id));
  const move = (id: number, direction: "up" | "down") => {
    const idx = selectedIds.indexOf(id);
    if (idx < 0) return;
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === selectedIds.length - 1) return;
    const next = [...selectedIds];
    const swap = direction === "up" ? idx - 1 : idx + 1;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <Field label={`Selected debates (${selected.length})`}>
        {selected.length === 0 ? (
          <p className="text-xs text-muted-foreground border border-dashed border-border rounded-sm py-3 px-2 text-center">
            None yet. Search below to add debates.
          </p>
        ) : (
          <ul className="space-y-1">
            {selected.map((s, idx) => (
              <li key={s.id} className="flex items-center gap-2 px-2 py-1.5 bg-secondary/40 rounded-sm">
                <span className="text-primary font-mono text-[10px] w-12 flex-shrink-0">#{s.id}</span>
                <span className="flex-1 truncate text-sm">{s.question}</span>
                {s.category && <span className="text-[10px] text-muted-foreground flex-shrink-0">{s.category}</span>}
                <button
                  onClick={() => move(s.id, "up")}
                  disabled={idx === 0}
                  className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                  title="Move up"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => move(s.id, "down")}
                  disabled={idx === selected.length - 1}
                  className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                  title="Move down"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => remove(s.id)}
                  className="p-1 text-muted-foreground hover:text-red-500"
                  title="Remove"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Field>

      <div ref={ref} className="relative">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="Search debates by question, category, or ID..."
            className="w-full pl-8 pr-3 py-2 bg-background border border-border rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        {open && (
          <div className="absolute z-50 mt-1 w-full max-h-56 overflow-auto bg-card border border-border rounded-sm shadow-lg">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">No matches</p>
            ) : (
              filtered.map((item) => (
                <button
                  key={item.id}
                  onClick={() => add(item.id)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-secondary/50 flex items-center gap-2 border-b border-border/30 last:border-0"
                >
                  <span className="text-primary font-mono text-[10px] flex-shrink-0">#{item.id}</span>
                  <span className="truncate flex-1">{item.question}</span>
                  {item.category && <span className="text-[10px] text-muted-foreground flex-shrink-0">{item.category}</span>}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function CategoryPicker({
  options,
  slug,
  onChange,
}: {
  options: CategoryOption[];
  slug: string;
  onChange: (slug: string) => void;
}) {
  const selected = options.find((c) => c.slug === slug);
  return (
    <div className="space-y-1">
      <Field label="Category">
        <select
          value={slug}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 bg-background border border-border rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">— Select a category —</option>
          {options.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
              {typeof c.pollCount === "number" ? ` (${c.pollCount})` : ""}
            </option>
          ))}
        </select>
      </Field>
      <p className="text-xs text-muted-foreground">
        {!slug
          ? "Posts will populate by category, sorted newest-first."
          : selected
            ? `≈ ${selected.pollCount ?? "?"} debate${selected.pollCount === 1 ? "" : "s"} in ${selected.name}`
            : "Selected category not in current list (saved value preserved)."}
      </p>
    </div>
  );
}

function TagPicker({ tag, onChange }: { tag: string; onChange: (tag: string) => void }) {
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const trimmed = tag.trim();
    if (!trimmed) {
      setCount(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(() => {
      fetch(`/api/polls?tag=${encodeURIComponent(trimmed)}&limit=1`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (cancelled) return;
          if (data && typeof data.total === "number") setCount(data.total);
          else setCount(null);
        })
        .catch(() => {
          if (!cancelled) setCount(null);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [tag]);

  return (
    <div className="space-y-1">
      <Field label="Tag">
        <input
          type="text"
          value={tag}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. israel-palestine, economy, energy"
          className="w-full px-3 py-2 bg-background border border-border rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </Field>
      <p className="text-xs text-muted-foreground">
        {!tag.trim()
          ? "Posts will populate by tag, sorted newest-first."
          : loading
            ? "Counting matches..."
            : count === null
              ? "Tag does not match anything yet"
              : `≈ ${count} debate${count === 1 ? "" : "s"} currently match this tag`}
      </p>
    </div>
  );
}
