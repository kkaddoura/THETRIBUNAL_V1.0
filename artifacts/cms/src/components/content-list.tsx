import type React from "react";
import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import StatusBadge from "./status-badge";
import { useLocation } from "wouter";
import { Plus, Upload, Trash2, Check, X, Flag, Eye, Archive, RotateCcw } from "lucide-react";
import PreviewPanel from "./preview-panel";

// Filter chips deliberately exclude in_review/flagged/archived — those
// statuses still exist on existing rows and remain editable from the detail
// pages, but the list page sticks to the core lifecycle (drafts → live →
// rejected). Use the "All" tab to surface anything in a deprecated status.
const STATUS_TABS = ["all", "draft", "approved", "rejected"];
const STATUS_LABELS: Record<string, string> = {
  all: "All", draft: "Drafts", in_review: "In Review", approved: "Live",
  rejected: "Rejected", flagged: "Flagged", archived: "Archived",
};

interface ContentItem {
  id: number;
  editorialStatus: string;
  createdAt?: string;
  [key: string]: unknown;
}

interface ContentListProps {
  type: "debates" | "predictions" | "voices";
  title: string;
  getItems: (status?: string) => Promise<{ items: ContentItem[] }>;
  getTitle: (item: ContentItem) => string;
  getCategory: (item: ContentItem) => string;
  editPath: (id: number) => string;
}

