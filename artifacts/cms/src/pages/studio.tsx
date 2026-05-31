import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import { track as trackCms } from "@/lib/analytics";
import { Link } from "wouter";
import {
  Loader2,
  Download,
  Copy,
  RefreshCw,
  Sparkles,
  Wand2,
  ImageIcon,
  Quote,
  Layers,
  Globe2,
  Megaphone,
  Newspaper,
  TrendingUp,
  Users,
  Activity,
  Check,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  LayoutGrid,
  Images,
  GripVertical,
  Search,
  X,
  Square,
  CalendarRange,
} from "lucide-react";

type AtomType =
  | "debate"
  | "prediction"
  | "voice"
  | "pulse"
  | "about-founder"
  | "about-pillar"
  | "about-belief"
  | "about-region"
  | "manifesto";
type Layout = "single" | "carousel-3" | "carousel-5" | "recap-weekly";
type Style = "minimal-serif" | "bold-crimson" | "magazine";
type Platform = "x" | "ig" | "linkedin";
type Tone = "punchy" | "analytical" | "warm" | null;

type Slot = { atomType: AtomType; atomId: number; label: string } | null;
type LibraryTab = AtomType | "all" | "about";

interface LayoutMeta {
  id: Layout;
  label: string;
  hint: string;
  icon: typeof Sparkles;
  slotCount: number;
}

const LAYOUTS: LayoutMeta[] = [
  { id: "single", label: "Single", hint: "1 card", icon: Square, slotCount: 1 },
  { id: "carousel-3", label: "Carousel·3", hint: "3 slides", icon: LayoutGrid, slotCount: 3 },
  { id: "carousel-5", label: "Carousel·5", hint: "5 slides", icon: Images, slotCount: 5 },
  { id: "recap-weekly", label: "Weekly recap", hint: "Auto", icon: CalendarRange, slotCount: 0 },
];

const ATOM_META: Record<AtomType, { label: string; icon: typeof Sparkles }> = {
  debate: { label: "Debate", icon: Newspaper },
  prediction: { label: "Prediction", icon: TrendingUp },
  voice: { label: "Voice", icon: Users },
  pulse: { label: "Pulse", icon: Activity },
  "about-founder": { label: "Founder", icon: Quote },
  "about-pillar": { label: "Pillar", icon: Layers },
  "about-belief": { label: "Belief", icon: Sparkles },
  "about-region": { label: "Region", icon: Globe2 },
  manifesto: { label: "Manifesto", icon: Megaphone },
};

// AtomType → legacy postType token used by sources/captions endpoints.
const ATOM_TO_POSTTYPE: Record<AtomType, string> = {
  debate: "item-poll",
  prediction: "item-prediction",
  voice: "item-voice",
  pulse: "item-pulse",
  "about-founder": "about-founder",
  "about-pillar": "about-pillar",
  "about-belief": "about-belief",
  "about-region": "about-region",
  manifesto: "manifesto",
};

const LIBRARY_TABS: { id: LibraryTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "debate", label: "Debates" },
  { id: "prediction", label: "Predictions" },
  { id: "voice", label: "Voices" },
  { id: "pulse", label: "Pulse" },
  { id: "about", label: "About" },
];

// Fixed singleton rows surfaced under the About tab (atomId 0).
const ABOUT_SINGLETONS: { atomType: AtomType; label: string }[] = [
  { atomType: "about-founder", label: "Founder statement" },
  { atomType: "about-region", label: "Region map" },
  { atomType: "manifesto", label: "Manifesto" },
];

