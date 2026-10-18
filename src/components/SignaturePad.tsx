import { useEffect, useRef } from "react";

export function SignaturePad({ value, onChange }: { value?: string | undefined; onChange: (d?: string) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const r = c.getBoundingClientRect();
    c.width = r.width * 2; c.height = r.height * 2;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.scale(2, 2); ctx.lineWidth = 2.5; ctx.lineCap = "round"; ctx.strokeStyle = "#1b2a4a";
    if (value) { const img = new Image(); img.onload = () => ctx.drawImage(img, 0, 0, r.width, r.height); img.src = value; }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pos = (e: React.PointerEvent): [number, number] => { const r = e.currentTarget.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };

  return (
    <div>
      <canvas
        ref={ref}
        className="h-40 w-full touch-none rounded-xl border-2 border-input bg-card"
        onPointerDown={(e) => { drawing.current = true; const ctx = e.currentTarget.getContext("2d"); if (!ctx) return; const [x, y] = pos(e); ctx.beginPath(); ctx.moveTo(x, y); }}
        onPointerMove={(e) => { if (!drawing.current) return; const ctx = e.currentTarget.getContext("2d"); if (!ctx) return; const [x, y] = pos(e); ctx.lineTo(x, y); ctx.stroke(); }}
        onPointerUp={(e) => { drawing.current = false; onChange(e.currentTarget.toDataURL("image/png")); }}
        onPointerLeave={(e) => { if (drawing.current) { drawing.current = false; onChange(e.currentTarget.toDataURL("image/png")); } }}
      />
      <button type="button" className="mt-2 h-11 rounded-lg border border-border px-4 text-sm font-semibold"
        onClick={() => { const c = ref.current;
    if (!c) return; c.getContext("2d")?.clearRect(0, 0, c.width, c.height); onChange(undefined); }}>
        Limpar assinatura
      </button>
    </div>
  );
}
