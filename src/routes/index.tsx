import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useDismiss } from "@/hooks/use-dismiss";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { Plus, Building2, Trash2, ChevronRight, LogOut, Home, Building } from "lucide-react";
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
  component: Home,
});

function Home() {
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
  const remove = (id: string) => {
    if (armed !== id) { setArmed(id); return; }
    setArmed(null);
    setConfirmar(list?.find((v) => v.id === id) ?? null);
  };
  const excluirConfirmado = async () => {
    if (!confirmar) return;
    const id = confirmar.id;
    setConfirmar(null);
    setExcluindo(true);
    try {
      await deleteInspection(id);
      setList(await listInspections());
    } finally { setExcluindo(false); }
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
        <button onClick={() => supabase.auth.signOut()} className="absolute right-4 top-4 flex items-center gap-1 rounded-lg bg-primary-foreground/10 px-3 py-1.5 text-xs font-semibold text-primary-foreground/80 hover:bg-primary-foreground/20" aria-label="Sair"><LogOut className="h-3.5 w-3.5" />Sair</button>
        <Link to="/formularios" className="mt-4 block rounded-xl bg-secondary px-4 py-3 text-center text-lg font-bold text-secondary-foreground shadow">📋 Formulários de clientes</Link>
      </header>

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
              <button ref={armed === v.id ? armedRef : undefined} onClick={() => remove(v.id)} aria-label="Excluir"
                className={armed === v.id ? "flex items-center gap-1 bg-destructive px-4 text-sm font-bold text-destructive-foreground" : "border-l border-border px-4 text-destructive"}>
                <Trash2 className="h-5 w-5" />{armed === v.id && "Excluir"}
              </button>
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
    </main>
  );
}
