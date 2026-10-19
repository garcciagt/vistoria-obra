import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useDismiss } from "@/hooks/use-dismiss";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { Plus, Building2, Trash2, ChevronRight, LogOut, Home, Building, CheckSquare, Check } from "lucide-react";
import { ConfirmBulkDelete } from "@/components/ConfirmBulkDelete";
import { UndoBar, type UndoEntry } from "@/components/UndoBar";
import { listInspections, saveInspection, deleteInspection, uid, type Inspection } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { totalOf } from "@/lib/checklist";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Vistoria Obra — Checklist de vistoria" },
      { name: "description", content: "Faça a vistoria passo a passo, tire fotos e exporte o checklist em PDF." },
      { property: "og:title", content: "Vistoria Obra" },
      { property: "og:description", content: "Vistoria passo a passo com fotos e PDF." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const [list, setList] = useState<Inspection[] | null>(null);
  const nav = useNavigate();
  const [erro, setErro] = useState(false);
  useEffect(() => { listInspections().then(setList).catch(() => { setErro(true); setList([]); }); }, []);

  const create = async (tipoImovel: "apartamento" | "casa") => {
    const v: Inspection = {
      id: uid(), empreendimento: "", unidade: "", data: new Date().toISOString().slice(0, 10),
      responsavel: localStorage.getItem("vo:resp") || "", crea: localStorage.getItem("vo:crea") || "",
      entries: {}, obsGerais: "", apontamentos: [], tipoImovel, status: "andamento", createdAt: Date.now(), updatedAt: Date.now(),
    };
    await saveInspection(v);
    nav({ to: "/vistoria/$id", params: { id: v.id } });
  };

  const [armed, setArmed] = useState<string | null>(null);
  const armedRef = useRef<HTMLButtonElement>(null);
  useDismiss(!!armed, () => setArmed(null), [armedRef]);
  const [confirmar, setConfirmar] = useState<Inspection | null>(null);
  const [excluindo, setExcluindo] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const toggleSelect = (id: string) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const [undoEntry, setUndoEntry] = useState<UndoEntry | null>(null);
  const pendingDeleteRef = useRef<{ id: string; timer: ReturnType<typeof setTimeout> } | null>(null);
  const bulkDelete = async () => {
    if (!selected.size) return;
    setBulkDeleting(true);
    try {
      for (const id of selected) await deleteInspection(id);
      setList(await listInspections());
      setSelected(new Set());
      setSelectMode(false);
    } finally { setBulkDeleting(false); setBulkConfirm(false); }
  };
  const remove = (id: string) => {
    if (armed !== id) { setArmed(id); return; }
    setArmed(null);
    setConfirmar(list?.find((v) => v.id === id) ?? null);
  };
  const excluirConfirmado = async () => {
    if (!confirmar) return;
    const removida = confirmar;
    setConfirmar(null);
    // Remove visually immediately
    setList((prev) => prev?.filter((v) => v.id !== removida.id) ?? null);
    // Cancel any previous pending delete
    if (pendingDeleteRef.current) clearTimeout(pendingDeleteRef.current.timer);
    // Schedule actual delete after 5s
    const timer = setTimeout(async () => {
      pendingDeleteRef.current = null;
      await deleteInspection(removida.id);
    }, 5200);
    pendingDeleteRef.current = { id: removida.id, timer };
    setUndoEntry({
      label: `"${removida.empreendimento || "Sem nome"}" excluída`,
      undo: async () => {
        if (pendingDeleteRef.current?.id === removida.id) {
          clearTimeout(pendingDeleteRef.current.timer);
          pendingDeleteRef.current = null;
        }
        // Re-add to list
        setList((prev) => prev ? [...prev, removida].sort((a, b) => b.createdAt - a.createdAt) : [removida]);
      },
    });
  };

  return (
    <main className="mx-auto min-h-screen max-w-xl pb-32">
      <header className="iphone-header home-header relative bg-primary px-5 pb-6 text-primary-foreground">
        <div className="flex items-center gap-3">
          <Building2 className="h-9 w-9 text-secondary" />
          <h1 className="font-display text-4xl font-bold uppercase leading-none">
            Vistoria <span className="text-secondary">Obra</span>
          </h1>
        </div>
        <p className="mt-2 text-primary-foreground/80">Checklist de vistoria • fotos • PDF</p>
        <button onClick={async () => { await supabase.auth.signOut(); window.location.href = "/painel"; }} className="absolute right-4 top-4 flex items-center gap-1 rounded-lg bg-primary-foreground/10 px-3 py-1.5 text-xs font-semibold text-primary-foreground/80 hover:bg-primary-foreground/20" aria-label="Sair"><LogOut className="h-3.5 w-3.5" />Sair</button>
        <Link to="/formularios" className="mt-4 block rounded-xl bg-secondary px-4 py-3 text-center text-lg font-bold text-secondary-foreground shadow">📋 Formulários de clientes</Link>
      </header>

      {list && list.length > 1 && (
        <div className="flex items-center justify-end gap-2 px-4 pt-2">
          {selectMode && selected.size > 0 && (
            <>
              <span className="text-xs text-muted-foreground">{selected.size} selecionada{selected.size > 1 ? "s" : ""}</span>
              <button onClick={() => setBulkConfirm(true)} disabled={bulkDeleting} className="text-xs text-destructive underline">
                Excluir
              </button>
            </>
          )}
          <button onClick={() => { setSelectMode((m) => !m); setSelected(new Set()); }} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <CheckSquare className="h-3.5 w-3.5" />{selectMode ? "Cancelar" : "Selecionar"}
          </button>
        </div>
      )}

      <section className="space-y-3 p-4">
        {list === null && <p className="text-muted-foreground">Carregando…</p>}
        {erro && <p role="alert" className="text-destructive">A conexão com o banco existente precisa estar configurada neste projeto para carregar e salvar as vistorias.</p>}
        {!erro && list?.length === 0 && (
          <div className="rounded-xl border-2 border-dashed border-border p-8 text-center text-muted-foreground">
            Nenhuma vistoria ainda. Toque em <b>Nova vistoria</b> para começar.
          </div>
        )}
        {list?.map((v) => {
          const done = Object.values(v.entries).filter((e) => e.answer).length;
          const pct = Math.round((done / totalOf(v)) * 100);
          return (
            <div key={v.id} className="flex items-stretch overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              <Link to="/vistoria/$id" params={{ id: v.id }} className="flex flex-1 items-center gap-3 p-4">
                <div className="flex-1">
                  <div className="font-display text-xl font-bold">{v.empreendimento || "Sem nome"} {v.unidade && `• ${v.unidade}`}</div>
                  <div className="text-sm text-muted-foreground">
                    {v.tipoImovel === "casa" ? "Casa" : "Apto"} • {v.data.split("-").reverse().join("/")} • {v.status === "concluida" ? "Concluída" : `${pct}% feito`}
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                    <div className={v.status === "concluida" ? "h-full bg-success" : "h-full bg-secondary"} style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <ChevronRight className="h-6 w-6 text-muted-foreground" />
              </Link>
              {selectMode ? (
                <button onClick={() => toggleSelect(v.id)} aria-label="Selecionar" className="border-l border-border px-4 flex items-center justify-center">
                  <div className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-colors duration-150 ${selected.has(v.id) ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/40"}`}>
                    {selected.has(v.id) && <Check className="h-3 w-3" />}
                  </div>
                </button>
              ) : (
                <button ref={armed === v.id ? armedRef : undefined} onClick={() => remove(v.id)} aria-label="Excluir"
                  className={armed === v.id ? "flex items-center gap-1 bg-destructive px-4 text-sm font-bold text-destructive-foreground" : "border-l border-border px-4 text-destructive"}>
                  <Trash2 className="h-5 w-5" />{armed === v.id && "Excluir"}
                </button>
              )}
            </div>
          );
        })}
      </section>

      <div className="fixed inset-x-0 bottom-0 mx-auto max-w-xl p-4">
        <div className="flex gap-2">
          <button disabled={erro} onClick={() => create("apartamento")} className="flex h-16 flex-1 items-center justify-center gap-2 rounded-lg border border-primary bg-primary font-display text-lg font-bold uppercase text-primary-foreground shadow-lg disabled:opacity-50 active:scale-[.98]">
            <Building className="h-6 w-6" /> Apartamento
          </button>
          <button disabled={erro} onClick={() => create("casa")} className="flex h-16 flex-1 items-center justify-center gap-2 rounded-lg border border-primary bg-primary font-display text-lg font-bold uppercase text-primary-foreground shadow-lg disabled:opacity-50 active:scale-[.98]">
            <Home className="h-6 w-6" /> Casa
          </button>
        </div>
      </div>
      <ConfirmDelete open={!!confirmar} busy={excluindo} titulo="Excluir vistoria?"
        descricao={confirmar ? `${confirmar.empreendimento || "Sem nome"}${confirmar.unidade ? ` • ${confirmar.unidade}` : ""} será apagada e não poderá ser recuperada.` : ""}
        onConfirm={excluirConfirmado} onCancel={() => setConfirmar(null)} />
      <ConfirmBulkDelete open={bulkConfirm} count={selected.size} label="vistorias" busy={bulkDeleting}
        onConfirm={bulkDelete} onCancel={() => setBulkConfirm(false)} />
      <UndoBar entry={undoEntry} onExpire={() => setUndoEntry(null)} />
    </main>
  );
}
