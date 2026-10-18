import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Props = {
  open: boolean;
  titulo: string;
  descricao: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/** Janela de confirmação: "Manter" em azul, "Excluir" em vermelho. */
export function ConfirmDelete({ open, titulo, descricao, busy, onConfirm, onCancel }: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="max-w-sm gap-5">
        <DialogHeader className="items-center gap-2 text-center sm:text-center">
          <DialogTitle className="text-xl">{titulo}</DialogTitle>
          <DialogDescription className="text-base">{descricao}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <Button size="lg" variant="destructive" onClick={onConfirm} disabled={busy}>
            <Trash2 className="h-5 w-5" />{busy ? "Excluindo…" : "Excluir"}
          </Button>
          <Button size="lg" onClick={onCancel} disabled={busy}>Manter</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
