import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { api } from "@/lib/api";
import {
  Lightbulb, Search, Sparkles, Shield, CheckCircle, Wand2,
  ChevronRight, X, Plus, RotateCcw, Save, Download,
  AlertTriangle, AlertCircle, CheckCircle2, Clock, Loader2,
  MessageSquare, TrendingUp, Activity, Trash2, History, BookX,
  Settings, SlidersHorizontal, ChevronDown, ChevronsUpDown, Check
} from "lucide-react";

type Mode = "explore" | "focused";
type PillarType = "debates" | "predictions" | "pulse";
type ViewTab = "generate" | "prompts" | "exclusions" | "history" | "rejections";

interface Idea {
  id: number;
  sessionId: number;
  pillarType: string;
  title: string;
  content: Record<string, unknown>;
  riskFlags?: { level: string; flags: { type: string; description: string }[] } | null;
  status: string;
  refinedContent?: Record<string, unknown> | null;
}

interface Session {
  id: number;
  mode: string;
  pillarType?: string | null;
  configSnapshot: Record<string, unknown>;
  status: string;
  researchData?: Record<string, unknown> | null;
  generatedCount: number;
  acceptedCount: number;
  rejectedCount: number;
  createdAt: string;
  completedAt?: string | null;
  ideas?: Idea[];
}

interface ExclusionItem {
  id: number;
  phrase: string;
  createdAt: string;
}

interface RejectionItem {
  id: number;
  ideaId: number;
  sessionId: number;
  ideaTitle: string;
  pillarType: string;
  rejectionTag: string;
  createdAt: string;
}

interface Taxonomy {
  debateCategories: string[];
  predictionCategories: string[];
  tags: string[];
  countries: string[];
}

const PILLAR_ICONS: Record<string, typeof MessageSquare> = {
  debates: MessageSquare,
  predictions: TrendingUp,
  pulse: Activity,
};

const PILLAR_COLORS: Record<string, string> = {
  debates: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  predictions: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  pulse: "bg-green-500/20 text-green-400 border-green-500/30",
};

const RISK_COLORS: Record<string, string> = {
  low: "text-green-400",
  medium: "text-yellow-400",
  high: "text-red-400",
};

const REJECTION_TAGS = ["too generic", "off-brand", "sensitive", "already covered", "low quality", "irrelevant"];

const DEFAULT_GUARDRAILS = [
  "Avoid taking sides on active armed conflicts or wars",
  "Do not make claims about specific government officials' personal lives",
  "Avoid content that could be perceived as sectarian (Sunni vs Shia)",
  "No speculation about royal family internal politics",
  "Avoid content that trivializes human rights issues",
  "Do not generate content promoting or glorifying extremism",
  "Avoid unverified economic claims that could affect markets",
  "Be sensitive to refugee and displacement topics",
  "Avoid generalizations about any ethnic or religious group",
  "Do not generate content about ongoing legal proceedings",
];

const DEFAULT_EXCLUSION_SUGGESTIONS = [
  "Israel-Palestine conflict details",
  "Yemen civil war casualties",
  "Specific terrorism incidents",
  "Royal family scandals",
  "Sectarian violence",
  "Immigration detention",
  "Labor exploitation claims",
  "Nuclear program speculation",
  "Assassination plots",
  "Coup attempts",
  "Drug trafficking routes",
  "Money laundering allegations",
  "Human trafficking details",
  "Religious blasphemy",
  "Diplomatic espionage",
];

const WORKFLOW_STEPS = [
  { key: "research", label: "Research", icon: Search, description: "Gathering trending topics & data" },
  { key: "generate", label: "Generate", icon: Sparkles, description: "Creating content ideas" },
  { key: "review", label: "Safety Review", icon: Shield, description: "Analyzing risk factors" },
  { key: "cherry-pick", label: "Cherry-pick", icon: CheckCircle, description: "Select or reject ideas" },
  { key: "refine", label: "Refine & Publish", icon: Wand2, description: "Polish and create drafts" },
];

const STORAGE_VERSION = 1;
const STORAGE_KEY = "cms_ideation_state";

interface IdeationPersistedState {
  activeTab: ViewTab;
  mode: Mode;
  focusedPillar: PillarType;
  batchSize: number;
  pillarCounts: { debates: number; predictions: number; pulse: number };
  usePillarCounts: boolean;
  selectedCategories: string[];
  selectedTags: string[];
  selectedRegions: string[];
  guardrails: string[];
  currentStep: number;
  session: Session | null;
  ideas: Idea[];
  researchData: Record<string, unknown> | null;
}

function loadPersistedState(): Partial<IdeationPersistedState> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.version !== STORAGE_VERSION) return null;
    return parsed.data as Partial<IdeationPersistedState>;
  } catch {
    return null;
  }
}

