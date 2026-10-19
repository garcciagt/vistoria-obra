import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Props = {
  open: boolean;
  count: number;
  label: string; // "vistorias" ou "formulários"
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmBulkDelete({ open, count, label, busy, onConfirm, onCancel }: Props) {
  const [typed, setTyped] = useState("");
  const matches = typed.trim() === String(count);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setTyped(""); onCancel(); } }}>
      <DialogContent className="max-w-sm gap-5">
        <DialogHeader className="items-center gap-2 text-center sm:text-center">
          <DialogTitle className="text-xl">Excluir {count} {label}?</DialogTitle>
          <DialogDescription className="text-base">
            Esta ação não pode ser desfeita. Para confirmar, digite o número <b className="text-foreground">{count}</b> abaixo.
          </DialogDescription>
        </DialogHeader>
        <Input
          autoFocus
          placeholder={`Digite ${count} para confirmar`}
          value={typed}
          onChange={(e) => setTyped(e.target.value.replace(/\D/g, ""))}
          className="text-center text-lg font-bold"
        />
        <div className="grid grid-cols-2 gap-3">
          <Button size="lg" variant="destructive" onClick={() => { setTyped(""); onConfirm(); }} disabled={busy || !matches}>
            <Trash2 className="h-5 w-5" />{busy ? "Excluindo…" : "Excluir"}
          </Button>
          <Button size="lg" onClick={() => { setTyped(""); onCancel(); }} disabled={busy}>Manter</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
