import { useEffect, useState } from "react";
import { Eye, EyeOff, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ContentPicker } from "@/components/ContentPicker";
import { api } from "@/lib/api";

interface LeadDebateScheduleSlot {
  id: string;
  debateId: number | null;
  startsAt: string;
  endsAt: string;
  enabled: boolean;
}

interface HomepageSection {
  id: string;
  type: string;
  title: string;
  enabled: boolean;
  order: number;
  config: Record<string, unknown>;
}

interface HomepageContent {
  hero?: {
    eyebrow?: string;
    headline?: string;
    [key: string]: unknown;
  };
  voices?: {
    heading?: string;
    subcopy?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface HomepageData {
  sections?: HomepageSection[];
  sectionVisibility?: Record<string, boolean>;
  content?: HomepageContent;
  [key: string]: unknown;
}

type HomepageTab = "content" | "visibility" | "lead";

const CONTENT_DEFAULTS = {
  hero: {
    eyebrow: "The Region, On Record",
    headline: "The questions people avoid in public",
  },
  voices: {
    heading: "The Voices",
    subcopy: "Curated profiles of people with a clear connection to the region and a body of work we can verify.",
  },
};

const HOMEPAGE_VISIBILITY_SECTIONS: Array<{
  key: string;
  label: string;
  hint: string;
}> = [
  { key: "hero", label: "Hero", hint: "The headline at the top of the homepage." },
  { key: "lead_debate", label: "Lead Debate + Ballot Queue", hint: "Also controls the participation links above the ticker." },
  { key: "ticker", label: "Live Editorial Ticker", hint: "The live debates, predictions and Pulse strip." },
  { key: "predictions", label: "Featured Predictions", hint: "The featured prediction and latest predictions." },
  { key: "pulse", label: "The Pulse", hint: "The homepage Pulse section. The global Pulse feature is managed in Site Settings." },
  { key: "voices", label: "The Voices", hint: "The homepage Voices section. The global Voices feature is managed in Site Settings." },
  { key: "about", label: "Our Ethos", hint: "The editorial statement near the bottom of the homepage." },
  { key: "live_activity", label: "Live Activity", hint: "The live activity feed near the bottom of the homepage." },
];

function localDateInputValue(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default function HomepagePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<HomepageTab>("content");
  const [data, setData] = useState<HomepageData | null>(null);

  useEffect(() => {
    api.getHomepage()
      .then((homepage) => setData(homepage as HomepageData))
      .catch((error: unknown) => {
        toast.error(error instanceof Error ? error.message : "Could not load homepage settings");
      })
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    if (!data) return;
    setSaving(true);
    try {
      await api.updateHomepage(data as Record<string, unknown>);
      toast.success("Homepage saved");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const isSectionVisible = (key: string) => data?.sectionVisibility?.[key] !== false;

  const setSectionVisible = (key: string, visible: boolean) => {
    if (!data) return;
    setData({
      ...data,
      sectionVisibility: {
        ...(data.sectionVisibility ?? {}),
        [key]: visible,
      },
    });
  };

  const updateContentGroup = (group: "hero" | "voices", patch: Record<string, string>) => {
    if (!data) return;
    setData({
      ...data,
      content: {
        ...(data.content ?? {}),
        [group]: {
          ...(data.content?.[group] ?? {}),
          ...patch,
        },
      },
    });
  };

  const leadSection = data?.sections?.find((section) => section.type === "lead_debate");

  const updateLeadConfig = (key: string, value: unknown) => {
    if (!data || !leadSection) return;
    setData({
      ...data,
      sections: data.sections?.map((section) =>
        section.id === leadSection.id
          ? { ...section, config: { ...section.config, [key]: value } }
          : section,
      ),
    });
  };

  const getSchedule = (): LeadDebateScheduleSlot[] => {
    const schedule = leadSection?.config.leadDebateSchedule;
    if (!Array.isArray(schedule)) return [];
    return schedule.map((raw, index) => {
      const slot = raw as Partial<LeadDebateScheduleSlot>;
      return {
        id: typeof slot.id === "string" && slot.id ? slot.id : `lead-${index}`,
        debateId: typeof slot.debateId === "number" ? slot.debateId : null,
        startsAt: typeof slot.startsAt === "string" ? slot.startsAt : "",
        endsAt: typeof slot.endsAt === "string" ? slot.endsAt : "",
        enabled: slot.enabled !== false,
      };
    });
  };

  const updateSchedule = (schedule: LeadDebateScheduleSlot[]) => {
    updateLeadConfig("leadDebateSchedule", schedule);
  };

  const addScheduleSlot = () => {
    const today = localDateInputValue();
    updateSchedule([
      ...getSchedule(),
      {
        id: `lead-${Date.now()}`,
        debateId: null,
        startsAt: today,
        endsAt: today,
        enabled: true,
      },
    ]);
  };

  const patchScheduleSlot = (slotId: string, patch: Partial<LeadDebateScheduleSlot>) => {
    updateSchedule(getSchedule().map((slot) => (slot.id === slotId ? { ...slot, ...patch } : slot)));
  };

  const removeScheduleSlot = (slotId: string) => {
    updateSchedule(getSchedule().filter((slot) => slot.id !== slotId));
  };

  if (loading) {
    return <div className="py-12 text-center text-muted-foreground">Loading homepage controls…</div>;
  }

  if (!data) {
    return <div className="py-12 text-center text-muted-foreground">Homepage settings could not be loaded.</div>;
  }

  const hero = {
    ...CONTENT_DEFAULTS.hero,
    ...(data.content?.hero ?? {}),
  };
  const voices = {
    ...CONTENT_DEFAULTS.voices,
    ...(data.content?.voices ?? {}),
  };
  const schedule = getSchedule();

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 font-serif text-[11px] font-bold uppercase tracking-[0.22em] text-primary">
            Public website
          </p>
          <h1 className="font-serif text-2xl font-bold uppercase tracking-wide">Homepage Manager</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Every control below maps directly to the current homepage. Global navigation and feature access are managed in Site Settings.
          </p>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50"
        >
          <Save className="h-4 w-4" aria-hidden="true" />
          {saving ? "Saving…" : "Save changes"}
        </button>
      </header>

      <nav className="flex gap-1 overflow-x-auto border-b border-border" aria-label="Homepage settings">
        {([
          ["content", "Content"],
          ["visibility", "Visibility"],
          ["lead", "Lead Debate"],
        ] as Array<[HomepageTab, string]>).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={`whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === key
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      {activeTab === "content" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <ControlGroup title="Hero" description="The two editable text lines at the top of the homepage.">
            <Field label="Eyebrow">
              <TextInput
                value={String(hero.eyebrow ?? "")}
                onChange={(value) => updateContentGroup("hero", { eyebrow: value })}
              />
            </Field>
            <Field label="Headline">
              <TextArea
                value={String(hero.headline ?? "")}
                onChange={(value) => updateContentGroup("hero", { headline: value })}
                rows={3}
              />
            </Field>
          </ControlGroup>

          <ControlGroup
            title="Voices"
            description="Displayed only when both Homepage visibility and the global Voices feature are enabled."
          >
            <Field label="Heading">
              <TextInput
                value={String(voices.heading ?? "")}
                onChange={(value) => updateContentGroup("voices", { heading: value })}
              />
            </Field>
            <Field label="Subcopy">
              <TextArea
                value={String(voices.subcopy ?? "")}
                onChange={(value) => updateContentGroup("voices", { subcopy: value })}
                rows={4}
              />
            </Field>
          </ControlGroup>
        </div>
      )}

      {activeTab === "visibility" && (
        <div className="space-y-3">
          <div className="rounded-md border border-border bg-secondary/20 px-4 py-3 text-sm text-muted-foreground">
            These switches affect homepage sections only. Pulse and Voices also have global feature switches in Site Settings.
          </div>
          {HOMEPAGE_VISIBILITY_SECTIONS.map((section) => {
            const visible = isSectionVisible(section.key);
            return (
              <div
                key={section.key}
                className="flex items-center gap-4 rounded-md border border-border bg-card px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{section.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{section.hint}</p>
                </div>
                <span className={`hidden text-xs font-medium sm:block ${visible ? "text-green-500" : "text-muted-foreground"}`}>
                  {visible ? "Visible" : "Hidden"}
                </span>
                <button
                  type="button"
                  onClick={() => setSectionVisible(section.key, !visible)}
                  className={`rounded-md p-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    visible ? "text-green-500 hover:bg-green-500/10" : "text-muted-foreground hover:bg-accent"
                  }`}
                  aria-label={`${visible ? "Hide" : "Show"} ${section.label}`}
                >
                  {visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === "lead" && (
        <div className="space-y-5">
          {!leadSection ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              The homepage record has no lead-debate configuration.
            </div>
          ) : (
            <>
              <ControlGroup
                title="Fallback lead debate"
                description="Used whenever no active dated schedule slot applies."
              >
                <ContentPicker
                  type="debates"
                  mode="single"
                  label="fallback lead debate"
                  selectedIds={typeof leadSection.config.selectedDebateId === "number" ? [leadSection.config.selectedDebateId] : []}
                  onChange={(ids) => updateLeadConfig("selectedDebateId", ids[0] ?? null)}
                />
              </ControlGroup>

              <section className="rounded-md border border-border bg-card p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-xs font-bold uppercase tracking-wider text-primary">Lead debate schedule</h2>
                    <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                      Active dated slots override the fallback. Use the same start and end date for a daily selection.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addScheduleSlot}
                    className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Add slot
                  </button>
                </div>

                {schedule.length === 0 ? (
                  <p className="mt-4 rounded-md border border-dashed border-border px-3 py-5 text-center text-sm text-muted-foreground">
                    No scheduled lead debates. The fallback is currently used.
                  </p>
                ) : (
                  <div className="mt-4 space-y-4">
                    {schedule.map((slot, index) => (
                      <div key={slot.id} className="space-y-4 rounded-md border border-border bg-background p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Slot {index + 1}</p>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => patchScheduleSlot(slot.id, { enabled: !slot.enabled })}
                              className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors ${
                                slot.enabled ? "text-green-500 hover:bg-green-500/10" : "text-muted-foreground hover:bg-accent"
                              }`}
                            >
                              {slot.enabled ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                              {slot.enabled ? "Active" : "Off"}
                            </button>
                            <button
                              type="button"
                              onClick={() => removeScheduleSlot(slot.id)}
                              className="rounded p-1.5 text-red-400 hover:bg-red-500/10 hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                              aria-label={`Remove schedule slot ${index + 1}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        <ContentPicker
                          type="debates"
                          mode="single"
                          label="scheduled lead debate"
                          selectedIds={slot.debateId ? [slot.debateId] : []}
                          onChange={(ids) => patchScheduleSlot(slot.id, { debateId: ids[0] ?? null })}
                        />

                        <div className="grid gap-3 sm:grid-cols-2">
                          <Field label="Starts">
                            <input
                              type="date"
                              value={slot.startsAt}
                              onChange={(event) => patchScheduleSlot(slot.id, { startsAt: event.target.value })}
                              className={inputClassName}
                            />
                          </Field>
                          <Field label="Ends">
                            <input
                              type="date"
                              value={slot.endsAt}
                              onChange={(event) => patchScheduleSlot(slot.id, { endsAt: event.target.value })}
                              className={inputClassName}
                            />
                          </Field>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      )}
    </div>
  );
}

const inputClassName = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary";

function ControlGroup({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-md border border-border bg-card p-4">
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-primary">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}

function TextInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={inputClassName}
    />
  );
}

function TextArea({
  value,
  onChange,
  rows,
}: {
  value: string;
  onChange: (value: string) => void;
  rows: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      rows={rows}
      className={`${inputClassName} resize-none`}
    />
  );
}
