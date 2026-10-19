import { useEffect, useState } from "react";
import { Undo2, Redo2 } from "lucide-react";

export type UndoEntry = {
  label: string;
  undo: () => void | Promise<void>;
};

type Props = {
  entry: UndoEntry | null;
  onExpire: () => void;
};

export function UndoBar({ entry, onExpire }: Props) {
  const [visible, setVisible] = useState(false);
  const [done, setDone] = useState<UndoEntry | null>(null);

  useEffect(() => {
    if (!entry) { setVisible(false); return; }
    setVisible(true);
    setDone(null);
    const t = setTimeout(() => { setVisible(false); setTimeout(onExpire, 300); }, 5000);
    return () => clearTimeout(t);
  }, [entry]);

  if (!entry && !visible) return null;

  const handleUndo = async () => {
    if (!entry) return;
    try { await entry.undo(); } catch {}
    setDone(entry);
    setVisible(false);
    setTimeout(onExpire, 300);
  };

  return (
    <div
      className={`fixed bottom-24 left-1/2 z-50 -translate-x-1/2 transition-all duration-300 ${
        visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0 pointer-events-none"
      }`}
    >
      <div className="flex items-center gap-3 rounded-full border border-border bg-card px-4 py-2 shadow-lg">
        <span className="text-sm text-muted-foreground">{entry?.label}</span>
        <button
          onClick={handleUndo}
          className="flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground hover:bg-primary/90 active:scale-95 transition-transform"
        >
          <Undo2 className="h-3.5 w-3.5" />
          Desfazer
        </button>
      </div>
    </div>
  );
}