export default function ContentList({ type, title, getItems, getTitle, getCategory, editPath }: ContentListProps) {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadJson, setUploadJson] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [parsedItems, setParsedItems] = useState<Record<string, unknown>[] | null>(null);
  const [previewItem, setPreviewItem] = useState<ContentItem | null>(null);
  const [, navigate] = useLocation();

  const load = useCallback(() => {
    setLoading(true);
    getItems(status === "all" ? undefined : status)
      .then(res => { setItems(res.items); setSelected(new Set()); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [status, getItems]);

  useEffect(() => { load(); }, [load]);

  const toggleSelect = (id: number) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const toggleAll = () => {
    if (selected.size === items.length) setSelected(new Set());
    else setSelected(new Set(items.map(i => i.id)));
  };

  const bulkAction = async (action: string) => {
    if (selected.size === 0) return;
    const confirmMsg = action === "delete" ? `Delete ${selected.size} items?` : `${action} ${selected.size} items?`;
    if (!confirm(confirmMsg)) return;
    try {
      await api.bulkAction(type, Array.from(selected), action);
      load();
    } catch (e: unknown) { alert(e instanceof Error ? e.message : "Action failed"); }
  };

  const parseJson = () => {
    setUploadError("");
    try {
      const parsed = JSON.parse(uploadJson);
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      if (arr.length === 0) { setUploadError("No items found"); return; }
      setParsedItems(arr);
    } catch (e: unknown) {
      setUploadError(e instanceof Error ? e.message : "Invalid JSON");
    }
  };

  const handleUpload = async () => {
    if (!parsedItems || parsedItems.length === 0) return;
    setUploadError("");
    try {
      await api.bulkUpload(type, parsedItems);
      setShowUpload(false);
      setUploadJson("");
      setParsedItems(null);
      load();
    } catch (e: unknown) {
      setUploadError(e instanceof Error ? e.message : "Upload failed");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { setUploadJson(ev.target?.result as string); };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold uppercase tracking-wide">{title}</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowUpload(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary text-secondary-foreground rounded-md text-sm hover:bg-secondary/80">
            <Upload className="w-3.5 h-3.5" /> Upload JSON
          </button>
          <button onClick={() => navigate(editPath(0).replace("/0/", "/new/"))} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90">
            <Plus className="w-3.5 h-3.5" /> New
          </button>
        </div>
      </div>

      <div className="flex gap-1 border-b border-border">
        {STATUS_TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setStatus(tab)}
            className={`px-3 py-2 text-sm transition-colors border-b-2 -mb-px ${
              status === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {STATUS_LABELS[tab]}
          </button>
        ))}
      </div>

      {selected.size > 0 && (
        <div className="flex items-center gap-2 p-2 bg-secondary/50 rounded-md">
          <span className="text-sm text-muted-foreground">{selected.size} selected</span>
          <button onClick={() => bulkAction("approve")} className="flex items-center gap-1 px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"><Check className="w-3 h-3" /> Approve</button>
          <button onClick={() => bulkAction("reject")} className="flex items-center gap-1 px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"><X className="w-3 h-3" /> Reject</button>
          <button onClick={() => bulkAction("revision")} className="flex items-center gap-1 px-2 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700"><RotateCcw className="w-3 h-3" /> Revision</button>
          <button onClick={() => bulkAction("flag")} className="flex items-center gap-1 px-2 py-1 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700"><Flag className="w-3 h-3" /> Flag</button>
          <button onClick={() => bulkAction("archive")} className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"><Archive className="w-3 h-3" /> Archive</button>
          <button onClick={() => bulkAction("delete")} className="flex items-center gap-1 px-2 py-1 text-xs bg-red-800 text-white rounded hover:bg-red-900"><Trash2 className="w-3 h-3" /> Delete</button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No items found</div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-card">
                <th className="w-10 p-3"><input type="checkbox" checked={selected.size === items.length && items.length > 0} onChange={toggleAll} className="accent-primary" /></th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Title</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Category</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Status</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Date</th>
                <th className="w-20 p-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} className="border-b border-border hover:bg-secondary/30 transition-colors">
                  <td className="p-3"><input type="checkbox" checked={selected.has(item.id)} onChange={() => toggleSelect(item.id)} className="accent-primary" /></td>
                  <td className="p-3">
                    <button onClick={() => navigate(editPath(item.id))} className="text-sm text-left hover:text-primary transition-colors line-clamp-1">
                      {getTitle(item)}
                    </button>
                  </td>
                  <td className="p-3 text-sm text-muted-foreground">{getCategory(item)}</td>
                  <td className="p-3"><StatusBadge status={item.editorialStatus} /></td>
                  <td className="p-3 text-xs text-muted-foreground">{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "-"}</td>
                  <td className="p-3">
                    <button onClick={() => setPreviewItem(item)} className="text-muted-foreground hover:text-primary transition-colors">
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showUpload && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-2xl max-h-[80vh] flex flex-col">
            <h2 className="font-serif text-lg font-bold mb-4">Bulk Upload — {title}</h2>

            {!parsedItems ? (
              <>
                <div className="mb-3">
                  <label className="block text-sm text-muted-foreground mb-1">Upload .json file or paste JSON</label>
                  <input type="file" accept=".json" onChange={handleFileUpload} className="text-sm file:mr-3 file:py-1 file:px-3 file:border-0 file:bg-secondary file:text-foreground file:rounded file:text-sm file:cursor-pointer" />
                </div>
                <textarea
                  value={uploadJson}
                  onChange={e => setUploadJson(e.target.value)}
                  className="flex-1 min-h-[200px] p-3 bg-background border border-border rounded-md text-sm font-mono resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder={getJsonTemplate(type)}
                />
                {uploadError && <p className="text-sm text-red-500 mt-2">{uploadError}</p>}
                <div className="flex justify-end gap-2 mt-4">
                  <button onClick={() => { setShowUpload(false); setUploadJson(""); setUploadError(""); }} className="px-4 py-2 text-sm bg-secondary rounded-md hover:bg-secondary/80">Cancel</button>
                  <button onClick={parseJson} disabled={!uploadJson.trim()} className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50">Preview</button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-3">{parsedItems.length} item{parsedItems.length !== 1 ? "s" : ""} ready to import</p>
                <div className="flex-1 overflow-auto border border-border rounded-md">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-secondary/50">
                        <th className="text-left p-2 text-xs font-medium text-muted-foreground">#</th>
                        <th className="text-left p-2 text-xs font-medium text-muted-foreground">Title</th>
                        <th className="text-left p-2 text-xs font-medium text-muted-foreground">Category</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedItems.map((item, i) => (
                        <tr key={i} className="border-b border-border last:border-0">
                          <td className="p-2 text-muted-foreground">{i + 1}</td>
                          <td className="p-2 truncate max-w-[300px]">{String(item.question || item.name || "Untitled")}</td>
                          <td className="p-2 text-muted-foreground">{String(item.category || item.sector || "-")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {uploadError && <p className="text-sm text-red-500 mt-2">{uploadError}</p>}
                <div className="flex justify-end gap-2 mt-4">
                  <button onClick={() => setParsedItems(null)} className="px-4 py-2 text-sm bg-secondary rounded-md hover:bg-secondary/80">Back</button>
                  <button onClick={() => { setShowUpload(false); setUploadJson(""); setParsedItems(null); setUploadError(""); }} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
                  <button onClick={handleUpload} className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90">Import {parsedItems.length} Items</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {previewItem && (
        <PreviewPanel type={type} item={previewItem} onClose={() => setPreviewItem(null)} />
      )}
    </div>
  );
}

function getJsonTemplate(type: string): string {
  if (type === "debates") return `[\n  {\n    "question": "Will X happen by 2026?",\n    "context": "Background context...",\n    "category": "Economy",\n    "categorySlug": "economy",\n    "tags": ["finance", "mena"],\n    "pollType": "binary",\n    "options": ["Yes", "No"]\n  }\n]`;
  if (type === "predictions") return `[\n  {\n    "question": "Will X happen?",\n    "category": "Business",\n    "categorySlug": "business",\n    "resolvesAt": "2026-12-31",\n    "yesPercentage": 65,\n    "noPercentage": 35,\n    "momentum": 1.5,\n    "momentumDirection": "up",\n    "trendData": [60, 62, 63, 65],\n    "tags": ["startup"]\n  }\n]`;
  return `[\n  {\n    "name": "John Doe",\n    "headline": "Building the future...",\n    "role": "Founder & CEO",\n    "company": "Acme Inc",\n    "sector": "Technology",\n    "country": "UAE",\n    "city": "Dubai",\n    "summary": "Short summary...",\n    "story": "Full story...",\n    "lessonsLearned": ["Lesson 1", "Lesson 2"],\n    "quote": "A great quote"\n  }\n]`;
}
