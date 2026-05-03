import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Save, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
interface FaqQuestion {
  q: string;
  a: string;
}

interface FaqSection {
  category: string;
  questions: FaqQuestion[];
}

interface FaqConfig {
  titleLine1: string;
  titleLine2: string;
  sections: FaqSection[];
  punctuations?: string[];
}

export default function PageFaq() {
  const [config, setConfig] = useState<FaqConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [expandedSection, setExpandedSection] = useState<number | null>(0);

  useEffect(() => {
    api.getPage("faq").then((data: any) => {
      setConfig({
        titleLine1: data?.titleLine1 ?? "Frequently Asked",
        titleLine2: data?.titleLine2 ?? "Questions",
        sections: data?.sections ?? [],
        punctuations: data?.punctuations ?? ["."],
      });
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const save = async () => {
    if (!config) return;
    setSaving(true);
    try {
      await api.updatePage("faq", config as unknown as Record<string, unknown>);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) { alert(e instanceof Error ? e.message : "Save failed"); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="text-center py-12 text-muted-foreground">Loading...</div>;
  if (!config) return <div className="text-center py-12 text-red-500">Failed to load FAQ config</div>;

  const totalQuestions = config.sections.reduce((s, sec) => s + sec.questions.length, 0);

  const updateSection = (i: number, updates: Partial<FaqSection>) => {
    const sections = [...config.sections];
    sections[i] = { ...sections[i], ...updates };
    setConfig({ ...config, sections });
  };

  const addSection = () => {
    setConfig({ ...config, sections: [...config.sections, { category: "New Section", questions: [] }] });
    setExpandedSection(config.sections.length);
  };

  const deleteSection = (i: number) => {
    if (!confirm(`Delete "${config.sections[i].category}" section and all its questions?`)) return;
    setConfig({ ...config, sections: config.sections.filter((_, j) => j !== i) });
  };

  const addQuestion = (sectionIdx: number) => {
    const sections = [...config.sections];
    sections[sectionIdx] = {
      ...sections[sectionIdx],
      questions: [...sections[sectionIdx].questions, { q: "", a: "" }],
    };
    setConfig({ ...config, sections });
  };

  const updateQuestion = (sectionIdx: number, qIdx: number, updates: Partial<FaqQuestion>) => {
    const sections = [...config.sections];
    const questions = [...sections[sectionIdx].questions];
    questions[qIdx] = { ...questions[qIdx], ...updates };
    sections[sectionIdx] = { ...sections[sectionIdx], questions };
    setConfig({ ...config, sections });
  };

  const deleteQuestion = (sectionIdx: number, qIdx: number) => {
    const sections = [...config.sections];
    sections[sectionIdx] = {
      ...sections[sectionIdx],
      questions: sections[sectionIdx].questions.filter((_, j) => j !== qIdx),
    };
    setConfig({ ...config, sections });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold uppercase tracking-wide">FAQ Page<span className="text-primary">.</span></h1>
          <p className="text-xs text-muted-foreground mt-1">{config.sections.length} sections · {totalQuestions} questions</p>
        </div>
        <div className="flex gap-2">
          <button onClick={addSection} className="flex items-center gap-1 px-3 py-2 bg-secondary text-secondary-foreground rounded-sm text-sm hover:bg-secondary/80">
            <Plus className="w-3.5 h-3.5" /> Add Section
          </button>
          <button onClick={save} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-sm text-sm hover:bg-primary/90 disabled:opacity-50">
            <Save className="w-4 h-4" /> {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
          </button>
        </div>
      </div>

      <div className="border border-border rounded-sm p-4 space-y-3">
        <div>
          <label className="block text-xs text-muted-foreground uppercase tracking-wider mb-1">Title Line 1</label>
          <input value={config.titleLine1} onChange={e => setConfig({ ...config, titleLine1: e.target.value })} className="w-full px-3 py-2 bg-background border border-border rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground uppercase tracking-wider mb-1">Title Line 2</label>
          <div className="flex items-center gap-2">
            <input value={config.titleLine2} onChange={e => setConfig({ ...config, titleLine2: e.target.value })} className="flex-1 px-3 py-2 bg-background border border-border rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
            <input value={(config.punctuations ?? ["."]).join("")} onChange={e => setConfig({ ...config, punctuations: e.target.value ? e.target.value.split("") : [] })} placeholder="." className="w-16 px-2 py-2 bg-background border border-border rounded-sm text-sm text-primary font-bold text-center focus:outline-none focus:ring-1 focus:ring-primary" title="Punctuation (renders in primary color)" />
          </div>
        </div>
      </div>

      {config.sections.map((section, si) => (
        <section key={si} className="border border-border rounded-sm bg-card overflow-hidden">
          <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-secondary/30" onClick={() => setExpandedSection(expandedSection === si ? null : si)}>
            <span className="text-xs text-primary font-bold">{String(si + 1).padStart(2, "0")}</span>
            <input
              value={section.category}
              onChange={e => { e.stopPropagation(); updateSection(si, { category: e.target.value }); }}
              onClick={e => e.stopPropagation()}
              className="flex-1 px-2 py-1 bg-transparent border-b border-transparent hover:border-border focus:border-primary text-sm font-medium focus:outline-none"
            />
            <span className="text-xs text-muted-foreground">{section.questions.length} Q&A</span>
            <button onClick={e => { e.stopPropagation(); deleteSection(si); }} className="text-muted-foreground hover:text-red-500">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            {expandedSection === si ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </div>
          {expandedSection === si && (
            <div className="px-4 pb-4 space-y-3 border-t border-border/50 pt-3">
              {section.questions.map((qa, qi) => (
                <div key={qi} className="border border-border/30 rounded-sm p-3 space-y-2 bg-background">
                  <div className="flex items-start gap-2">
                    <span className="text-[0.6rem] text-muted-foreground font-bold mt-2">Q{qi + 1}</span>
                    <div className="flex-1 space-y-2">
                      <input value={qa.q} onChange={e => updateQuestion(si, qi, { q: e.target.value })} placeholder="Question" className="w-full px-2 py-1.5 bg-card border border-border rounded-sm text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary" />
                      <textarea value={qa.a} onChange={e => updateQuestion(si, qi, { a: e.target.value })} rows={3} placeholder="Answer" className="w-full px-2 py-1.5 bg-card border border-border rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none" />
                    </div>
                    <button onClick={() => deleteQuestion(si, qi)} className="text-muted-foreground hover:text-red-500 mt-2">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              <button onClick={() => addQuestion(si)} className="flex items-center gap-1 px-3 py-1.5 text-xs bg-secondary rounded-sm hover:bg-secondary/80 w-full justify-center">
                <Plus className="w-3 h-3" /> Add Question
              </button>
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
