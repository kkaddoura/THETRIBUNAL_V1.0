import { useState } from "react";
import { Plus, X } from "lucide-react";

interface Props {
  value: string[];
  onChange: (value: string[]) => void;
}

export function PunctuationsEditor({ value, onChange }: Props) {
  const [input, setInput] = useState("");

  const add = () => {
    const char = input.trim();
    if (char) {
      onChange([...value, char]);
      setInput("");
    }
  };

  return (
    <div className="border border-border rounded-sm p-4 space-y-2">
      <div>
        <h3 className="font-serif text-sm font-bold uppercase tracking-wide">Punctuations</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Characters appended to the page title in primary color (e.g., the red period on "The Tribunal<span className="text-primary font-bold">.</span>")
        </p>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex flex-wrap gap-1.5">
          {value.map((char, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-secondary rounded-sm text-sm"
            >
              <span className="text-primary font-bold">{char}</span>
              <button
                onClick={() => onChange(value.filter((_, j) => j !== i))}
                className="text-muted-foreground hover:text-red-500"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        <input
          type="text"
          maxLength={3}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder="."
          className="w-16 px-2 py-1 bg-background border border-border rounded-sm text-sm text-center focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <button
          onClick={add}
          disabled={!input.trim()}
          className="flex items-center gap-1 px-2 py-1 text-xs bg-secondary rounded-sm hover:bg-secondary/80 disabled:opacity-40"
        >
          <Plus className="w-3 h-3" /> Add
        </button>
      </div>
    </div>
  );
}
