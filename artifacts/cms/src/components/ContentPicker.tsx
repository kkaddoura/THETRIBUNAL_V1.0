import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { Search, X } from "lucide-react";

interface ContentItem {
  id: number;
  label: string;
  category?: string;
}

interface Props {
  type: "debates" | "predictions" | "voices";
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  mode?: "single" | "multi";
  label?: string;
}

export function ContentPicker({ type, selectedIds, onChange, mode = "single", label }: Props) {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res =
          type === "debates" ? await api.getDebates("approved") :
          type === "predictions" ? await api.getPredictions("approved") :
          await api.getVoices("approved");
        const raw: any[] = res.items ?? res;
        setItems(raw.map((r: any) => ({
          id: r.id,
          label: type === "voices" ? r.name : r.question,
          category: r.category || r.sector,
        })));
      } catch { /* silently fail */ }
    };
    load();
  }, [type]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = items.filter(item => {
    if (!search) return true;
    const q = search.toLowerCase();
    return item.label?.toLowerCase().includes(q) || String(item.id).includes(q);
  });

  const selected = items.filter(i => selectedIds.includes(i.id));
  const typeLabel = label || (type === "debates" ? "debate" : type === "predictions" ? "prediction" : "voice");

  const toggle = (id: number) => {
    if (mode === "single") {
      onChange(selectedIds.includes(id) ? [] : [id]);
      setOpen(false);
      setSearch("");
    } else {
      onChange(selectedIds.includes(id) ? selectedIds.filter(i => i !== id) : [...selectedIds, id]);
    }
  };

  return (
    <div ref={ref} className="relative">
      <label className="block text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
        {mode === "single" ? `Select ${typeLabel}` : `Pin ${typeLabel}s`}
      </label>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selected.map(item => (
            <span key={item.id} className="inline-flex items-center gap-1.5 px-2 py-1 bg-secondary rounded-sm text-xs max-w-full">
              <span className="text-primary font-mono text-[10px] flex-shrink-0">#{item.id}</span>
              <span className="truncate">{item.label}</span>
              <button onClick={() => toggle(item.id)} className="text-muted-foreground hover:text-red-500 flex-shrink-0">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={e => { setSearch(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search by title or ID..."
          className="w-full pl-8 pr-3 py-2 bg-background border border-border rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-48 overflow-auto bg-card border border-border rounded-sm shadow-lg">
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">No results found</p>
          ) : (
            filtered.slice(0, 25).map(item => (
              <button
                key={item.id}
                onClick={() => toggle(item.id)}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-secondary/50 flex items-center gap-2 border-b border-border/30 last:border-0 ${
                  selectedIds.includes(item.id) ? "bg-primary/10" : ""
                }`}
              >
                <span className="text-primary font-mono text-[10px] flex-shrink-0">#{item.id}</span>
                <span className="truncate flex-1">{item.label}</span>
                {item.category && (
                  <span className="text-[10px] text-muted-foreground flex-shrink-0">{item.category}</span>
                )}
                {selectedIds.includes(item.id) && (
                  <span className="text-[10px] text-primary flex-shrink-0">selected</span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
