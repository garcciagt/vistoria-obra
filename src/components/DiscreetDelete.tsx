import { useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { useDismiss } from "@/hooks/use-dismiss";

export function DiscreetDelete({ label, onDelete }: { label: string; onDelete: () => void }) {
  const [armed, setArmed] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  useDismiss(armed, () => setArmed(false), [ref]);
  return <>
    <Button ref={ref} type="button" variant={armed ? "destructive" : "ghost"} size={armed ? "sm" : "icon"}
      className={armed ? "shrink-0" : "h-9 w-9 shrink-0 text-muted-foreground"}
      aria-label={`Excluir ${label}`} title={`Excluir ${label}`}
      onClick={() => { if (armed) { setArmed(false); setOpen(true); } else setArmed(true); }}>
      <Trash2 className="h-3.5 w-3.5" />{armed && "Excluir"}
    </Button>
    <ConfirmDelete open={open} titulo="Confirmar exclusão?" descricao={`Excluir ${label} e os dados associados?`}
      onCancel={() => setOpen(false)} onConfirm={() => { setOpen(false); onDelete(); }} />
  </>;
}