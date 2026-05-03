import { useState } from "react";
import { motion } from "motion/react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

export interface FilterSidebarCategory {
  key: string;
  label: string;
  count?: number;
}

export interface FilterSidebarProps {
  search?: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    label?: string;
  };
  sort?: {
    value: string;
    onChange: (value: string) => void;
    options: ReadonlyArray<{ id: string; label: string }>;
    label?: string;
  };
  categories?: {
    items: FilterSidebarCategory[];
    activeKey: string;
    onSelect: (key: string) => void;
    allKey?: string;
    allLabel?: string;
    allCount?: number;
    limit?: number;
    label?: string;
  };
}

export function FilterSidebar({ search, sort, categories }: FilterSidebarProps) {
  const [showAllCategories, setShowAllCategories] = useState(false);
  const allKey = categories?.allKey ?? "ALL";
  const limit = categories?.limit ?? 5;
  const items = categories?.items ?? [];
  const hasMoreCategories = items.length > limit;
  const visibleCategories = showAllCategories ? items : items.slice(0, limit);

  return (
    <motion.div
      className="lg:w-64 flex-shrink-0 space-y-12 lg:sticky lg:top-20 lg:self-start"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, ease: EASE_OUT_EXPO, delay: 0.15 }}
    >
      {search && (
        <div>
          <h3 className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-4 border-b border-border pb-2">
            {search.label ?? "Search"}
          </h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder={search.placeholder ?? "Search..."}
              value={search.value}
              onChange={(e) => search.onChange(e.target.value)}
              className="w-full bg-secondary border border-border pl-9 pr-8 py-2.5 text-xs font-sans text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
            />
            {search.value && (
              <button
                onClick={() => search.onChange("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {sort && (
        <div>
          <h3 className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-4 border-b border-border pb-2">
            {sort.label ?? "Sort By"}
          </h3>
          <div className="relative flex bg-secondary border border-border p-1">
            <motion.div
              className="absolute top-1 bottom-1 bg-foreground"
              initial={false}
              animate={{
                left: `calc(${sort.options.findIndex(o => o.id === sort.value) * (100 / sort.options.length)}% + 4px)`,
                width: `calc(${100 / sort.options.length}% - 8px)`,
              }}
              transition={{
                type: "tween",
                duration: 0.4,
                ease: [0.22, 1.0, 0.36, 1],
              }}
            />
            {sort.options.map((opt) => (
              <button
                key={opt.id}
                onClick={() => sort.onChange(opt.id)}
                className={cn(
                  "relative z-10 flex-1 px-2 py-2 text-[10px] uppercase tracking-widest font-bold transition-colors duration-300 text-center",
                  sort.value === opt.id
                    ? "text-background"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {categories && (
        <div>
          <h3 className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-4 border-b border-border pb-2">
            {categories.label ?? "Categories"}
          </h3>
          <div className="flex flex-col gap-1">
            <button
              onClick={() => categories.onSelect(allKey)}
              className={cn(
                "text-left px-3 py-2 text-xs uppercase tracking-widest font-bold transition-colors flex justify-between",
                categories.activeKey === allKey
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span>{categories.allLabel ?? "All"}</span>
              {categories.allCount !== undefined && (
                <span className="opacity-60">({categories.allCount})</span>
              )}
            </button>
            {visibleCategories.map((cat) => (
              <button
                key={cat.key}
                onClick={() => categories.onSelect(cat.key)}
                className={cn(
                  "text-left px-3 py-2 text-xs uppercase tracking-widest font-bold transition-colors flex justify-between items-center",
                  categories.activeKey === cat.key
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span>{cat.label}</span>
                {cat.count !== undefined && (
                  <span className="opacity-60">({cat.count})</span>
                )}
              </button>
            ))}
            {hasMoreCategories && (
              <button
                onClick={() => setShowAllCategories(!showAllCategories)}
                className="text-left px-3 py-2 text-xs uppercase tracking-widest font-bold text-primary hover:text-foreground transition-colors"
              >
                {showAllCategories
                  ? "View Less"
                  : `View More (${items.length - limit})`}
              </button>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}
