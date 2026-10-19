import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { listarFormularios, criarFormulario, excluirFormulario, renomearFormulario, getRespostasFormulario } from "@/lib/formularios.functions";
import { FORMS } from "@/lib/forms";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Trash2, RefreshCw, Search, Eye, EyeOff, FileDown, ArrowLeft, Pencil, Check, X, CalendarDays, ChevronDown, ChevronUp, Plus, Copy, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useDismiss } from "@/hooks/use-dismiss";
import { ConfirmDelete } from "@/components/ConfirmDelete";

export const Route = createFileRoute("/formularios")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Painel de Formulários – Eng. Mariana Nunes" },
      { name: "description", content: "Gere links individuais de formulário para clientes de vistoria e projeto." },
      { property: "og:title", content: "Painel de Formulários" },
      { property: "og:description", content: "Links individuais de formulário para clientes." },
    ],
  }),
  component: Painel,
});

type Row = { id: string; token: string; tipo: string; cliente_nome: string; status: string; created_at: string };

function Painel() {
  const [rows, setRows] = useState<Row[]>([]);
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState("vistoria_apto");
  const [aberto, setAberto] = useState<string | null>(null);
  const [filtro, setFiltro] = useState("todos");
  const [busca, setBusca] = useState("");
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const [dataAberta, setDataAberta] = useState(false);
  const [novoAberto, setNovoAberta] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const [nomeEditado, setNomeEditado] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [excluir, setExcluir] = useState<Row | null>(null);
  const [excluindo, setExcluindo] = useState(false);
  const [confirmar, setConfirmar] = useState<Row | null>(null);
  const excluirRef = useRef<HTMLDivElement>(null);
  useDismiss(!!excluir && !excluindo, () => setExcluir(null), [excluirRef]);
  const [loading, setLoading] = useState(false);
  const [respostasCache, setRespostasCache] = useState<Record<string, Record<string, string> | null>>({});
  const loadRespostas = async (id: string) => {
    if (respostasCache[id] !== undefined) return;
    try {
      const r = await getRespostasFormulario({ data: { id } });
      setRespostasCache((prev) => ({ ...prev, [id]: r }));
    } catch { toast.error("Não foi possível carregar as respostas."); }
  };
  const load = async () => {
    setLoading(true);
    try { setRows((await listarFormularios() as Row[]) ?? []); }
    catch { toast.error("Não foi possível atualizar os formulários."); }
    finally { setLoading(false); }
  };
  const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const visibleRows = rows.filter((r) => {
    const date = new Date(r.created_at);
    const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const matchFiltro = filtro === "todos" || r.tipo === filtro || (filtro === "vistoria" && (r.tipo === "vistoria_apto" || r.tipo === "vistoria_casa" || r.tipo === "vistoria"));
    return matchFiltro && normalize(r.cliente_nome).includes(normalize(busca)) && (!inicio || day >= inicio) && (!fim || day <= fim);
  });
  const salvarNome = async (id: string) => {
    const value = nomeEditado.trim();
    if (!value) { toast.error("Digite o nome do cliente."); return; }
    setSalvando(true);
    try {
      const result = await renomearFormulario({ data: { id, cliente_nome: value } });
      if (!result.ok) throw new Error("Não foi possível salvar o nome.");
      setRows((previous) => previous.map((row) => row.id === id ? { ...row, cliente_nome: value } : row));
      setEditando(null);
      toast.success("Nome atualizado.");
    } catch { toast.error("Não foi possível alterar o nome."); }
    finally { setSalvando(false); }
  };
  const cancelarEdicao = () => { setEditando(null); setNomeEditado(""); };
  const removerFormulario = async (r: Row) => {
    setConfirmar(null);
    setExcluindo(true);
    try {
      const result = await excluirFormulario({ data: { id: r.id } });
      if (!result.ok) throw new Error("Falha ao excluir.");
      setRows((previous) => previous.filter((row) => row.id !== r.id));
      toast.success("Formulário excluído.");
    } catch { toast.error("Não foi possível excluir o formulário."); }
    finally { setExcluindo(false); setExcluir(null); }
  };
  useEffect(() => { load(); }, []);
  const editRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!editando) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") cancelarEdicao(); };
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (target && editRef.current && !editRef.current.contains(target)) cancelarEdicao();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointerDown, true);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("pointerdown", onPointerDown, true); };
  }, [editando]);
  const novoRef = useRef<HTMLElement | null>(null);
  const novoBtnRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (!novoAberto) return;
    const fechar = () => setNovoAberta(false);
    const dentro = (alvo: EventTarget | null) => {
      const no = alvo as Node | null;
      if (!no) return true;
      return !!novoRef.current?.contains(no) || !!novoBtnRef.current?.contains(no);
    };
    const digitando = () => !!novoRef.current?.contains(document.activeElement);
    const onPointerDown = (e: PointerEvent) => { if (!dentro(e.target)) fechar(); };
    const onWheel = (e: WheelEvent) => { if (!digitando() && e.deltaY > 4) fechar(); };
    let toqueY = 0;
    const onTouchStart = (e: TouchEvent) => { toqueY = e.touches[0]?.clientY ?? 0; };
    const onTouchMove = (e: TouchEvent) => { const y = e.touches[0]?.clientY ?? toqueY; if (!digitando() && toqueY - y > 12) fechar(); };
    let rolagem = window.scrollY;
    const onScroll = () => { const y = window.scrollY; if (!digitando() && y - rolagem > 12) fechar(); rolagem = y; };
    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("scroll", onScroll);
    };
  }, [novoAberto]);
  const link = (t: string) => `${window.location.origin}/f/${t}`;

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4">
      <header className="forms-header">
        <div className="forms-header-title">
          <Button asChild variant="outline" size="icon" aria-label="Voltar para vistorias"><Link to="/"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <h1 className="min-w-0 text-xl font-bold text-primary sm:text-2xl">Formulários de clientes</h1>
        </div>
        <div className="forms-header-bar">
          <span className="forms-count" aria-live="polite">{visibleRows.length} de {rows.length} formulários</span>
          <button ref={novoBtnRef} type="button" className="forms-data-toggle" aria-expanded={novoAberto} onClick={() => setNovoAberta((open) => !open)}><Plus />Novo formulário<ChevronDown data-chevron /></button>
        </div>
      </header>
      <section ref={novoRef} className="forms-new-shell" data-aberto={novoAberto ? "true" : undefined} inert={!novoAberto}>
        <div className="forms-new-clip">
          <div className="forms-new">
            <h2 className="text-sm font-semibold text-primary">Criar formulário para cliente</h2>
            <div className="forms-create">
              <Input className="min-w-0" aria-label="Nome do cliente" placeholder="Nome do cliente" maxLength={120} value={nome} onChange={(e) => setNome(e.target.value.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ' .-]/g, "").slice(0, 120))} />
              <select aria-label="Tipo de formulário" className="form-control" value={tipo} onChange={(e) => setTipo(e.target.value)}>
                <option value="vistoria_apto">Vistoria – Apartamento</option>
                <option value="vistoria_casa">Vistoria – Casa</option>
                <option value="projeto">Projeto</option>
                <option value="contrato">Contrato</option>
              </select>
              <Button onClick={async () => { if (!nome.trim()) { window.alert("Digite o nome do cliente para gerar o link."); return; } try { const result = await criarFormulario({ data: { cliente_nome: nome.trim(), tipo } }); if (!result.ok) throw new Error("Não foi possível criar o formulário."); setNome(""); await load(); } catch (e) { window.alert("Não foi possível gerar o link: " + (e as Error).message); } }}>Gerar link</Button>
            </div>
          </div>
        </div>
      </section>
      <section className="space-y-3">
        <div className="forms-search">
          <div className="relative min-w-0"><Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input aria-label="Pesquisar cliente" placeholder="Pesquisar nome do cliente" className="pl-9" value={busca} onChange={(e) => setBusca(e.target.value)} /></div>
          <Button variant="outline" onClick={load} disabled={loading}><RefreshCw className={loading ? "animate-spin" : ""} />{loading ? "Atualizando…" : "Atualizar"}</Button>
          <div className="forms-types" role="group" aria-label="Filtrar formulários">
            {([["todos", "Todos"], ["projeto", "Projetos"], ["vistoria", "Vistorias"]] as const).map(([value, label]) => <Button key={value} size="sm" variant={filtro === value ? "default" : "outline"} aria-pressed={filtro === value} onClick={() => setFiltro(value as string)}>{label}</Button>)}
          </div>
        </div>
        <div className="forms-data">
          <div className="forms-data-bar">
            <button type="button" className="forms-data-toggle" aria-expanded={dataAberta} onClick={() => setDataAberta((open) => !open)}><CalendarDays />Filtrar por data<ChevronDown data-chevron /></button>
            {(inicio || fim || busca || filtro !== "todos") ? <button type="button" className="forms-clear" onClick={() => { setInicio(""); setFim(""); setBusca(""); setFiltro("todos"); }}>Limpar filtros</button> : null}
          </div>
          {dataAberta ? (
            <div className="forms-period">
              <label className="min-w-0 text-xs text-muted-foreground">Criado de<Input type="date" aria-label="Criado de" className="mt-1 min-w-0" value={inicio} max={fim || undefined} onChange={(e) => setInicio(e.target.value)} /></label>
              <label className="min-w-0 text-xs text-muted-foreground">Até<Input type="date" aria-label="Criado até" className="mt-1 min-w-0" value={fim} min={inicio || undefined} onChange={(e) => setFim(e.target.value)} /></label>
            </div>
          ) : null}
        </div>
      </section>
      {visibleRows.map((r) => (
        <div key={r.id} ref={editando === r.id ? editRef : null} className="space-y-3 overflow-hidden rounded-lg border bg-card p-4">
          <div className="grid min-w-0 gap-3">
            <div className="forms-client-summary">
              <div className="forms-client-details">
                {editando === r.id ? (
                  <form className="contents" onSubmit={(e) => { e.preventDefault(); salvarNome(r.id); }}>
                    <Input aria-label="Editar nome do cliente" value={nomeEditado} maxLength={120} disabled={salvando} autoFocus onChange={(e) => setNomeEditado(e.target.value.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ' .-]/g, "").slice(0, 120))} />
                  </form>
                ) : <b className="forms-client-name" title={r.cliente_nome}>{r.cliente_nome}</b>}
                <div className="forms-client-meta">
                  <span>{{ vistoria: "Vistoria", vistoria_apto: "Vistoria – Apto", vistoria_casa: "Vistoria – Casa", projeto: "Projeto", contrato: "Contrato" }[r.tipo] || r.tipo}</span><span aria-hidden="true">·</span><time dateTime={r.created_at}>{new Date(r.created_at).toLocaleDateString("pt-BR")}</time>
                  <span className={`rounded px-2 py-0.5 text-xs ${r.status === "preenchido" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{r.status === "preenchido" ? "Preenchido" : "Pendente"}</span>
                </div>
              </div>
              <div className="forms-client-tools">
              {editando === r.id ? (
                <>
                  <Button size="icon" disabled={salvando} aria-label="Salvar nome" title="Salvar nome" onClick={() => salvarNome(r.id)}><Check /></Button>
                  <Button size="icon" variant="outline" disabled={salvando} aria-label="Cancelar edição" title="Cancelar edição (Esc)" onClick={cancelarEdicao}><X /></Button>
                </>
              ) : aberto === r.id ? (
                <Button variant="outline" size="icon" className="forms-client-menu" aria-label="Ocultar respostas" title="Ocultar respostas" onClick={() => setAberto(null)}><ChevronUp /></Button>
              ) : (
                <DropdownMenu onOpenChange={(o) => { if (!o && !excluindo) setExcluir(null); }}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="forms-client-menu" disabled={salvando} aria-label={`Opções de ${r.cliente_nome}`} title="Opções"><ChevronDown /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => { setEditando(r.id); setNomeEditado(r.cliente_nome); }}><Pencil />Editar nome</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigator.clipboard.writeText(link(r.token))}><Copy />Copiar link</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      const mensagem = `Olá ${r.cliente_nome}, por favor preencha o formulário: ${link(r.token)}`;
                      navigator.clipboard?.writeText(mensagem).catch(() => {});
                      const texto = encodeURIComponent(mensagem);
                      const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
                      if (mobile) { window.location.href = `whatsapp://send?text=${texto}`; return; }
                      window.open(`https://web.whatsapp.com/send?text=${texto}`, "_blank", "noopener,noreferrer");
                    }}><MessageCircle />Enviar WhatsApp</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      navigator.clipboard?.writeText(`Olá ${r.cliente_nome}, por favor preencha o formulário: ${link(r.token)}`);
                      window.alert("Mensagem copiada! Cole no WhatsApp.");
                    }}><Copy />Copiar mensagem</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { if (aberto === r.id) { setAberto(null); } else { setAberto(r.id); loadRespostas(r.id); } }}>{aberto === r.id ? <EyeOff /> : <Eye />}{aberto === r.id ? "Ocultar respostas" : "Ver respostas"}</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem ref={excluir?.id === r.id ? excluirRef : undefined} disabled={excluindo}
                      className={excluir?.id === r.id ? "bg-destructive font-bold text-destructive-foreground focus:bg-destructive focus:text-destructive-foreground" : "text-destructive focus:text-destructive"}
                      onSelect={(e) => { if (excluir?.id !== r.id) { e.preventDefault(); setExcluir(r); } else { setExcluir(null); setConfirmar(r); } }}><Trash2 />Excluir</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              </div>
            </div>
          </div>
          {aberto === r.id ? (
            <div className="space-y-2 border-t pt-3 text-sm break-words">
              {respostasCache[r.id] === undefined ? (
                <p className="text-muted-foreground">Carregando respostas…</p>
              ) : (
                <>
                  {(FORMS[r.tipo]?.sections ?? []).map((s, si) => (
                    <div key={si} className="space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{s.title}</p>
                      {s.fields.map((f) => {
                        const k = `${si + 1}. ${f.label}`;
                        const v = respostasCache[r.id]?.[k] ?? "";
                        return (
                          <p key={k}><span className="text-muted-foreground">{f.label}:</span> {v || <span className="italic text-muted-foreground">não preenchido</span>}</p>
                        );
                      })}
                    </div>
                  ))}
                  <Button size="sm" variant="outline" onClick={() => {
                    const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] ?? c));
                    const resp = respostasCache[r.id] ?? {};
                    const corpo = (FORMS[r.tipo]?.sections ?? []).map((s, si) => `<h2>${esc(s.title)}</h2>` + s.fields.map((f) => {
                      const v = resp[`${si + 1}. ${f.label}`] ?? "";
                      return `<div class="q"><div class="l">${esc(f.label)}</div><div class="v">${v ? esc(String(v)) : "&nbsp;"}</div></div>`;
                    }).join("")).join("");
                    const w = window.open("", "_blank");
                    if (!w) return;
                    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(r.cliente_nome)}</title><style>@media print{.print-actions{display:none}}.print-actions{display:flex;gap:12px;margin-bottom:20px}body{font-family:Arial,sans-serif;margin:24px;color:#000}h1{font-size:18px}h2{font-size:14px;margin:18px 0 8px;border-bottom:1px solid #000;padding-bottom:4px}.q{margin:0 0 10px;break-inside:avoid}.l{font-size:12px;font-weight:bold;margin-bottom:3px}.v{border:1px solid #999;border-radius:4px;padding:6px 8px;min-height:18px;font-size:13px;white-space:pre-wrap}</style></head><body><nav class="print-actions"><button onclick="window.close()">Voltar aos formulários</button><button onclick="window.print()">Imprimir / Salvar PDF</button></nav><h1>${esc(FORMS[r.tipo]?.titulo ?? "Formulário")} — ${esc(r.cliente_nome)}</h1>${corpo}<script>window.onload=()=>{window.print()}<\/script></body></html>`);
                    w.document.close();
                  }}><FileDown />Imprimir / PDF</Button>
                </>
              )}
            </div>
          ) : null}
        </div>
      ))}
      {!visibleRows.length && <p className="text-muted-foreground">{loading ? "Carregando…" : rows.length ? "Nenhum cliente encontrado." : "Nenhum formulário ainda."}</p>}
      <ConfirmDelete open={!!confirmar} busy={excluindo} titulo="Excluir formulário?"
        descricao={confirmar ? `O formulário de ${confirmar.cliente_nome} será apagado e não poderá ser recuperado.` : ""}
        onConfirm={() => { if (confirmar) removerFormulario(confirmar); }} onCancel={() => setConfirmar(null)} />

    </main>
  );
}