// Mini-preview thumbnails — tiny, static, pure-CSS representations of what
// a generated card looks like in each style so the picker is choosable by sight.
// All three share the same outer geometry (w-20 h-14) so the picker layout
// doesn't shift between selections.
const StylePreview: Record<Style, React.ReactNode> = {
  "minimal-serif": (
    <div
      className="w-20 h-14 rounded-md shrink-0 border border-white/10 overflow-hidden relative"
      style={{ background: "linear-gradient(135deg, #0A0A0A 0%, #1A1A1A 100%)" }}
    >
      <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: "#DC143C" }} />
      <div className="px-1.5 pt-1.5 pb-1 flex flex-col gap-0.5">
        <div className="text-[5px] uppercase tracking-[0.18em] font-bold" style={{ color: "#9A9A9A" }}>
          Debate
        </div>
        <div
          className="text-[8px] leading-[1.05] text-white truncate"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          Quiet headline<span style={{ color: "#DC143C" }}>.</span>
        </div>
      </div>
    </div>
  ),
  "bold-crimson": (
    <div
      className="w-20 h-14 rounded-md shrink-0 border border-white/10 overflow-hidden relative shadow-[inset_0_-6px_12px_-6px_rgba(0,0,0,0.45)]"
      style={{ background: "linear-gradient(135deg, #DC143C 0%, #8A0A24 100%)" }}
    >
      <div className="px-1.5 pt-1 pb-1 flex flex-col h-full justify-between">
        <div
          className="inline-block self-start text-[5px] uppercase tracking-[0.18em] font-bold px-1 py-[1px] rounded-sm"
          style={{ background: "rgba(255,255,255,0.18)", color: "#FFFFFF" }}
        >
          Voice
        </div>
        <div
          className="text-[10px] leading-[0.95] font-extrabold text-white truncate"
          style={{ fontFamily: "'Inter', system-ui, sans-serif", letterSpacing: "-0.02em" }}
        >
          LOUD TAKE
        </div>
      </div>
    </div>
  ),
  magazine: (
    <div
      className="w-20 h-14 rounded-md shrink-0 border border-white/10 overflow-hidden relative"
      style={{ background: "linear-gradient(180deg, #F2EDE4 0%, #EAE3D6 100%)" }}
    >
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: "#DC143C" }} />
      <div className="px-1.5 pt-1.5 pb-1 flex flex-col h-full justify-between">
        <div
          className="text-[8px] leading-[1.05] truncate"
          style={{ fontFamily: "'Playfair Display', Georgia, serif", color: "#0A0A0A" }}
        >
          Print feature
        </div>
        <div
          className="text-[5px] uppercase tracking-[0.18em] font-bold truncate"
          style={{ color: "#7A5A3A" }}
        >
          Issue · 05
        </div>
      </div>
    </div>
  ),
};

const STYLES: { id: Style; label: string; description: string }[] = [
  { id: "minimal-serif", label: "Minimal Serif", description: "Restrained dark, editorial calm." },
  { id: "bold-crimson", label: "Bold Crimson", description: "Loud, full-bleed brand." },
  { id: "magazine", label: "Magazine", description: "Cream paper, accent rules." },
];

const SIZE_ASPECT: Record<string, string> = {
  x_landscape: "16/9",
  ig_square: "1/1",
  ig_story: "9/16",
  linkedin: "1200/627",
};

interface StudioAsset {
  id: number;
  template: string;
  templateFamily: string;
  templateStyle: Style;
  layout?: string | null;
  kitId?: string | null;
  useAiImage?: boolean | null;
  size: string;
  slideIndex: number;
  slideCount: number;
  publicUrl: string;
  captionVariants: { neutral?: string[]; x?: string[]; ig?: string[]; linkedin?: string[] } | null;
  chosenCaptionX: string | null;
  chosenCaptionIg: string | null;
  chosenCaptionLi: string | null;
  toneHint: Tone;
}

interface ComposeResponse {
  kitId: string;
  layout: Layout;
  style: Style;
  useAiImage: boolean;
  slots: Array<{ atomType: AtomType; atomId: number }>;
  generated: Array<{ assetId: number; atomType: AtomType; size: string; slideIndex: number; slideCount: number; publicUrl: string }>;
  failures: Array<{ size: string; slideIndex: number; error: string }>;
  captionVariants: { neutral?: string[]; x?: string[]; ig?: string[]; linkedin?: string[] };
}

const SLOT_COUNT: Record<Layout, number> = {
  single: 1,
  "carousel-3": 3,
  "carousel-5": 5,
  "recap-weekly": 0,
};

function repadSlots(prev: Slot[], target: number): Slot[] {
  const next = prev.slice(0, target);
  while (next.length < target) next.push(null);
  return next;
}