export default function IdeationPage() {
  const [activeTab, setActiveTab] = useState<ViewTab>(() => loadPersistedState()?.activeTab ?? "generate");
  const [mode, setMode] = useState<Mode>(() => loadPersistedState()?.mode ?? "explore");
  const [focusedPillar, setFocusedPillar] = useState<PillarType>(() => loadPersistedState()?.focusedPillar ?? "debates");
  const [batchSize, setBatchSize] = useState<number>(() => loadPersistedState()?.batchSize ?? 15);
  const [pillarCounts, setPillarCounts] = useState(() => loadPersistedState()?.pillarCounts ?? { debates: 5, predictions: 5, pulse: 5 });
  const [usePillarCounts, setUsePillarCounts] = useState<boolean>(() => loadPersistedState()?.usePillarCounts ?? false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(() => loadPersistedState()?.selectedCategories ?? []);
  const [selectedTags, setSelectedTags] = useState<string[]>(() => loadPersistedState()?.selectedTags ?? []);
  const [selectedRegions, setSelectedRegions] = useState<string[]>(() => loadPersistedState()?.selectedRegions ?? []);
  const [taxonomy, setTaxonomy] = useState<Taxonomy | null>(null);
  const [guardrails, setGuardrails] = useState<string[]>(() => loadPersistedState()?.guardrails ?? DEFAULT_GUARDRAILS);
  const [showGuardrails, setShowGuardrails] = useState(false);

  const [currentStep, setCurrentStep] = useState<number>(() => loadPersistedState()?.currentStep ?? -1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [session, setSession] = useState<Session | null>(() => loadPersistedState()?.session ?? null);
  const [ideas, setIdeas] = useState<Idea[]>(() => loadPersistedState()?.ideas ?? []);
  const [researchData, setResearchData] = useState<Record<string, unknown> | null>(() => loadPersistedState()?.researchData ?? null);

  const [promptTemplates, setPromptTemplates] = useState<Record<string, { promptText: string; defaultPromptText: string }>>({});
  const [editingPrompt, setEditingPrompt] = useState<string | null>(null);
  const [promptDraft, setPromptDraft] = useState("");

  const [exclusionList, setExclusionList] = useState<ExclusionItem[]>([]);
  const [newExclusion, setNewExclusion] = useState("");

  const [sessions, setSessions] = useState<Session[]>([]);
  const [rejectionLog, setRejectionLog] = useState<RejectionItem[]>([]);
  const [rejectionFilter, setRejectionFilter] = useState("");

  const [rejectingIdeaId, setRejectingIdeaId] = useState<number | null>(null);
  const [refiningIds, setRefiningIds] = useState<Set<number>>(new Set());
  const [publishingIds, setPublishingIds] = useState<Set<number>>(new Set());
  const [publishErrors, setPublishErrors] = useState<Record<number, string>>({});

  useEffect(() => {
    api.getTaxonomy().then(setTaxonomy).catch(console.error);
  }, []);

  useEffect(() => {
    const stateToSave = {
      version: STORAGE_VERSION,
      data: {
        activeTab, mode, focusedPillar, batchSize, pillarCounts,
        usePillarCounts, selectedCategories, selectedTags, selectedRegions,
        guardrails, currentStep, session, ideas, researchData,
      },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
  }, [activeTab, mode, focusedPillar, batchSize, pillarCounts, usePillarCounts,
      selectedCategories, selectedTags, selectedRegions, guardrails,
      currentStep, session, ideas, researchData]);

  useEffect(() => {
    if (activeTab === "prompts") {
      api.getPromptTemplates().then(setPromptTemplates).catch(console.error);
    } else if (activeTab === "exclusions") {
      api.getExclusionList().then((r: { items: ExclusionItem[] }) => setExclusionList(r.items)).catch(console.error);
    } else if (activeTab === "history") {
      api.getIdeationSessions().then((r: { items: Session[] }) => setSessions(r.items)).catch(console.error);
    } else if (activeTab === "rejections") {
      api.getRejectionLog().then((r: { items: RejectionItem[] }) => setRejectionLog(r.items)).catch(console.error);
    }
  }, [activeTab]);

  const startWorkflow = useCallback(async () => {
    setIsProcessing(true);
    setCurrentStep(0);
    setIdeas([]);
    setResearchData(null);

    try {
      const config: Record<string, unknown> = {
        categories: selectedCategories,
        tags: selectedTags,
        regions: selectedRegions,
        batchSize: mode === "explore" && usePillarCounts
          ? pillarCounts.debates + pillarCounts.predictions + pillarCounts.pulse
          : batchSize,
        exclusionList: exclusionList.map(e => e.phrase),
        guardrails,
      };

      if (mode === "explore" && usePillarCounts) {
        config.pillarCounts = pillarCounts;
      }

      const newSession = await api.createIdeationSession({
        mode,
        pillarType: mode === "focused" ? focusedPillar : null,
        config,
      });
      setSession(newSession);

      const researchResult = await api.runResearch(newSession.id);
      setResearchData(researchResult.researchData);
      setCurrentStep(1);

      const genResult = await api.runGeneration(newSession.id);
      setIdeas(genResult.ideas);
      setCurrentStep(2);

      const safetyResult = await api.runSafetyReview(newSession.id);
      setIdeas(safetyResult.ideas);
      setCurrentStep(3);
    } catch (err) {
      console.error("Workflow error:", err);
    } finally {
      setIsProcessing(false);
    }
  }, [mode, focusedPillar, batchSize, pillarCounts, usePillarCounts, selectedCategories, selectedTags, selectedRegions, exclusionList, guardrails]);

  const handleCherryPick = async (ideaId: number, action: string, tag?: string) => {
    try {
      await api.cherryPickIdea(ideaId, action, tag);
      setIdeas(prev => prev.map(i => i.id === ideaId ? { ...i, status: action === "accept" ? "accepted" : "rejected" } : i));
      setRejectingIdeaId(null);
    } catch (err) {
      console.error("Cherry-pick error:", err);
    }
  };

  const handleAcceptAll = async () => {
    const reviewedIdeas = ideas.filter(i => i.status === "reviewed" || i.status === "generated");
    const successIds = new Set<number>();
    for (const idea of reviewedIdeas) {
      try {
        await api.cherryPickIdea(idea.id, "accept");
        successIds.add(idea.id);
      } catch (err) {
        console.error("Accept all error for idea:", idea.id, err);
      }
    }
    setIdeas(prev => prev.map(i =>
      successIds.has(i.id) ? { ...i, status: "accepted" } : i
    ));
  };

  const handleRefine = async (ideaId: number) => {
    setRefiningIds(prev => new Set(prev).add(ideaId));
    try {
      const result = await api.refineIdea(ideaId);
      setIdeas(prev => prev.map(i => i.id === ideaId ? { ...i, status: "refined", refinedContent: result.refinedContent } : i));
    } catch (err) {
      console.error("Refine error:", err);
    } finally {
      setRefiningIds(prev => { const s = new Set(prev); s.delete(ideaId); return s; });
    }
  };

  const handlePublishDraft = async (ideaId: number) => {
    setPublishingIds(prev => new Set(prev).add(ideaId));
    setPublishErrors(prev => { const next = { ...prev }; delete next[ideaId]; return next; });
    try {
      await api.publishDraft(ideaId);
      setIdeas(prev => prev.map(i => i.id === ideaId ? { ...i, status: "published" } : i));
    } catch (err) {
      console.error("Publish error:", err);
      setPublishErrors(prev => ({ ...prev, [ideaId]: "Failed to publish draft. Please try again." }));
    } finally {
      setPublishingIds(prev => { const s = new Set(prev); s.delete(ideaId); return s; });
    }
  };

  const handleRefineAll = async () => {
    const accepted = ideas.filter(i => i.status === "accepted");
    setCurrentStep(4);
    for (const idea of accepted) {
      await handleRefine(idea.id);
    }
  };

  const completeCurrentSession = useCallback(async () => {
    if (session) {
      try {
        await api.completeSession(session.id);
        setSession(prev => prev ? { ...prev, status: "completed" } : null);
        localStorage.removeItem(STORAGE_KEY);
      } catch (err) {
        console.error("Complete session error:", err);
      }
    }
  }, [session]);

  const handleSavePrompt = async (pillar: string) => {
    try {
      await api.updatePromptTemplate(pillar, promptDraft);
      setPromptTemplates(prev => ({
        ...prev,
        [pillar]: { ...prev[pillar], promptText: promptDraft },
      }));
      setEditingPrompt(null);
    } catch (err) {
      console.error("Save prompt error:", err);
    }
  };

  const handleAddExclusion = async () => {
    if (!newExclusion.trim()) return;
    try {
      const item = await api.addExclusion(newExclusion.trim());
      setExclusionList(prev => [item, ...prev]);
      setNewExclusion("");
    } catch (err) {
      console.error("Add exclusion error:", err);
    }
  };

  const handleDeleteExclusion = async (id: number) => {
    try {
      await api.deleteExclusion(id);
      setExclusionList(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      console.error("Delete exclusion error:", err);
    }
  };

  const handleBulkAddExclusions = async (phrases: string[]) => {
    try {
      const result = await api.bulkAddExclusions(phrases);
      if (result.inserted && result.inserted.length > 0) {
        setExclusionList(prev => [...result.inserted, ...prev]);
      }
    } catch (err) {
      console.error("Bulk add error:", err);
    }
  };

  const categories = (() => {
    if (!taxonomy) return [];
    if (mode === "focused") {
      if (focusedPillar === "debates") return (taxonomy.debateCategories || []).sort();
      if (focusedPillar === "predictions") return (taxonomy.predictionCategories || []).sort();
      return []; // pulse doesn't use categories
    }
    // Explore mode: merge both but normalize similar names (case-insensitive dedup)
    const seen = new Map<string, string>();
    for (const cat of [...(taxonomy.debateCategories || []), ...(taxonomy.predictionCategories || [])]) {
      const key = cat.toLowerCase().replace(/[&\s]+/g, " ").trim();
      if (!seen.has(key)) seen.set(key, cat);
    }
    return [...seen.values()].sort();
  })();

  const tabs: { key: ViewTab; label: string; icon: typeof Lightbulb }[] = [
    { key: "generate", label: "Generate", icon: Sparkles },
    { key: "prompts", label: "Prompts", icon: Settings },
    { key: "exclusions", label: "Exclusions", icon: Shield },
    { key: "history", label: "History", icon: History },
    { key: "rejections", label: "Learning Log", icon: BookX },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            <Lightbulb className="inline w-6 h-6 mr-2 text-primary" />
            Ideation Engine
          </h1>
          <p className="text-sm text-muted-foreground mt-1">AI-powered content generation for Debates, Predictions & Pulse</p>
        </div>
      </div>

      <div className="flex gap-1 border-b border-border">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm transition-colors border-b-2 -mb-px ${
              activeTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "generate" && (
        <div className="space-y-6">
          <div className="grid grid-cols-[1fr_2fr] gap-6">
            <ConfigPanel
              mode={mode}
              setMode={setMode}
              focusedPillar={focusedPillar}
              setFocusedPillar={setFocusedPillar}
              batchSize={batchSize}
              setBatchSize={setBatchSize}
              pillarCounts={pillarCounts}
              setPillarCounts={setPillarCounts}
              usePillarCounts={usePillarCounts}
              setUsePillarCounts={setUsePillarCounts}
              categories={categories}
              selectedCategories={selectedCategories}
              setSelectedCategories={setSelectedCategories}
              tags={taxonomy?.tags || []}
              selectedTags={selectedTags}
              setSelectedTags={setSelectedTags}
              regions={taxonomy?.countries || []}
              selectedRegions={selectedRegions}
              setSelectedRegions={setSelectedRegions}
              guardrails={guardrails}
              setGuardrails={setGuardrails}
              showGuardrails={showGuardrails}
              setShowGuardrails={setShowGuardrails}
              onStart={startWorkflow}
              isProcessing={isProcessing}
            />

            <div className="space-y-4">
              <WorkflowStepper currentStep={currentStep} isProcessing={isProcessing} />

              {currentStep === 0 && isProcessing && (
                <div className="bg-card border border-border p-6 text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-3" />
                  <p className="text-sm text-muted-foreground">Researching trending topics and data...</p>
                </div>
              )}

              {researchData && currentStep >= 1 && (
                <ResearchPanel data={researchData} />
              )}

              {currentStep >= 1 && ideas.length > 0 && (
                <IdeaCards
                  ideas={ideas}
                  currentStep={currentStep}
                  rejectingIdeaId={rejectingIdeaId}
                  setRejectingIdeaId={setRejectingIdeaId}
                  onCherryPick={handleCherryPick}
                  onAcceptAll={handleAcceptAll}
                  onRefine={handleRefine}
                  onRefineAll={handleRefineAll}
                  onPublishDraft={handlePublishDraft}
                  refiningIds={refiningIds}
                  publishingIds={publishingIds}
                  publishErrors={publishErrors}
                  onUpdateRefined={(id, content) => {
                    setIdeas(prev => prev.map(i => i.id === id ? { ...i, refinedContent: content } : i));
                    api.updateRefinedIdea(id, content).catch(console.error);
                  }}
                  onComplete={completeCurrentSession}
                  sessionCompleted={session?.status === "completed"}
                />
              )}

              {currentStep === -1 && (
                <div className="bg-card border border-border p-12 text-center">
                  <Lightbulb className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground">Configure your settings and start generating ideas</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "prompts" && (
        <PromptEditor
          templates={promptTemplates}
          editingPrompt={editingPrompt}
          promptDraft={promptDraft}
          setEditingPrompt={(pillar) => {
            setEditingPrompt(pillar);
            if (pillar) setPromptDraft(promptTemplates[pillar]?.promptText || "");
          }}
          setPromptDraft={setPromptDraft}
          onSave={handleSavePrompt}
          onReset={(pillar) => setPromptDraft(promptTemplates[pillar]?.defaultPromptText || "")}
        />
      )}

      {activeTab === "exclusions" && (
        <ExclusionManager
          items={exclusionList}
          newPhrase={newExclusion}
          setNewPhrase={setNewExclusion}
          onAdd={handleAddExclusion}
          onDelete={handleDeleteExclusion}
          onBulkAdd={handleBulkAddExclusions}
        />
      )}

      {activeTab === "history" && (
        <SessionHistory sessions={sessions} />
      )}

      {activeTab === "rejections" && (
        <RejectionLogView
          items={rejectionLog}
          filter={rejectionFilter}
          setFilter={setRejectionFilter}
          onExport={() => api.exportRejectionLog()}
        />
      )}
    </div>
  );
}

function MultiSelectDropdown({ label, items, selected, setSelected, placeholder }: {
  label: string;
  items: string[];
  selected: string[];
  setSelected: (s: string[]) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = useMemo(() =>
    items.filter(item => item.toLowerCase().includes(search.toLowerCase())),
    [items, search]
  );

  const toggleItem = (item: string) => {
    setSelected(selected.includes(item) ? selected.filter(s => s !== item) : [...selected, item]);
  };

  return (
    <div ref={ref} className="relative">
      <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1.5" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
        {label} {selected.length > 0 && <span className="text-primary">({selected.length})</span>}
      </label>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between bg-secondary border border-border px-2.5 py-1.5 text-sm text-left hover:border-foreground/30 transition-colors"
      >
        <span className="truncate text-muted-foreground">
          {selected.length === 0
            ? (placeholder || `Select ${label.toLowerCase()}...`)
            : selected.length <= 2
              ? selected.join(", ")
              : `${selected.length} selected`}
        </span>
        <ChevronsUpDown className="w-3.5 h-3.5 text-muted-foreground shrink-0 ml-1" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-card border border-border shadow-xl max-h-56 flex flex-col">
          <div className="p-1.5 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full bg-secondary border border-border pl-7 pr-2 py-1 text-xs"
                autoFocus
              />
            </div>
          </div>
          <div className="flex items-center justify-between px-2 py-1 border-b border-border">
            <button onClick={() => setSelected(filtered)} className="text-[10px] text-primary hover:underline">Select all</button>
            <button onClick={() => setSelected([])} className="text-[10px] text-muted-foreground hover:text-foreground">Clear</button>
          </div>
          <div className="overflow-y-auto flex-1">
            {filtered.length === 0 ? (
              <p className="p-2 text-xs text-muted-foreground text-center">No matches</p>
            ) : (
              filtered.map(item => (
                <button
                  key={item}
                  onClick={() => toggleItem(item)}
                  className="w-full flex items-center gap-2 px-2.5 py-1 text-xs hover:bg-secondary transition-colors text-left"
                >
                  <div className={`w-3.5 h-3.5 border flex items-center justify-center shrink-0 ${
                    selected.includes(item) ? "bg-primary border-primary" : "border-border"
                  }`}>
                    {selected.includes(item) && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                  </div>
                  <span className="truncate">{item}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {selected.map(item => (
            <span key={item} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-primary/15 text-primary text-[10px] border border-primary/30">
              {item}
              <button onClick={() => toggleItem(item)} className="hover:text-foreground ml-0.5">
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function ConfigPanel({
  mode, setMode, focusedPillar, setFocusedPillar,
  batchSize, setBatchSize,
  pillarCounts, setPillarCounts, usePillarCounts, setUsePillarCounts,
  categories, selectedCategories, setSelectedCategories,
  tags, selectedTags, setSelectedTags,
  regions, selectedRegions, setSelectedRegions,
  guardrails, setGuardrails, showGuardrails, setShowGuardrails,
  onStart, isProcessing,
}: {
  mode: Mode; setMode: (m: Mode) => void;
  focusedPillar: PillarType; setFocusedPillar: (p: PillarType) => void;
  batchSize: number; setBatchSize: (n: number) => void;
  pillarCounts: { debates: number; predictions: number; pulse: number };
  setPillarCounts: (c: { debates: number; predictions: number; pulse: number }) => void;
  usePillarCounts: boolean; setUsePillarCounts: (b: boolean) => void;
  categories: string[]; selectedCategories: string[]; setSelectedCategories: (c: string[]) => void;
  tags: string[]; selectedTags: string[]; setSelectedTags: (t: string[]) => void;
  regions: string[]; selectedRegions: string[]; setSelectedRegions: (r: string[]) => void;
  guardrails: string[]; setGuardrails: (g: string[]) => void;
  showGuardrails: boolean; setShowGuardrails: (b: boolean) => void;
  onStart: () => void; isProcessing: boolean;
}) {
  const [newGuardrail, setNewGuardrail] = useState("");

  const totalPillarCount = pillarCounts.debates + pillarCounts.predictions + pillarCounts.pulse;

  return (
    <div className="bg-card border border-border p-4 space-y-4 h-fit sticky top-6 overflow-y-auto max-h-[calc(100vh-8rem)]">
      <div className="flex items-center gap-2 text-sm font-semibold" style={{ fontFamily: "'Barlow Condensed', sans-serif", textTransform: "uppercase", letterSpacing: "0.1em" }}>
        <SlidersHorizontal className="w-4 h-4 text-primary" />
        Configuration
      </div>

      <div>
        <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1.5" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>Mode</label>
        <div className="flex gap-1">
          <button onClick={() => setMode("explore")} className={`flex-1 px-3 py-1.5 text-xs transition-colors ${mode === "explore" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
            Explore
          </button>
          <button onClick={() => setMode("focused")} className={`flex-1 px-3 py-1.5 text-xs transition-colors ${mode === "focused" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
            Focused
          </button>
        </div>
      </div>

      {mode === "focused" && (
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1.5" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>Pillar</label>
          <div className="flex gap-1">
            {(["debates", "predictions", "pulse"] as PillarType[]).map(p => {
              const Icon = PILLAR_ICONS[p];
              return (
                <button key={p} onClick={() => setFocusedPillar(p)} className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs transition-colors ${focusedPillar === p ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                  <Icon className="w-3 h-3" />
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {mode === "explore" && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs text-muted-foreground uppercase tracking-wider" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              {usePillarCounts ? `Per-Pillar Counts (${totalPillarCount} total)` : `Batch Size: ${batchSize}`}
            </label>
            <button
              onClick={() => setUsePillarCounts(!usePillarCounts)}
              className="text-[10px] text-primary hover:underline"
            >
              {usePillarCounts ? "Use single batch" : "Set per-pillar"}
            </button>
          </div>

          {usePillarCounts ? (
            <div className="space-y-2">
              {(["debates", "predictions", "pulse"] as PillarType[]).map(p => {
                const Icon = PILLAR_ICONS[p];
                return (
                  <div key={p} className="flex items-center gap-2">
                    <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="text-xs capitalize w-20">{p}</span>
                    <input
                      type="range"
                      min={0}
                      max={15}
                      value={pillarCounts[p]}
                      onChange={e => setPillarCounts({ ...pillarCounts, [p]: Number(e.target.value) })}
                      className="flex-1 accent-primary"
                    />
                    <span className="text-xs text-muted-foreground w-5 text-right">{pillarCounts[p]}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <>
              <input type="range" min={5} max={30} value={batchSize} onChange={e => setBatchSize(Number(e.target.value))} className="w-full accent-primary" />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>5</span><span>30</span>
              </div>
            </>
          )}
        </div>
      )}

      {mode === "focused" && (
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1.5" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            Batch Size: {batchSize}
          </label>
          <input type="range" min={5} max={30} value={batchSize} onChange={e => setBatchSize(Number(e.target.value))} className="w-full accent-primary" />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>5</span><span>30</span>
          </div>
        </div>
      )}

      <MultiSelectDropdown label="Categories" items={categories} selected={selectedCategories} setSelected={setSelectedCategories} placeholder="Filter by categories..." />
      <MultiSelectDropdown label="Tags" items={tags} selected={selectedTags} setSelected={setSelectedTags} placeholder="Filter by tags..." />
      <MultiSelectDropdown label="Regions" items={regions} selected={selectedRegions} setSelected={setSelectedRegions} placeholder="Filter by regions..." />

      <div>
        <button
          onClick={() => setShowGuardrails(!showGuardrails)}
          className="w-full flex items-center justify-between text-xs text-muted-foreground uppercase tracking-wider py-1" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
        >
          <span className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-yellow-400" />
            Guardrails ({guardrails.length})
          </span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showGuardrails ? "rotate-180" : ""}`} />
        </button>

        {showGuardrails && (
          <div className="mt-2 space-y-2 border border-border p-2.5 bg-secondary/30">
            <div className="max-h-40 overflow-y-auto space-y-1">
              {guardrails.map((g, i) => (
                <div key={i} className="flex items-start gap-1.5 group">
                  <Shield className="w-3 h-3 text-yellow-400/60 mt-0.5 shrink-0" />
                  <span className="text-[11px] text-muted-foreground flex-1">{g}</span>
                  <button
                    onClick={() => setGuardrails(guardrails.filter((_, idx) => idx !== i))}
                    className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 shrink-0"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-1">
              <input
                type="text"
                value={newGuardrail}
                onChange={e => setNewGuardrail(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && newGuardrail.trim()) {
                    setGuardrails([...guardrails, newGuardrail.trim()]);
                    setNewGuardrail("");
                  }
                }}
                placeholder="Add guardrail..."
                className="flex-1 bg-secondary border border-border px-2 py-1 text-[11px]"
              />
              <button
                onClick={() => {
                  if (newGuardrail.trim()) {
                    setGuardrails([...guardrails, newGuardrail.trim()]);
                    setNewGuardrail("");
                  }
                }}
                className="px-2 py-1 bg-primary/20 text-primary text-[10px] border border-primary/30 hover:bg-primary/30"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
            <button
              onClick={() => setGuardrails(DEFAULT_GUARDRAILS)}
              className="text-[10px] text-primary hover:underline"
            >
              Reset to defaults
            </button>
          </div>
        )}
      </div>

      <button
        onClick={onStart}
        disabled={isProcessing || (mode === "explore" && usePillarCounts && totalPillarCount === 0)}
        className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isProcessing ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
        ) : (
          <><Sparkles className="w-4 h-4" /> Generate Ideas</>
        )}
      </button>
    </div>
  );
}

function WorkflowStepper({ currentStep, isProcessing }: { currentStep: number; isProcessing: boolean }) {
  if (currentStep < 0) return null;

  return (
    <div className="bg-card border border-border p-4">
      <div className="flex items-center gap-1">
        {WORKFLOW_STEPS.map((step, idx) => {
          const isActive = idx === currentStep;
          const isDone = idx < currentStep;
          const Icon = step.icon;

          return (
            <div key={step.key} className="flex items-center flex-1">
              <div className={`flex items-center gap-1.5 px-2 py-1.5 flex-1 ${isActive ? "bg-primary/10 border border-primary/30" : ""}`}>
                <div className={`w-6 h-6 flex items-center justify-center text-xs ${
                  isDone ? "bg-green-500/20 text-green-400" : isActive ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"
                }`}>
                  {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : isActive && isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Icon className="w-3.5 h-3.5" />}
                </div>
                <div className="min-w-0">
                  <p className={`text-[11px] font-semibold truncate ${isDone ? "text-green-400" : isActive ? "text-primary" : "text-muted-foreground"}`}>
                    {step.label}
                  </p>
                </div>
              </div>
              {idx < WORKFLOW_STEPS.length - 1 && (
                <ChevronRight className={`w-3 h-3 shrink-0 ${isDone ? "text-green-400" : "text-muted-foreground/30"}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ResearchPanel({ data }: { data: Record<string, unknown> }) {
  const [collapsed, setCollapsed] = useState(true);
  const topics = (data.topics || []) as { title: string; summary: string; source: string }[];
  const trends = (data.trends || []) as string[];

  return (
    <div className="bg-card border border-border">
      <button onClick={() => setCollapsed(!collapsed)} className="w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-secondary/50 transition-colors">
        <span className="flex items-center gap-2">
          <Search className="w-3.5 h-3.5 text-primary" />
          <span className="font-semibold">Research Results</span>
          <span className="text-muted-foreground text-xs">({topics.length} topics, {trends.length} trends)</span>
        </span>
        <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${collapsed ? "" : "rotate-90"}`} />
      </button>
      {!collapsed && (
        <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>Trending Topics</p>
            <div className="space-y-2">
              {topics.map((t, i) => (
                <div key={i} className="bg-secondary/30 p-2">
                  <p className="text-sm font-medium">{t.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t.summary}</p>
                  <p className="text-[10px] text-primary mt-0.5">{t.source}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>Trends</p>
            <div className="flex flex-wrap gap-1">
              {trends.map((t, i) => (
                <span key={i} className="px-2 py-0.5 bg-primary/10 text-primary text-[11px] border border-primary/20">{t}</span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function IdeaCards({
  ideas, currentStep, rejectingIdeaId, setRejectingIdeaId,
  onCherryPick, onAcceptAll, onRefine, onRefineAll, onPublishDraft, refiningIds, publishingIds, publishErrors, onUpdateRefined, onComplete, sessionCompleted,
}: {
  ideas: Idea[];
  currentStep: number;
  rejectingIdeaId: number | null;
  setRejectingIdeaId: (id: number | null) => void;
  onCherryPick: (id: number, action: string, tag?: string) => void;
  onAcceptAll: () => void;
  onRefine: (id: number) => void;
  onRefineAll: () => void;
  onPublishDraft: (id: number) => void;
  refiningIds: Set<number>;
  publishingIds: Set<number>;
  publishErrors: Record<number, string>;
  onUpdateRefined: (id: number, content: Record<string, unknown>) => void;
  onComplete: () => void;
  sessionCompleted: boolean;
}) {
  const accepted = ideas.filter(i => i.status === "accepted" || i.status === "refined" || i.status === "published");
  const reviewedCount = ideas.filter(i => i.status === "reviewed" || i.status === "generated").length;
  const showRefineAll = currentStep >= 3 && accepted.filter(i => i.status === "accepted").length > 0;
  const showAcceptAll = currentStep >= 3 && reviewedCount > 0;
  const allHandled = currentStep >= 3 && ideas.every(i => ["rejected", "published"].includes(i.status));

  const pillarSummary = useMemo(() => {
    const counts: Record<string, number> = {};
    ideas.forEach(i => { counts[i.pillarType] = (counts[i.pillarType] || 0) + 1; });
    return counts;
  }, [ideas]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <p className="text-sm font-semibold">
            Generated Ideas <span className="text-muted-foreground font-normal">({ideas.length})</span>
          </p>
          <div className="flex gap-1">
            {Object.entries(pillarSummary).map(([p, c]) => {
              const Icon = PILLAR_ICONS[p] || MessageSquare;
              return (
                <span key={p} className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] border ${PILLAR_COLORS[p] || ""}`}>
                  <Icon className="w-2.5 h-2.5" /> {c}
                </span>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {showAcceptAll && (
            <button onClick={onAcceptAll} className="flex items-center gap-1 px-3 py-1 bg-green-500/20 text-green-400 text-xs hover:bg-green-500/30 transition-colors border border-green-500/30">
              <CheckCircle2 className="w-3 h-3" /> Accept All ({reviewedCount})
            </button>
          )}
          {showRefineAll && (
            <button onClick={onRefineAll} className="flex items-center gap-1 px-3 py-1 bg-primary text-primary-foreground text-xs hover:bg-primary/90 transition-colors">
              <Wand2 className="w-3 h-3" /> Refine All Accepted
            </button>
          )}
        </div>
      </div>

      {ideas.map(idea => {
        const Icon = PILLAR_ICONS[idea.pillarType] || MessageSquare;
        const colorClass = PILLAR_COLORS[idea.pillarType] || PILLAR_COLORS.debates;
        const risk = idea.riskFlags as { level: string; flags: { type: string; description: string }[] } | null;
        const isRejecting = rejectingIdeaId === idea.id;

        return (
          <div key={idea.id} className={`bg-card border border-border p-4 ${idea.status === "rejected" ? "opacity-50" : ""} ${idea.status === "published" ? "border-green-500/30" : ""}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] border ${colorClass}`}>
                    <Icon className="w-2.5 h-2.5" />
                    {idea.pillarType}
                  </span>
                  {risk && (
                    <span className={`text-[10px] ${RISK_COLORS[risk.level] || "text-muted-foreground"}`}>
                      {risk.level === "low" ? <CheckCircle2 className="w-3 h-3 inline" /> : risk.level === "medium" ? <AlertTriangle className="w-3 h-3 inline" /> : <AlertCircle className="w-3 h-3 inline" />}
                      {" "}{risk.level} risk
                    </span>
                  )}
                  {idea.status === "published" && (
                    <span className="text-[10px] text-green-400 flex items-center gap-0.5"><CheckCircle2 className="w-3 h-3" /> Draft Created</span>
                  )}
                  {idea.status === "accepted" && (
                    <span className="text-[10px] text-blue-400 flex items-center gap-0.5"><Check className="w-3 h-3" /> Accepted</span>
                  )}
                </div>
                <p className="text-sm font-medium">{idea.title}</p>

                {risk && risk.flags.length > 0 && currentStep >= 2 && (
                  <div className="mt-1.5 space-y-0.5">
                    {risk.flags.map((f, i) => (
                      <p key={i} className="text-[11px] text-yellow-400/80 flex items-center gap-1">
                        <AlertTriangle className="w-2.5 h-2.5" /> {f.type.replace(/_/g, " ")}: {f.description}
                      </p>
                    ))}
                  </div>
                )}
              </div>

              {currentStep >= 3 && idea.status !== "rejected" && idea.status !== "published" && (
                <div className="flex items-center gap-1 shrink-0">
                  {idea.status === "reviewed" || idea.status === "generated" ? (
                    <>
                      <button onClick={() => onCherryPick(idea.id, "accept")} className="px-2 py-1 bg-green-500/20 text-green-400 text-xs hover:bg-green-500/30 transition-colors border border-green-500/30">
                        Accept
                      </button>
                      <button onClick={() => setRejectingIdeaId(idea.id)} className="px-2 py-1 bg-red-500/20 text-red-400 text-xs hover:bg-red-500/30 transition-colors border border-red-500/30">
                        Reject
                      </button>
                    </>
                  ) : idea.status === "accepted" ? (
                    <button onClick={() => onRefine(idea.id)} disabled={refiningIds.has(idea.id)} className="px-2 py-1 bg-primary/20 text-primary text-xs hover:bg-primary/30 transition-colors border border-primary/30 disabled:opacity-50">
                      {refiningIds.has(idea.id) ? <Loader2 className="w-3 h-3 animate-spin inline" /> : <Wand2 className="w-3 h-3 inline" />} Refine
                    </button>
                  ) : idea.status === "refined" ? (
                    <button onClick={() => onPublishDraft(idea.id)} disabled={publishingIds.has(idea.id)} className="px-2 py-1 bg-green-500/20 text-green-400 text-xs hover:bg-green-500/30 transition-colors border border-green-500/30 disabled:opacity-50">
                      {publishingIds.has(idea.id) ? <Loader2 className="w-3 h-3 animate-spin inline" /> : <CheckCircle className="w-3 h-3 inline" />} Create Draft
                    </button>
                  ) : null}
                </div>
              )}
            </div>

            {isRejecting && (
              <div className="mt-2 flex items-center gap-1 flex-wrap border-t border-border pt-2">
                <span className="text-[11px] text-muted-foreground mr-1">Tag:</span>
                {REJECTION_TAGS.map(tag => (
                  <button key={tag} onClick={() => onCherryPick(idea.id, "reject", tag)} className="px-2 py-0.5 text-[10px] border border-border text-muted-foreground hover:text-foreground hover:border-primary transition-colors">
                    {tag}
                  </button>
                ))}
                <button onClick={() => setRejectingIdeaId(null)} className="ml-auto text-muted-foreground hover:text-foreground">
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            {publishErrors[idea.id] && (
              <div className="mt-2 px-3 py-2 bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-1.5">
                <AlertCircle className="w-3 h-3 shrink-0" />
                {publishErrors[idea.id]}
              </div>
            )}

            {idea.status === "refined" && idea.refinedContent && (
              <RefinedContentEditor
                pillarType={idea.pillarType}
                content={idea.refinedContent}
                onChange={(c) => onUpdateRefined(idea.id, c)}
              />
            )}
          </div>
        );
      })}

      {allHandled && !sessionCompleted && (
        <div className="bg-green-500/10 border border-green-500/30 p-4 text-center">
          <p className="text-sm text-green-400 mb-2">All ideas have been processed.</p>
          <button onClick={onComplete} className="px-4 py-2 bg-green-600 text-white text-sm hover:bg-green-700 transition-colors">
            <CheckCircle2 className="w-4 h-4 inline mr-1" /> Complete Session
          </button>
        </div>
      )}

      {sessionCompleted && (
        <div className="bg-green-500/10 border border-green-500/30 p-4 text-center">
          <p className="text-sm text-green-400"><CheckCircle2 className="w-4 h-4 inline mr-1" /> Session completed</p>
        </div>
      )}
    </div>
  );
}

function RefinedContentEditor({ pillarType, content, onChange }: {
  pillarType: string;
  content: Record<string, unknown>;
  onChange: (content: Record<string, unknown>) => void;
}) {
  const updateField = (key: string, value: unknown) => {
    onChange({ ...content, [key]: value });
  };

  return (
    <div className="mt-3 border-t border-border pt-3 space-y-2">
      <p className="text-[10px] text-primary uppercase tracking-wider font-semibold" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
        Refined Draft
      </p>

      {pillarType === "debates" && (
        <>
          <div>
            <label className="text-[11px] text-muted-foreground block mb-0.5">Question</label>
            <input type="text" value={(content.question as string) || ""} onChange={e => updateField("question", e.target.value)} className="w-full bg-secondary border border-border px-2 py-1 text-sm" />
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground block mb-0.5">Context</label>
            <textarea value={(content.context as string) || ""} onChange={e => updateField("context", e.target.value)} rows={3} className="w-full bg-secondary border border-border px-2 py-1 text-sm resize-none" />
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground block mb-0.5">Options (one per line)</label>
            <textarea value={((content.options as string[]) || []).join("\n")} onChange={e => updateField("options", e.target.value.split("\n").filter(Boolean))} rows={2} className="w-full bg-secondary border border-border px-2 py-1 text-sm resize-none" />
          </div>
        </>
      )}

      {pillarType === "predictions" && (
        <>
          <div>
            <label className="text-[11px] text-muted-foreground block mb-0.5">Question</label>
            <input type="text" value={(content.question as string) || ""} onChange={e => updateField("question", e.target.value)} className="w-full bg-secondary border border-border px-2 py-1 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] text-muted-foreground block mb-0.5">Category</label>
              <input type="text" value={(content.category as string) || ""} onChange={e => updateField("category", e.target.value)} className="w-full bg-secondary border border-border px-2 py-1 text-sm" />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground block mb-0.5">Resolves At</label>
              <input type="date" value={((content.resolvesAt as string) || "").split("T")[0]} onChange={e => updateField("resolvesAt", e.target.value)} className="w-full bg-secondary border border-border px-2 py-1 text-sm" />
            </div>
          </div>
        </>
      )}

      {pillarType === "pulse" && (
        <>
          <div>
            <label className="text-[11px] text-muted-foreground block mb-0.5">Title</label>
            <input type="text" value={(content.title as string) || ""} onChange={e => updateField("title", e.target.value)} className="w-full bg-secondary border border-border px-2 py-1 text-sm" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[11px] text-muted-foreground block mb-0.5">Stat</label>
              <input type="text" value={(content.stat as string) || ""} onChange={e => updateField("stat", e.target.value)} className="w-full bg-secondary border border-border px-2 py-1 text-sm" />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground block mb-0.5">Delta</label>
              <input type="text" value={(content.delta as string) || ""} onChange={e => updateField("delta", e.target.value)} className="w-full bg-secondary border border-border px-2 py-1 text-sm" />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground block mb-0.5">Source</label>
              <input type="text" value={(content.source as string) || ""} onChange={e => updateField("source", e.target.value)} className="w-full bg-secondary border border-border px-2 py-1 text-sm" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function PromptEditor({ templates, editingPrompt, promptDraft, setEditingPrompt, setPromptDraft, onSave, onReset }: {
  templates: Record<string, { promptText: string; defaultPromptText: string }>;
  editingPrompt: string | null;
  promptDraft: string;
  setEditingPrompt: (pillar: string | null) => void;
  setPromptDraft: (text: string) => void;
  onSave: (pillar: string) => void;
  onReset: (pillar: string) => void;
}) {
  const pillars: PillarType[] = ["debates", "predictions", "pulse"];

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Configure the system prompts used for AI generation in each pillar.</p>
      {pillars.map(pillar => {
        const t = templates[pillar];
        const Icon = PILLAR_ICONS[pillar];
        const isEditing = editingPrompt === pillar;

        return (
          <div key={pillar} className="bg-card border border-border p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold capitalize">{pillar}</span>
              </div>
              {!isEditing && (
                <button onClick={() => setEditingPrompt(pillar)} className="text-xs text-primary hover:underline">Edit</button>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-2">
                <textarea value={promptDraft} onChange={e => setPromptDraft(e.target.value)} rows={6} className="w-full bg-secondary border border-border px-3 py-2 text-sm resize-none font-mono" />
                <div className="flex items-center gap-2">
                  <button onClick={() => onSave(pillar)} className="flex items-center gap-1 px-3 py-1 bg-primary text-primary-foreground text-xs hover:bg-primary/90">
                    <Save className="w-3 h-3" /> Save
                  </button>
                  <button onClick={() => onReset(pillar)} className="flex items-center gap-1 px-3 py-1 bg-secondary text-muted-foreground text-xs hover:text-foreground border border-border">
                    <RotateCcw className="w-3 h-3" /> Load Default
                  </button>
                  <button onClick={() => setEditingPrompt(null)} className="px-3 py-1 text-xs text-muted-foreground hover:text-foreground">Cancel</button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground line-clamp-3 font-mono bg-secondary/30 p-2 border border-border">
                {t?.promptText || "Using default prompt"}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ExclusionManager({ items, newPhrase, setNewPhrase, onAdd, onDelete, onBulkAdd }: {
  items: ExclusionItem[];
  newPhrase: string;
  setNewPhrase: (s: string) => void;
  onAdd: () => void;
  onDelete: (id: number) => void;
  onBulkAdd: (phrases: string[]) => void;
}) {
  const [searchFilter, setSearchFilter] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const existingPhrases = new Set(items.map(i => i.phrase.toLowerCase()));
  const availableSuggestions = DEFAULT_EXCLUSION_SUGGESTIONS.filter(s => !existingPhrases.has(s.toLowerCase()));

  const filteredItems = searchFilter
    ? items.filter(i => i.phrase.toLowerCase().includes(searchFilter.toLowerCase()))
    : items;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <p className="text-sm text-muted-foreground flex-1">Manage sensitive topics, banned phrases, and editorial red lines. The AI will avoid generating content about these topics.</p>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={newPhrase}
          onChange={e => setNewPhrase(e.target.value)}
          onKeyDown={e => e.key === "Enter" && onAdd()}
          placeholder="Add a phrase or topic to exclude..."
          className="flex-1 bg-secondary border border-border px-3 py-2 text-sm"
        />
        <button onClick={onAdd} className="flex items-center gap-1 px-4 py-2 bg-primary text-primary-foreground text-sm hover:bg-primary/90">
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowSuggestions(!showSuggestions)}
          className="flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <Lightbulb className="w-3 h-3" />
          {showSuggestions ? "Hide" : "Show"} suggested exclusions ({availableSuggestions.length} available)
        </button>
        {availableSuggestions.length > 0 && (
          <button
            onClick={() => onBulkAdd(availableSuggestions)}
            className="text-xs text-muted-foreground hover:text-foreground border border-border px-2 py-0.5"
          >
            Add all suggestions
          </button>
        )}
      </div>

      {showSuggestions && availableSuggestions.length > 0 && (
        <div className="bg-secondary/30 border border-border p-3">
          <div className="flex flex-wrap gap-1.5">
            {availableSuggestions.map(s => (
              <button
                key={s}
                onClick={() => onBulkAdd([s])}
                className="flex items-center gap-1 px-2 py-1 text-xs border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
              >
                <Plus className="w-3 h-3" /> {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {items.length > 5 && (
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchFilter}
            onChange={e => setSearchFilter(e.target.value)}
            placeholder="Search exclusions..."
            className="w-full bg-secondary border border-border pl-8 pr-3 py-1.5 text-sm"
          />
        </div>
      )}

      <div className="bg-card border border-border divide-y divide-border">
        {filteredItems.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground text-center">
            {items.length === 0
              ? "No exclusions yet. Add phrases above to prevent the AI from generating content about these topics."
              : "No exclusions match your search."}
          </p>
        ) : (
          filteredItems.map(item => (
            <div key={item.id} className="flex items-center justify-between px-4 py-2">
              <span className="text-sm">{item.phrase}</span>
              <button onClick={() => onDelete(item.id)} className="text-muted-foreground hover:text-red-400 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>

      <p className="text-[11px] text-muted-foreground">
        {items.length} exclusion{items.length !== 1 ? "s" : ""} active
      </p>
    </div>
  );
}

function SessionHistory({ sessions }: { sessions: Session[] }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Past ideation sessions and their outcomes.</p>

      {sessions.length === 0 ? (
        <div className="bg-card border border-border p-8 text-center">
          <History className="w-8 h-8 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">No sessions yet. Generate your first batch of ideas to see history here.</p>
        </div>
      ) : (
        <div className="bg-card border border-border divide-y divide-border">
          {sessions.map(s => (
            <div key={s.id} className="px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-sm font-medium">
                      Session #{s.id}
                      <span className="ml-2 text-xs text-muted-foreground">
                        {s.mode === "focused" ? `Focused → ${s.pillarType}` : "Explore (all pillars)"}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <Clock className="w-3 h-3 inline mr-1" />
                      {new Date(s.createdAt).toLocaleDateString()} {new Date(s.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-muted-foreground">{s.generatedCount} generated</span>
                  <span className="text-green-400">{s.acceptedCount} accepted</span>
                  <span className="text-red-400">{s.rejectedCount} rejected</span>
                  <span className={`px-2 py-0.5 border ${
                    s.status === "completed" ? "border-green-500/30 text-green-400" : "border-yellow-500/30 text-yellow-400"
                  }`}>
                    {s.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RejectionLogView({ items, filter, setFilter, onExport }: {
  items: RejectionItem[];
  filter: string;
  setFilter: (s: string) => void;
  onExport: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = items.filter(i => {
    const matchesFilter = !filter || i.rejectionTag === filter || i.pillarType === filter;
    const matchesSearch = !searchQuery || i.ideaTitle.toLowerCase().includes(searchQuery.toLowerCase()) || i.pillarType.toLowerCase().includes(searchQuery.toLowerCase()) || i.rejectionTag.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const tagCounts = items.reduce((acc, i) => {
    acc[i.rejectionTag] = (acc[i.rejectionTag] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Rejected ideas with tags for learning and AI improvement.</p>
        <button onClick={onExport} className="flex items-center gap-1 px-3 py-1.5 bg-secondary text-foreground text-xs border border-border hover:bg-secondary/80">
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
      </div>

      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search rejected ideas..."
            className="w-full bg-secondary border border-border pl-8 pr-3 py-1.5 text-sm"
          />
        </div>
      </div>

      <div className="flex gap-1 flex-wrap">
        <button onClick={() => setFilter("")} className={`px-2 py-0.5 text-[11px] border transition-colors ${!filter ? "bg-primary/20 border-primary/50 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>
          All ({items.length})
        </button>
        {Object.entries(tagCounts).map(([tag, count]) => (
          <button key={tag} onClick={() => setFilter(tag)} className={`px-2 py-0.5 text-[11px] border transition-colors ${filter === tag ? "bg-primary/20 border-primary/50 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>
            {tag} ({count})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-card border border-border p-8 text-center">
          <BookX className="w-8 h-8 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">No rejected ideas yet.</p>
        </div>
      ) : (
        <div className="bg-card border border-border divide-y divide-border">
          {filtered.map(item => (
            <div key={item.id} className="px-4 py-2.5 flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{item.ideaTitle}</p>
                <p className="text-xs text-muted-foreground">Session #{item.sessionId} · {item.pillarType}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="px-2 py-0.5 text-[10px] border border-red-500/30 text-red-400 bg-red-500/10">{item.rejectionTag}</span>
                <span className="text-[10px] text-muted-foreground">{new Date(item.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