// ── Glass card wrapper ──────────────────────────────────────────────────────
function GlassCard({ children, className = "", onClick, active = false }: { children: React.ReactNode; className?: string; onClick?: () => void; active?: boolean }) {
  return (
    <div
      onClick={onClick}
      className={`relative rounded-lg border backdrop-blur-xl transition-all ${
        active
          ? "border-primary/60 bg-primary/[0.08] shadow-[0_0_24px_-4px_rgba(220,20,60,0.45)]"
          : "border-white/[0.08] bg-white/[0.03] hover:border-white/[0.18] hover:bg-white/[0.06]"
      } ${onClick ? "cursor-pointer" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

export default function StudioPage() {
  const [layout, setLayout] = useState<Layout>("single");
  const [slots, setSlots] = useState<Slot[]>([null]);
  const [libraryTab, setLibraryTab] = useState<LibraryTab>("all");
  const [librarySearch, setLibrarySearch] = useState("");
  const [sourcesCache, setSourcesCache] = useState<Partial<Record<AtomType, { id: number; label: string; createdAt?: string }[]>>>({});
  const [style, setStyle] = useState<Style>("minimal-serif");
  const [tone, setTone] = useState<Tone>(null);
  const [kitId, setKitId] = useState<string | null>(null);
  const [assets, setAssets] = useState<StudioAsset[]>([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Live elapsed timer while a compose is in flight — carousels with the
  // richer styles can take ~30–60s on a cold run; an explicit counter beats
  // a silent spinner and prevents "is it stuck?" double-triggers.
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!generating) { setElapsed(0); return; }
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [generating]);

  const [activeSize, setActiveSize] = useState<string>("ig_square");
  const [activeSlide, setActiveSlide] = useState<number>(0);
  // One neutral caption set, three variants (Studio 2026-05-31 — no per-platform tabs).
  const [variantIdx, setVariantIdx] = useState(0);
  const [editedCaption, setEditedCaption] = useState("");
  const [copyToast, setCopyToast] = useState<string | null>(null);
  const [zipBusy, setZipBusy] = useState(false);
  const [regenBusy, setRegenBusy] = useState(false);

  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const slotCount = SLOT_COUNT[layout];
  const isRecap = layout === "recap-weekly";

  // Re-pad the slots array whenever the chosen layout changes its slot count.
  useEffect(() => {
    setSlots((prev) => repadSlots(prev, SLOT_COUNT[layout]));
  }, [layout]);

  const filledSlots = useMemo(() => slots.filter((s): s is NonNullable<Slot> => s !== null), [slots]);

  // Lazily fetch + cache sources for an atom type.
  const ensureSources = (atom: AtomType) => {
    if (sourcesCache[atom]) return;
    api
      .studioListSources(ATOM_TO_POSTTYPE[atom])
      .then((r: { sources: { id: number; label: string; createdAt?: string }[] }) =>
        setSourcesCache((prev) => ({ ...prev, [atom]: r.sources ?? [] })),
      )
      .catch(() => setSourcesCache((prev) => ({ ...prev, [atom]: [] })));
  };

  // Fetch the source lists the active library tab needs.
  useEffect(() => {
    if (isRecap) return;
    if (libraryTab === "all") {
      (["debate", "prediction", "voice", "pulse"] as AtomType[]).forEach(ensureSources);
    } else if (libraryTab === "about") {
      ensureSources("about-pillar");
      ensureSources("about-belief");
    } else {
      ensureSources(libraryTab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [libraryTab, isRecap]);

  type LibRow = { atomType: AtomType; atomId: number; label: string; createdAt?: string };

  const libraryRows = useMemo<LibRow[]>(() => {
    const fromCache = (atom: AtomType): LibRow[] =>
      (sourcesCache[atom] ?? []).map((s) => ({ atomType: atom, atomId: s.id, label: s.label, createdAt: s.createdAt }));

    let rows: LibRow[];
    if (libraryTab === "all") {
      // Keep backend order (recency) — do NOT sort.
      rows = [
        ...fromCache("debate"),
        ...fromCache("prediction"),
        ...fromCache("voice"),
        ...fromCache("pulse"),
      ];
    } else if (libraryTab === "about") {
      rows = [
        ...fromCache("about-pillar"),
        ...fromCache("about-belief"),
        ...ABOUT_SINGLETONS.map((s) => ({ atomType: s.atomType, atomId: 0, label: s.label })),
      ].sort((a, b) => a.label.localeCompare(b.label));
    } else {
      rows = fromCache(libraryTab).sort((a, b) => a.label.localeCompare(b.label));
    }

    const q = librarySearch.trim().toLowerCase();
    if (q) rows = rows.filter((r) => r.label.toLowerCase().includes(q));
    return rows;
  }, [libraryTab, sourcesCache, librarySearch]);

  // Segregate the picker by day so it's clear which date a post is from.
  // Search filters first (above), then we group the results by created date.
  const groupedLibrary = useMemo(() => {
    const dayKey = (iso?: string) => {
      if (!iso) return "__other__";
      const d = new Date(iso);
      return isNaN(d.getTime()) ? "__other__" : d.toISOString().slice(0, 10);
    };
    const labelFor = (key: string) => {
      if (key === "__other__") return "Other";
      const d = new Date(key + "T00:00:00");
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diff = Math.round((today.getTime() - d.getTime()) / 86400000);
      if (diff === 0) return "Today";
      if (diff === 1) return "Yesterday";
      return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    };
    const map = new Map<string, LibRow[]>();
    for (const r of libraryRows) {
      const k = dayKey(r.createdAt);
      const arr = map.get(k);
      if (arr) arr.push(r);
      else map.set(k, [r]);
    }
    const keys = [...map.keys()].sort((a, b) => {
      if (a === "__other__") return 1;
      if (b === "__other__") return -1;
      return a < b ? 1 : a > b ? -1 : 0; // newest day first
    });
    return keys.map((k) => ({ key: k, label: labelFor(k), rows: map.get(k)! }));
  }, [libraryRows]);

  const slotIndexOf = (atomType: AtomType, atomId: number): number =>
    slots.findIndex((s) => s && s.atomType === atomType && s.atomId === atomId);

  const fillSlot = (row: LibRow) => {
    setSlots((prev) => {
      const next = [...prev];
      const empty = next.findIndex((s) => s === null);
      if (empty !== -1) {
        next[empty] = { atomType: row.atomType, atomId: row.atomId, label: row.label };
      } else {
        const last = next.length - 1;
        next[last] = { atomType: row.atomType, atomId: row.atomId, label: row.label };
        setCopyToast(`Replaced slot ${last + 1}`);
        setTimeout(() => setCopyToast(null), 1200);
      }
      return next;
    });
  };

  const clearSlot = (idx: number) => {
    setSlots((prev) => {
      const next = [...prev];
      next[idx] = null;
      return next;
    });
  };

  const handleSlotDrop = (target: number) => {
    if (dragIndex === null || dragIndex === target) {
      setDragIndex(null);
      return;
    }
    setSlots((prev) => {
      const next = [...prev];
      const tmp = next[dragIndex];
      next[dragIndex] = next[target];
      next[target] = tmp;
      return next;
    });
    setDragIndex(null);
  };

  // Single-slot kits map to a postType+sourceId for the old caption endpoints.
  const singleSlotMap = useMemo(() => {
    if (layout === "single" && filledSlots.length === 1) {
      const s = filledSlots[0];
      return { postType: ATOM_TO_POSTTYPE[s.atomType], sourceId: s.atomId };
    }
    return null;
  }, [layout, filledSlots]);

  const friendlyError = (raw: string | null): { msg: string; href?: string; cta?: string } | null => {
    if (!raw) return null;
    const aboutMap: Record<string, string> = {
      about_founder_empty: "The Founder Statement on the About page is empty.",
      about_pillars_empty: "The About page has no pillars.",
      about_pillar_index_out_of_range: "That pillar doesn't exist on the About page anymore.",
      about_beliefs_empty: "The About page has no beliefs.",
      about_belief_index_out_of_range: "That belief doesn't exist on the About page anymore.",
      about_region_empty: "The About page has no region coverage.",
      about_hero_empty: "The About hero is empty.",
    };
    if (aboutMap[raw]) return { msg: aboutMap[raw], href: "/pages/about", cta: "Open About editor" };
    if (raw === "pulse_topics_empty") return { msg: "No approved Pulse topics yet.", href: "/pulse", cta: "Open Pulse editor" };
    if (raw === "recap_insufficient_data") return { msg: "Need at least one approved debate, prediction, and pulse stat from the last 7 days for the Weekly Recap." };
    if (raw === "invalid_layout") return { msg: "Pick a format." };
    if (raw === "slots_required" || /^layout_.+_needs_\d+_slots$/.test(raw)) return { msg: "Fill all slots." };
    if (raw === "invalid_slot") return { msg: "One of the selected items is invalid." };
    if (raw === "not_found") return { msg: "Selected source no longer exists." };
    return { msg: raw };
  };

  const handleGenerate = async () => {
    setError(null);

    if (!isRecap) {
      const unfilled = slots.some((s) => s === null);
      if (unfilled) {
        setError(`__fill__${slotCount}`);
        return;
      }
    }

    setGenerating(true);
    try {
      const payloadSlots = isRecap
        ? []
        : filledSlots.map((s) => ({ atomType: s.atomType, atomId: s.atomId }));
      const res: ComposeResponse = await api.studioCompose({
        layout,
        slots: payloadSlots,
        style,
        toneHint: tone,
        useAiImage: false,
      });
      trackCms("cms_studio_generated", { layout, style, slots: payloadSlots.length });

      setKitId(res.kitId);

      const kit: { assets: StudioAsset[] } = await api.studioGetKit(res.kitId);
      const kitAssets = kit.assets ?? [];

      // Seed the compose-level variants as the per-slide fallback, then force the
      // caption resync effect to re-run for the first asset of the new kit.
      composeVariantsRef.current = res.captionVariants ?? {};
      captionAssetRef.current = null;

      setAssets(kitAssets);
      // Reset to the first slide of the first size so Single vs Carousel-N is
      // immediately obvious (Single → 1 slide / no nav, Carousel → N + nav).
      setActiveSlide(0);
      if (kitAssets.length) setActiveSize(kitAssets[0].size);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  // Pull the neutral caption set out of a variants blob, falling back to the
  // legacy `x` array for kits composed before the single-caption switch.
  const pickNeutral = (cv?: { neutral?: string[]; x?: string[] } | null): string[] =>
    cv?.neutral?.length ? cv.neutral : cv?.x?.length ? cv.x : [];

  const regenCaption = async () => {
    if (!singleSlotMap) return;
    setRegenBusy(true);
    try {
      const res = await api.studioRegenerateCaptions({
        postType: singleSlotMap.postType,
        sourceId: singleSlotMap.sourceId,
        toneHint: tone,
      });
      const cv = res.captionVariants ?? {};
      const variants = pickNeutral(cv);
      setAssets((prev) => prev.map((a) => ({ ...a, captionVariants: cv })));
      setVariantIdx(0);
      setEditedCaption(variants[0] ?? "");
    } finally {
      setRegenBusy(false);
    }
  };

  const copyText = async (text: string) => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopyToast("Copied!");
    setTimeout(() => setCopyToast(null), 1200);
  };

  const sizeAssets = useMemo(
    () => assets.filter((a) => a.size === activeSize).sort((a, b) => a.slideIndex - b.slideIndex),
    [assets, activeSize],
  );
  const currentAsset = sizeAssets[Math.min(activeSlide, Math.max(0, sizeAssets.length - 1))];
  const slideTotal = sizeAssets.length;
  const isCarousel = slideTotal > 1;
  const activeLayoutMeta = useMemo(() => LAYOUTS.find((l) => l.id === (currentAsset?.layout ?? layout)), [currentAsset, layout]);

  // The asset whose captions are currently loaded into the editor. When the
  // selected slide/size changes (currentAsset.id changes) we resync the caption
  // UI to THAT asset's own variants — the compose-level variants are only a
  // first-slot fallback, so without this every slide shows slide-1's captions.
  const captionAssetRef = useRef<number | null>(null);
  const composeVariantsRef = useRef<{ neutral?: string[]; x?: string[]; ig?: string[]; linkedin?: string[] }>({});

  useEffect(() => {
    if (!currentAsset) {
      captionAssetRef.current = null;
      return;
    }
    if (captionAssetRef.current === currentAsset.id) return;
    captionAssetRef.current = currentAsset.id;

    const fromAsset = pickNeutral(currentAsset.captionVariants);
    const fromCompose = pickNeutral(composeVariantsRef.current);
    const variants = fromAsset.length ? fromAsset : fromCompose;
    setVariantIdx(0);
    setEditedCaption(currentAsset.chosenCaptionX ?? variants[0] ?? "");
  }, [currentAsset]);

  const downloadCurrent = async () => {
    if (!currentAsset) return;
    const slide = currentAsset.slideIndex > 0 ? `-slide-${currentAsset.slideIndex}` : "";
    const filename = `${currentAsset.template}-${currentAsset.size}${slide}.png`;
    await api.studioDownloadAsset(currentAsset.id, filename);
  };

  const canZip = assets.length > 0 && (!!singleSlotMap || isRecap === false);
  const downloadZip = async () => {
    if (assets.length === 0) return;
    setZipBusy(true);
    try {
      // No postType in compose v2 — ZIP by explicit asset ids of the current kit.
      // studioDownloadZip requires a postType param server-side; pass the
      // single-slot mapping when available, else the first slot's mapping.
      const mapPt = singleSlotMap?.postType ?? (filledSlots[0] ? ATOM_TO_POSTTYPE[filledSlots[0].atomType] : "manifesto");
      const mapSrc = singleSlotMap?.sourceId ?? (filledSlots[0]?.atomId ?? 0);
      await api.studioDownloadZip({
        postType: mapPt,
        sourceId: mapSrc,
        assetIds: assets.map((a) => a.id),
        filename: `studio-${kitId ?? "kit"}.zip`,
      });
    } finally {
      setZipBusy(false);
    }
  };

  const errIsFill = error?.startsWith("__fill__");
  const fillCount = errIsFill ? error!.replace("__fill__", "") : "";

  return (
    <div className="relative h-[calc(100vh-3rem)] -m-6 flex flex-col bg-[radial-gradient(ellipse_at_top,_rgba(220,20,60,0.05),_transparent_70%)]">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-5 border-b border-white/[0.06] backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-gradient-to-br from-primary to-primary/40 flex items-center justify-center shadow-[0_0_20px_-4px_rgba(220,20,60,0.6)]">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
              Social Studio<span className="text-primary">.</span>
            </h1>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Compose · preview · download
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={downloadCurrent}
            disabled={!currentAsset}
            className="px-3 py-1.5 text-xs font-bold uppercase tracking-widest rounded border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-40 inline-flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" /> PNG
          </button>
          <button
            type="button"
            onClick={downloadZip}
            disabled={!canZip || zipBusy}
            className="px-3 py-1.5 text-xs font-bold uppercase tracking-widest rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 inline-flex items-center gap-1.5"
          >
            {zipBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Layers className="w-3.5 h-3.5" />} ZIP all
          </button>
        </div>
      </header>

      {/* Body — 3-pane master→detail */}
      <div className="flex-1 grid grid-cols-[150px_1fr_400px] gap-px bg-white/[0.04] overflow-hidden">
        {/* ── LEFT RAIL — FORMAT ─────────────────────── */}
        <aside className="bg-background overflow-y-auto p-3 space-y-2">
          <h2 className="text-[9px] font-bold uppercase tracking-[0.22em] text-muted-foreground px-1 pb-1">Format</h2>
          {LAYOUTS.map((l) => {
            const active = layout === l.id;
            return (
              <GlassCard key={l.id} onClick={() => setLayout(l.id)} active={active} className="px-2.5 py-2.5">
                <div className="flex flex-col items-start gap-1.5">
                  <l.icon className={`w-4 h-4 ${active ? "text-primary" : "text-muted-foreground"}`} />
                  <div>
                    <p className={`text-[11px] font-bold leading-tight ${active ? "text-foreground" : "text-foreground/90"}`}>{l.label}</p>
                    <p className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground mt-0.5">{l.hint}</p>
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </aside>

        {/* ── CENTER — COMPOSE ───────────────────────── */}
        <main className="bg-background overflow-y-auto p-5 space-y-5">
          {isRecap ? (
            <GlassCard className="p-4">
              <div className="flex items-start gap-2.5">
                <CalendarRange className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-foreground">Auto-composed</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">
                    Top debate + prediction + pulse of the last 7 days. No slots to fill — just pick a style and generate.
                  </p>
                </div>
              </div>
            </GlassCard>
          ) : (
            <>
              {/* Slots */}
              <div className="space-y-2">
                <h2 className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground">
                  Slots ({filledSlots.length}/{slotCount} filled)
                </h2>
                <div className="space-y-1.5">
                  {slots.map((slot, i) => {
                    if (slot) {
                      const Icon = ATOM_META[slot.atomType].icon;
                      return (
                        <div
                          key={i}
                          draggable
                          onDragStart={() => setDragIndex(i)}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => handleSlotDrop(i)}
                          className={`group flex items-center gap-2 px-3 py-2.5 rounded-lg border border-primary/40 bg-primary/[0.07] ${dragIndex === i ? "opacity-50" : ""}`}
                        >
                          <GripVertical className="w-3.5 h-3.5 text-muted-foreground cursor-grab shrink-0" />
                          <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-primary/80 w-6 shrink-0">{i + 1}</span>
                          <Icon className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span className="flex-1 min-w-0 text-xs text-foreground truncate">{slot.label}</span>
                          <button
                            type="button"
                            onClick={() => clearSlot(i)}
                            className="text-muted-foreground hover:text-destructive p-0.5 rounded shrink-0"
                            title="Clear slot"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    }
                    return (
                      <div
                        key={i}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => handleSlotDrop(i)}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-dashed border-white/[0.12] bg-white/[0.02]"
                      >
                        <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground w-6 shrink-0">{i + 1}</span>
                        <span className="text-[11px] text-muted-foreground/70">Tap a library row to fill slot {i + 1}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Library */}
              <div className="space-y-2">
                <h2 className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground">Library</h2>
                <div className="flex flex-wrap gap-1">
                  {LIBRARY_TABS.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setLibraryTab(t.id)}
                      className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] rounded border transition-colors ${
                        libraryTab === t.id
                          ? "bg-primary/15 border-primary/50 text-primary"
                          : "bg-white/[0.03] border-white/[0.08] text-muted-foreground hover:text-foreground hover:border-white/20"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                  <input
                    value={librarySearch}
                    onChange={(e) => setLibrarySearch(e.target.value)}
                    placeholder="Search by label…"
                    className="w-full bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] hover:border-white/[0.18] rounded-md pl-8 pr-3 py-2 text-xs focus:outline-none focus:border-primary/60"
                  />
                </div>
                <div className="space-y-1 max-h-72 overflow-y-auto pr-0.5">
                  {libraryRows.length === 0 && (
                    <p className="text-[11px] text-muted-foreground/70 px-3 py-4 text-center">No items in this tab.</p>
                  )}
                  {groupedLibrary.map((group) => (
                    <div key={group.key} className="space-y-1">
                      <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 px-3 pt-3 pb-1 first:pt-1">
                        {group.label}
                      </p>
                      {group.rows.map((row) => {
                        const inSlot = slotIndexOf(row.atomType, row.atomId);
                        const Icon = ATOM_META[row.atomType].icon;
                        return (
                          <button
                            key={`${row.atomType}-${row.atomId}-${row.label}`}
                            type="button"
                            onClick={() => fillSlot(row)}
                            className={`w-full flex items-center gap-2 px-3 py-2 rounded-md border text-left transition-colors ${
                              inSlot !== -1
                                ? "border-primary/40 bg-primary/[0.06]"
                                : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.18] hover:bg-white/[0.05]"
                            }`}
                          >
                            <Icon className={`w-3.5 h-3.5 shrink-0 ${inSlot !== -1 ? "text-primary" : "text-muted-foreground"}`} />
                            <span className="flex-1 min-w-0 text-xs text-foreground/90 truncate">{row.label}</span>
                            {inSlot !== -1 && (
                              <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-primary shrink-0">
                                in slot {inSlot + 1}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Style picker */}
          <div className="space-y-2">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground">Visual style</h2>
            <div className="grid grid-cols-1 gap-1.5">
              {STYLES.map((s) => (
                <GlassCard key={s.id} onClick={() => setStyle(s.id)} active={style === s.id} className="px-2.5 py-2">
                  <div className="flex items-center gap-2.5">
                    {StylePreview[s.id]}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold">{s.label}</p>
                      <p className="text-[10px] text-muted-foreground leading-snug">{s.description}</p>
                    </div>
                    {style === s.id && <Check className="w-3 h-3 text-primary shrink-0" />}
                  </div>
                </GlassCard>
              ))}
            </div>
          </div>

          {/* Tone */}
          <div className="space-y-2">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground">Caption tone</h2>
            <div className="grid grid-cols-2 gap-1.5">
              {(["punchy", "analytical", "warm"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTone(tone === t ? null : t)}
                  className={`px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] rounded border ${
                    tone === t
                      ? "bg-primary/15 border-primary/50 text-primary"
                      : "bg-white/[0.03] border-white/[0.08] text-muted-foreground hover:text-foreground hover:border-white/20"
                  }`}
                >
                  {t}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setTone(null)}
                className={`px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] rounded border ${
                  tone === null
                    ? "bg-white/[0.08] border-white/[0.18] text-foreground"
                    : "bg-white/[0.03] border-white/[0.08] text-muted-foreground hover:text-foreground"
                }`}
              >
                Auto
              </button>
            </div>
          </div>

          {/* Generate */}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="w-full px-4 py-3 rounded-md bg-gradient-to-r from-primary to-primary/80 text-white text-xs font-bold uppercase tracking-[0.2em] hover:from-primary/95 disabled:opacity-50 inline-flex items-center justify-center gap-2 shadow-[0_4px_24px_-8px_rgba(220,20,60,0.6)] transition-all hover:shadow-[0_4px_32px_-4px_rgba(220,20,60,0.7)]"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            {generating ? `Generating… ${elapsed}s` : "Generate kit"}
          </button>
          {generating && (
            <p className="text-[10px] text-muted-foreground/70 text-center mt-2 leading-relaxed">
              Rendering {SLOT_COUNT[layout] || 1} square slide{(SLOT_COUNT[layout] || 1) > 1 ? "s" : ""} + captions. Carousels can take ~20–40s; please don't re-click.
            </p>
          )}

          {error && (() => {
            if (errIsFill) {
              return (
                <div className="rounded-md border border-destructive/40 bg-destructive/[0.06] p-3">
                  <p className="text-[11px] text-destructive leading-snug inline-flex items-start gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> Fill all {fillCount} slots
                  </p>
                </div>
              );
            }
            const f = friendlyError(error);
            if (!f) return null;
            return (
              <div className="rounded-md border border-destructive/40 bg-destructive/[0.06] p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-destructive mt-0.5 shrink-0" />
                  <p className="text-[11px] text-destructive leading-snug">{f.msg}</p>
                </div>
                {f.href && f.cta && (
                  <Link href={f.href} className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary hover:underline inline-flex items-center gap-1">
                    {f.cta} <ChevronRight className="w-3 h-3" />
                  </Link>
                )}
              </div>
            );
          })()}
        </main>

        {/* ── RIGHT — PREVIEW + CAPTIONS ──────────────── */}
        <aside className="bg-background overflow-y-auto flex flex-col">
          {/* PREVIEW */}
          <div className="border-b border-white/[0.06]">
            <div className="flex items-center gap-1.5 px-4 pt-4 pb-2">
              <Square className="w-3 h-3 text-muted-foreground" />
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                1:1 Square · 1080×1080
              </span>
            </div>
            <div className="px-4 pb-4 flex items-center justify-center min-h-[260px] relative">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(220,20,60,0.06),_transparent_60%)] pointer-events-none" />
              {currentAsset ? (
                <div
                  className="relative max-h-[44vh] transition-transform duration-300"
                  style={{ aspectRatio: SIZE_ASPECT[currentAsset.size] ?? "1/1", maxHeight: "44vh" }}
                >
                  <img
                    src={currentAsset.publicUrl}
                    alt={currentAsset.size}
                    className="max-w-full max-h-[44vh] rounded shadow-[0_24px_64px_-16px_rgba(0,0,0,0.6)] border border-white/[0.06]"
                    style={{ aspectRatio: SIZE_ASPECT[currentAsset.size] ?? "1/1" }}
                  />
                </div>
              ) : (
                <div className="text-center">
                  <div className="w-14 h-14 mx-auto rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-3">
                    <ImageIcon className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-foreground/80 max-w-[14rem] mx-auto leading-relaxed">
                    Choose a format, fill slots, then{" "}
                    <span className="font-bold text-primary">Generate kit</span> to preview.
                  </p>
                </div>
              )}
            </div>
            {currentAsset && (
              <div className="flex items-center justify-center gap-2 pb-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
                  {activeLayoutMeta?.label ?? currentAsset.layout ?? "Kit"}
                </span>
                <span className="text-[10px] text-muted-foreground/40">·</span>
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  Slide {Math.min(activeSlide, slideTotal - 1) + 1} of {slideTotal}
                </span>
              </div>
            )}
            {isCarousel && (
              <div className="flex items-center justify-center gap-2 pb-3">
                <button
                  type="button"
                  onClick={() => setActiveSlide((i) => Math.max(0, i - 1))}
                  disabled={activeSlide === 0}
                  className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-white/5 disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {sizeAssets.map((a, i) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setActiveSlide(i)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      activeSlide === i ? "bg-primary" : "bg-white/20 hover:bg-white/40"
                    }`}
                    title={`Slide ${i + 1}`}
                  />
                ))}
                <button
                  type="button"
                  onClick={() => setActiveSlide((i) => Math.min(slideTotal - 1, i + 1))}
                  disabled={activeSlide >= slideTotal - 1}
                  className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-white/5 disabled:opacity-30"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* CAPTION */}
          {(() => {
            const variants =
              (pickNeutral(currentAsset?.captionVariants).length
                ? pickNeutral(currentAsset?.captionVariants)
                : pickNeutral(composeVariantsRef.current)) ?? [];
            const padded = [0, 1, 2].map((i) => variants[i] ?? "");
            const canRegen = !!singleSlotMap;
            return (
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground mb-1">Caption</h2>
                    <p className="text-[10px] text-muted-foreground/80 leading-relaxed">
                      Three Claude variants. Pick one, edit inline, copy.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={regenCaption}
                    disabled={regenBusy || !canRegen}
                    title={canRegen ? "Regenerate the three variants" : "Regenerate is available for single posts"}
                    className="text-muted-foreground hover:text-foreground p-1.5 rounded hover:bg-white/5 disabled:opacity-30 transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${regenBusy ? "animate-spin" : ""}`} />
                  </button>
                </div>

                <GlassCard className="p-3 space-y-2.5">
                  <div className="grid grid-cols-3 gap-1">
                    {padded.map((v, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setVariantIdx(i);
                          setEditedCaption(v);
                        }}
                        disabled={!v}
                        className={`px-2 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] rounded border transition-colors ${
                          variantIdx === i && v
                            ? "bg-primary/20 border-primary/60 text-primary"
                            : "bg-white/[0.03] border-white/[0.08] text-muted-foreground hover:text-foreground hover:border-white/20 disabled:opacity-30"
                        }`}
                      >
                        V{i + 1}
                      </button>
                    ))}
                  </div>

                  <textarea
                    value={editedCaption}
                    onChange={(e) => setEditedCaption(e.target.value)}
                    rows={7}
                    placeholder={!currentAsset ? "Generate to see captions" : "Click a variant above"}
                    className="w-full bg-black/30 border border-white/[0.08] rounded px-2.5 py-2 text-xs leading-relaxed font-mono text-foreground/90 focus:outline-none focus:border-white/20 resize-y"
                  />
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
                      {editedCaption.length} chars
                    </span>
                    <div className="flex-1" />
                    <button
                      type="button"
                      onClick={() => copyText(editedCaption)}
                      disabled={!editedCaption.trim()}
                      className="px-2 py-1 text-[10px] font-bold uppercase tracking-[0.15em] rounded bg-foreground text-background hover:bg-foreground/90 disabled:opacity-30 inline-flex items-center gap-1"
                    >
                      <Copy className="w-2.5 h-2.5" /> Copy
                    </button>
                  </div>
                </GlassCard>
              </div>
            );
          })()}
        </aside>
      </div>

      {/* Toast */}
      {copyToast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2 rounded bg-foreground text-background text-xs font-bold uppercase tracking-widest shadow-2xl inline-flex items-center gap-1.5 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <Check className="w-3.5 h-3.5" />
          {copyToast}
        </div>
      )}
    </div>
  );
}
