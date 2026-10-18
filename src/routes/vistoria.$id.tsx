import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Camera, Images, Check, X, Minus, FileDown, Trash2, ChevronDown, ChevronUp, Plus } from "lucide-react";
import { toast } from "sonner";
import { TEMPLATES, DEFAULT_ROOMS, roomsOf, totalOf, checkKey, ALL_CHECKS, roomTotal, type Room, type RoomRef, type Group } from "@/lib/checklist";
import { getInspection, saveInspection, compressImage, uid, type Inspection, type Answer, type CheckEntry } from "@/lib/store";
import type { exportPdf } from "@/lib/pdf";
import { useDismiss } from "@/hooks/use-dismiss";
import { SignaturePad } from "@/components/SignaturePad";
import { Button } from "@/components/ui/button";
import { DiscreetDelete } from "@/components/DiscreetDelete";
import { Checkbox } from "@/components/ui/checkbox";
import { isApontamento } from "@/lib/apontamentos";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export const Route = createFileRoute("/vistoria/$id")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Vistoria em andamento — Vistoria Obra" },
      { name: "description", content: "Preencha o checklist cômodo por cômodo e registre as fotos." },
      { property: "og:title", content: "Vistoria em andamento — Vistoria Obra" },
      { property: "og:description", content: "Checklist de vistoria passo a passo com fotos." },
    ],
  }),
  component: Page,
});

// steps: 0 = dados, 1..N = cômodos, N+1 = finalização

function Page() {
  const { id } = Route.useParams();
  const [v, setV] = useState<Inspection | null | undefined>(undefined);
  const currentInspection = useRef<Inspection | null>(null);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [pdf, setPdf] = useState<Awaited<ReturnType<typeof exportPdf>> | null>(null);
  useEffect(() => () => { if (pdf) URL.revokeObjectURL(pdf.url); }, [pdf]);
  const [adding, setAdding] = useState(false);
  const addBtnRef = useRef<HTMLButtonElement>(null);
  const addPanelRef = useRef<HTMLDivElement>(null);
  const headRO = useRef<ResizeObserver | null>(null);
  const setHead = (el: HTMLElement | null) => {
    headRO.current?.disconnect();
    if (!el) return;
    const set = () => document.documentElement.style.setProperty("--app-head", `${el.offsetHeight}px`);
    set();
    headRO.current = new ResizeObserver(set);
    headRO.current.observe(el);
  };
  useDismiss(adding, () => setAdding(false), [addBtnRef, addPanelRef], false);
  const [customName, setCustomName] = useState("");
  const [newItemName, setNewItemName] = useState("");
  const [newItemChecks, setNewItemChecks] = useState("");
  const [showAddItem, setShowAddItem] = useState(false);

  useEffect(() => {
    let active = true;
    currentInspection.current = null;
    setV(undefined);
    getInspection(id).then((x) => {
      if (!active) return;
      currentInspection.current = x ?? null;
      setV(x ?? null);
    }).catch(() => {
      if (!active) return;
      setV(null);
      toast.error("Não foi possível carregar a vistoria. Tente novamente.");
    });
    const retry = () => {
      const current = currentInspection.current;
      if (current) void saveInspection(current).catch(() => undefined);
    };
    window.addEventListener("online", retry);
    return () => { active = false; window.removeEventListener("online", retry); };
  }, [id]);
  useEffect(() => { window.scrollTo(0, 0); }, [step]);

  const update = (fn: (x: Inspection) => Inspection) => {
    const prev = currentInspection.current;
    if (!prev) return;
    const next = fn(prev);
    currentInspection.current = next;
    setV(next);
    void saveInspection(next).catch(() => toast.error("Falha ao salvar na nuvem. Mantenha este dispositivo para retomar a vistoria."));
  };
  const setEntry = (k: string, patch: Partial<CheckEntry>) =>
    update((x) => ({ ...x, entries: { ...x.entries, [k]: { ...x.entries[k], ...patch } } }));

  if (v === undefined) return <p className="p-6">Carregando…</p>;
  if (v === null) return <div className="p-6">Vistoria não encontrada. <Link to="/" className="underline">Voltar</Link></div>;

  const ROOMS = roomsOf(v);
  const LAST = ROOMS.length + 1;
  const TOTAL = totalOf(v);
  const owner = v.proprietario ?? { nome: "", cpf: "", telefone: "", email: "" };
  const setOwner = (k: keyof typeof owner, t: string) => update((x) => ({ ...x, proprietario: { ...owner, ...x.proprietario, [k]: t } }));
  const addRoom = (typeId: string) => {
    const t = TEMPLATES.find((x) => x.id === typeId);
    if (!t) return;
    const refs = v.rooms ?? DEFAULT_ROOMS;
    const same = refs.filter((r) => r.type === typeId).length;
    const name = same ? `${t.name} ${same + 1}` : t.name;
    update((x) => ({ ...x, rooms: [...refs, { id: `${typeId}-${uid()}`, name, type: typeId }] }));
    setAdding(false);
    setStep(refs.length + 1);
    toast.success(`${name} adicionado`);
  };
  const addCustomRoom = () => {
    const name = customName.trim();
    if (!name) return;
    const refs = v.rooms ?? DEFAULT_ROOMS;
    update((x) => ({ ...x, rooms: [...refs, { id: `custom-${uid()}`, name, type: "custom", customGroups: [] }] }));
    setCustomName("");
    setAdding(false);
    setStep(refs.length + 1);
    toast.success(`${name} adicionado`);
  };
  const patchRef = (roomId: string, fn: (r: RoomRef) => RoomRef) =>
    update((x) => ({ ...x, rooms: (x.rooms ?? DEFAULT_ROOMS).map((r) => (r.id === roomId ? fn(r) : r)) }));
  /** Re-numera as respostas de um ambiente após mudança estrutural, casando por nome de item/verificação. */
  const rekeyRoom = (x: Inspection, oldRoom: Room, newGroups: Group[]) => {
    const e = { ...x.entries };
    Object.keys(e).forEach((k) => k.startsWith(oldRoom.id + ":") && delete e[k]);
    oldRoom.groups.forEach((g, gi) =>
      g.checks.forEach((c, ci) => {
        const ent = x.entries[checkKey(oldRoom.id, gi, ci)];
        if (!ent) return;
        const ngi = newGroups.findIndex((ng) => ng.item === g.item);
        const nci = ngi < 0 ? -1 : (newGroups[ngi]?.checks.indexOf(c) ?? -1);
        if (nci >= 0) e[checkKey(oldRoom.id, ngi, nci)] = ent;
      })
    );
    return e;
  };
  const addItem = (room: Room) => {
    const item = newItemName.trim();
    if (!item) return;
    const checks = newItemChecks.split(",").map((s) => s.trim()).filter(Boolean);
    const g: Group = { item, checks: checks.length ? checks : ["Conforme"] };
    patchRef(room.id, (r) => ({ ...r, customGroups: [...(r.customGroups ?? []), g] }));
    setNewItemName("");
    setNewItemChecks("");
    setShowAddItem(false);
    toast.success(`Item "${item}" adicionado`);
  };
  const addCheck = (room: Room, item: string, c: string) => {
    patchRef(room.id, (r) => { const ex = r.extraChecks ?? {}; return { ...r, extraChecks: { ...ex, [item]: [...(ex[item] ?? []), c] } }; });
    toast.success(`Verificação "${c}" adicionada`);
  };
  const removeItem = (room: Room, gi: number) => {
    const g = room.groups[gi];
    if (!g) return;
    const isCustom = gi >= room.groups.length - ((v.rooms ?? DEFAULT_ROOMS).find((r) => r.id === room.id)?.customGroups?.length ?? 0);
    update((x) => {
      const refs = (x.rooms ?? DEFAULT_ROOMS).map((r) =>
        r.id === room.id
          ? isCustom
            ? { ...r, customGroups: (r.customGroups ?? []).filter((cg) => cg.item !== g.item) }
            : { ...r, removedItems: [...(r.removedItems ?? []), g.item] }
          : r
      );
      const newGroups = room.groups.filter((_, i) => i !== gi);
      return { ...x, rooms: refs, entries: rekeyRoom(x, room, newGroups) };
    });
  };
  const removeCheck = (room: Room, gi: number, ci: number) => {
    const group = room.groups[gi];
    const check = group?.checks[ci];
    if (!group || !check) return;
    update((x) => ({ ...x,
      rooms: (x.rooms ?? DEFAULT_ROOMS).map((r) => r.id === room.id ? { ...r,
        removedChecks: { ...r.removedChecks, [group.item]: [...(r.removedChecks?.[group.item] ?? []), check] },
      } : r),
      entries: rekeyRoom(x, room, room.groups.map((g, i) => i === gi ? { ...g, checks: g.checks.filter((_, n) => n !== ci) } : g)),
    }));
  };
  const removeRoom = (rid: string) => {
    if (!confirm("Remover este ambiente e suas respostas?")) return;
    update((x) => {
      const e = { ...x.entries };
      Object.keys(e).forEach((k) => k.startsWith(rid + ":") && delete e[k]);
      return { ...x, entries: e, rooms: (x.rooms ?? DEFAULT_ROOMS).filter((r) => r.id !== rid) };
    });
    setStep((s) => Math.max(0, s - 1));
  };
  const setGroup = (room: Room, gi: number, a: Answer) => update((x) => {
    const e = { ...x.entries };
    room.groups[gi]?.checks.forEach((_, ci) => { const k = checkKey(room.id, gi, ci); e[k] = { ...e[k], answer: a }; });
    return { ...x, entries: e };
  });

  const done = Object.values(v.entries).filter((e) => e.answer).length;
  const pct = Math.round((done / TOTAL) * 100);
  const room = step >= 1 && step <= ROOMS.length ? ROOMS[step - 1] : null;

  const next = () => {
    if (step === 0) { localStorage.setItem("vo:resp", v.responsavel); localStorage.setItem("vo:crea", v.crea); }
    setStep((s) => Math.min(LAST, s + 1));
  };

  const finish = async () => {
    setBusy(true);
    try {
      const fin = { ...v, status: "concluida" as const };
      update(() => fin);
      const generated = await (await import("@/lib/pdf")).exportPdf(fin);
      setPdf(generated);
      toast.success("PDF gerado!");
    } catch (e) { console.error(e); toast.error("Erro ao gerar o PDF."); }
    setBusy(false);
  };

  return (
    <main className="mx-auto min-h-screen max-w-xl pb-28">
      <header ref={setHead} className="iphone-header sticky top-0 z-10 bg-primary px-4 pb-3 text-primary-foreground shadow">
        <div className="flex items-center gap-2">
          <Link to="/" aria-label="Voltar ao início" className="-ml-1 flex h-11 w-11 items-center justify-center"><ArrowLeft /></Link>
          <div className="flex-1 truncate">
            <div className="text-xs uppercase text-primary-foreground/70">Etapa {step + 1} de {LAST + 1}</div>
            <div className="font-display text-2xl font-bold uppercase leading-tight">
              {step === 0 ? "Dados da vistoria" : room ? `${step}. ${room.name}` : "Finalizar"}
            </div>
          </div>
          <div className="font-display text-2xl font-bold text-secondary">{pct}%</div>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-primary-foreground/20">
          <div className="h-full bg-secondary transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-2 flex gap-1 overflow-x-auto">
          {["Dados", ...ROOMS.map((r) => r.name), "Final"].map((n, i) => (
            <Button variant="ghost" key={i} onClick={() => setStep(i)}
              className={`h-auto shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${i === step ? "bg-secondary text-secondary-foreground" : "bg-primary-foreground/10"}`}>
              {n}
            </Button>
          ))}
          <button ref={addBtnRef} onClick={() => setAdding((a) => !a)}
            className="flex shrink-0 items-center gap-1 rounded-full border border-secondary px-3 py-1 text-xs font-semibold text-secondary">
            <Plus className="h-3 w-3" /> Ambiente
          </button>
        </div>
        <div className="inspection-collapse" data-aberto={adding}>
          <div className="inspection-collapse-clip">
          <div ref={addPanelRef} className="mt-2 rounded-xl bg-card p-3 text-card-foreground">
            <div className="mb-2 text-sm font-semibold">Qual ambiente deseja adicionar?</div>
            <div className="grid grid-cols-2 gap-2">
              {TEMPLATES.map((t) => (
                <button key={t.id} onClick={() => addRoom(t.id)} className="h-11 rounded-lg border-2 border-border bg-background text-sm font-semibold">
                  {t.name}
                </button>
              ))}
            </div>
            <div className="mt-3 border-t border-border pt-3">
              <div className="mb-2 text-sm font-semibold">Ou crie um ambiente personalizado:</div>
              <div className="flex gap-2">
                <input value={customName} onChange={(e) => setCustomName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCustomRoom()}
                  placeholder="Nome do ambiente (ex: Hall de entrada)"
                  className="h-11 flex-1 rounded-lg border-2 border-input bg-background px-3 text-sm" />
                <button onClick={addCustomRoom} className="h-11 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground">
                  Criar
                </button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Depois de criar, adicione os itens que quiser dentro do ambiente.</p>
            </div>
          </div>
          </div>
        </div>
      </header>

      {step === 0 && (
        <section className="space-y-4 p-4">
          <Field label="Empreendimento" value={v.empreendimento} onChange={(t) => update((x) => ({ ...x, empreendimento: t }))} />
          <Field label="Unidade" value={v.unidade} onChange={(t) => update((x) => ({ ...x, unidade: t }))} />
          <Field label="Endereço do imóvel" value={v.endereco || ""} onChange={(t) => update((x) => ({ ...x, endereco: t }))} />
          <div className="inspection-date-field"><Field label="Data" type="date" value={v.data} onChange={(t) => update((x) => ({ ...x, data: t }))} /></div>
          <Field label="Responsável pela vistoria" value={v.responsavel} onChange={(t) => update((x) => ({ ...x, responsavel: t }))} />
          <Field label="CREA (se aplicável)" value={v.crea} onChange={(t) => update((x) => ({ ...x, crea: t }))} />
          <Field label="Número da ART" value={v.art ?? ""} onChange={(t) => update((x) => ({ ...x, art: t.slice(0, 60) }))} />
          <h2 className="pt-2 font-display text-xl font-bold uppercase text-primary">Dados do proprietário</h2>
          <Field label="Nome do proprietário" value={owner.nome} onChange={(t) => setOwner("nome", t)} />
          <Field label="CPF/CNPJ" value={owner.cpf} onChange={(t) => setOwner("cpf", t)} />
          <Field label="Telefone" type="tel" value={owner.telefone} onChange={(t) => setOwner("telefone", t)} />
          <Field label="E-mail" type="email" value={owner.email} onChange={(t) => setOwner("email", t)} />
        </section>
      )}

      {room && (
        <section className="space-y-5 p-4">
          <div className="flex items-center justify-between rounded-xl bg-accent p-3 text-sm">
            <span>{room.groups.reduce((a, g, gi) => a + g.checks.filter((_, ci) => v.entries[checkKey(room.id, gi, ci)]?.answer).length, 0)} de {roomTotal(room)} itens</span>
          </div>
          {room.groups.map((g, gi) => (
            <GroupCard key={`${room.id}-${g.item}`} room={room} gi={gi} v={v} onAll={(a) => setGroup(room, gi, a)} setEntry={setEntry} onRemove={() => removeItem(room, gi)} onRemoveCheck={(ci) => removeCheck(room, gi, ci)} onAddCheck={(c) => addCheck(room, g.item, c)} />
          ))}
          <div className="rounded-xl border-2 border-dashed border-border p-3">
            <button onClick={() => setShowAddItem((s) => !s)} className="mb-2 flex w-full items-center justify-between text-sm font-semibold">
              Adicionar item neste ambiente
              <ChevronDown className={`h-4 w-4 transition-transform ${showAddItem ? "rotate-180" : ""}`} />
            </button>
            {showAddItem && (
              <>
                <input value={newItemName} onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="Nome do item (ex: Armário embutido)"
                  className="mb-2 h-11 w-full rounded-lg border-2 border-input bg-background px-3 text-sm" />
                <input value={newItemChecks} onChange={(e) => setNewItemChecks(e.target.value)}
                  placeholder="Verificações separadas por vírgula (ex: Fixação, Portas, Acabamento)"
                  className="mb-2 h-11 w-full rounded-lg border-2 border-input bg-background px-3 text-sm" />
                <button onClick={() => addItem(room)} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground">
                  <Plus className="h-4 w-4" /> Adicionar item
                </button>
              </>
            )}
          </div>
          <button onClick={() => removeRoom(room.id)} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border-2 border-destructive/40 text-sm font-semibold text-destructive">
            <Trash2 className="h-4 w-4" /> Remover este ambiente
          </button>
        </section>
      )}

      {step === LAST && (
        <section className="space-y-5 p-4">
          <Summary v={v} rooms={ROOMS} onGo={setStep} setEntry={setEntry} />
          <label className="block">
            <span className="mb-1 block font-semibold">Observações gerais da vistoria</span>
            <textarea className="min-h-28 w-full rounded-xl border-2 border-input bg-card p-3 text-base" value={v.obsGerais}
              onChange={(e) => update((x) => ({ ...x, obsGerais: e.target.value }))} />
          </label>
          <div>
            <span className="mb-1 block font-semibold">Apontamentos extras</span>
            {[0, 1, 2, 3, 4].map((i) => (
              <input key={i} placeholder={`${i + 1}.`} className="mb-2 h-12 w-full rounded-xl border-2 border-input bg-card px-3 text-base"
                value={v.apontamentos[i] || ""}
                onChange={(e) => update((x) => { const a = [...x.apontamentos]; a[i] = e.target.value; return { ...x, apontamentos: a }; })} />
            ))}
          </div>
          <div>
            <span className="mb-1 block font-semibold">Assinatura do responsável</span>
            <SignaturePad value={v.signature} onChange={(d) => update((x) => ({ ...x, signature: d }))} />
          </div>
        </section>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-10 mx-auto flex max-w-xl gap-3 border-t border-border bg-background p-3">
        <button disabled={step === 0} onClick={() => setStep((s) => s - 1)}
          className="flex h-14 w-24 items-center justify-center rounded-xl border-2 border-primary font-bold text-primary disabled:opacity-30">
          <ArrowLeft />
        </button>
        {step < LAST ? (
          <Button onClick={next} className="flex h-14 flex-1 items-center justify-center gap-2 rounded-xl bg-primary font-display text-xl font-bold uppercase text-primary-foreground">
            Próximo <ArrowRight />
          </Button>
        ) : (
          <button disabled={busy} onClick={finish} className="flex h-14 flex-1 items-center justify-center gap-2 rounded-xl bg-secondary font-display text-xl font-bold uppercase text-secondary-foreground disabled:opacity-60">
            <FileDown /> {busy ? "Gerando…" : "Concluir e exportar PDF"}
          </button>
        )}
      </nav>
      <Dialog open={pdf !== null} onOpenChange={(open) => { if (!open) setPdf(null); }}>
        <DialogContent className="pdf-preview" aria-describedby="pdf-description">
          <DialogTitle>PDF da vistoria</DialogTitle>
          <DialogDescription id="pdf-description" className="sr-only">Relatório da vistoria</DialogDescription>
          <div className="pdf-actions">
            <Button variant="outline" className="pdf-action" onClick={() => setPdf(null)}><ArrowLeft /> Voltar à vistoria</Button>
            {pdf && <Button asChild className="pdf-action"><a href={pdf.url} download={pdf.name}><FileDown /> Baixar PDF</a></Button>}
            {pdf && <Button variant="outline" className="pdf-action" onClick={async () => {
              try {
                if (navigator.canShare?.({ files: [pdf.file] })) await navigator.share({ files: [pdf.file], title: pdf.name });
                else toast.error("Use Baixar PDF para salvar o arquivo.");
              } catch (error) { if (!(error instanceof DOMException && error.name === "AbortError")) toast.error("Não foi possível compartilhar o PDF."); }
            }}>Compartilhar</Button>}
          </div>
          {pdf && <iframe className="pdf-document" title="PDF da vistoria" src={pdf.url} />}
        </DialogContent>
      </Dialog>
    </main>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block font-semibold">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        className={`inspection-field rounded-lg border border-input bg-card text-base focus:border-ring focus:outline-none ${type === "date" ? "px-3" : "px-4"}`} />
    </label>
  );
}

const OPTS: { a: Answer; label: string; icon: typeof Check; on: string }[] = [
  { a: "sim", label: "CONFORME", icon: Check, on: "bg-success text-success-foreground border-success" },
  { a: "nao", label: "NÃO CONFORME", icon: X, on: "bg-destructive text-destructive-foreground border-destructive" },
  { a: "na", label: "N/A", icon: Minus, on: "bg-muted-foreground text-background border-muted-foreground" },
];

function CheckRow({ label, entry, onChange, onRemove }: { label: string; entry: CheckEntry; onChange: (p: Partial<CheckEntry>) => void; onRemove: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [showObs, setShowObs] = useState(!!entry.obs);
  const obsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!showObs) return;
    const onDown = (e: PointerEvent) => {
      if (obsRef.current && !obsRef.current.contains(e.target as Node)) setShowObs(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [showObs]);
  const photos = entry.photos || [];
  const photosRef = useRef(photos);
  photosRef.current = photos;

  const addPhotos = async (files: FileList | null) => {
    if (!files?.length || processing) return;
    setProcessing(true);
    try {
      for (const file of Array.from(files)) {
        const photo = { id: uid(), data: await compressImage(file), caption: "" };
        const next = [...photosRef.current, photo];
        photosRef.current = next;
        onChange({ photos: next });
      }
    } catch { toast.error("Não foi possível ler a foto."); }
    finally { setProcessing(false); }
  };

  return (
    <div className={`p-3 ${isApontamento(entry) ? "bg-destructive/5" : ""}`}>
      <div className="mb-2 flex items-center justify-between gap-2"><span className="min-w-0 text-lg font-semibold">{label}</span><DiscreetDelete label={`tópico ${label}`} onDelete={onRemove} /></div>
      <div className="grid grid-cols-3 gap-2">
        {OPTS.map(({ a, label: l, icon: I, on }) => (
          <button key={a} onClick={() => onChange({ answer: entry.answer === a ? undefined : a })}
            className={`flex h-12 items-center justify-center gap-1 rounded-lg border-2 px-1 text-center text-[11px] font-bold leading-tight sm:text-sm ${entry.answer === a ? on : "border-border bg-background"}`}>
            <I className="h-4 w-4 shrink-0" /> {l}
          </button>
        ))}
      </div>
      <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm font-semibold">
        <Checkbox checked={isApontamento(entry)} onCheckedChange={(checked) => onChange({ apontamento: checked === true })} />
        Incluir como apontamento
      </label>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button variant="outline" size="sm" disabled={processing} onClick={() => fileRef.current?.click()}><Camera className="h-4 w-4" />Tirar foto</Button>
        <Button variant="outline" size="sm" disabled={processing} onClick={() => galleryRef.current?.click()}><Images className="h-4 w-4" />{processing ? "Adicionando…" : "Galeria"}</Button>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" multiple hidden
          onChange={(e) => { addPhotos(e.target.files); e.target.value = ""; }} />
        <input ref={galleryRef} type="file" accept="image/*" multiple hidden
          onChange={(e) => { addPhotos(e.target.files); e.target.value = ""; }} />
      </div>
      {showObs ? (
        <div ref={obsRef} className="relative mt-2">
          <button onClick={() => setShowObs(false)} aria-label="Fechar observação"
            className="absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-md bg-background text-muted-foreground/70">
            <ChevronUp className="h-4 w-4" />
          </button>
          <textarea placeholder="Observação" value={entry.obs || ""} onChange={(e) => onChange({ obs: e.target.value })}
            className="min-h-16 w-full rounded-lg border-2 border-input bg-background p-2 pr-9 text-base" />
        </div>
      ) : (
        <button onClick={() => setShowObs(true)} className="mt-2 h-9 text-sm font-semibold text-muted-foreground underline">+ observação</button>
      )}
      {photos.length > 0 && (
        <div className="mt-2 grid grid-cols-3 gap-2">
          {photos.map((p, index) => (
            <div key={p.id} className="relative">
              <Button variant="ghost" className="h-auto w-full p-0" aria-label={`Ampliar foto ${index + 1}`} onClick={() => setSelected(index)}>
                <img src={p.data} alt={p.caption || `Foto ${index + 1} de ${label}`} loading="lazy" decoding="async" className="aspect-square w-full rounded-lg object-cover" />
              </Button>
              <div className="absolute right-1 top-1 rounded bg-background/90"><DiscreetDelete label="foto" onDelete={() => onChange({ photos: photosRef.current.filter((x) => x.id !== p.id) })} /></div>
              <input placeholder="Legenda" value={p.caption}
                onChange={(e) => onChange({ photos: photos.map((x) => (x.id === p.id ? { ...x, caption: e.target.value } : x)) })}
                className="mt-1 h-9 w-full rounded border border-input bg-background px-2 text-xs" />
            </div>
          ))}
        </div>
      )}
      <Dialog open={selected !== null} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent className="max-w-3xl">
          <DialogTitle>Fotos — {label}</DialogTitle>
          <DialogDescription>{selected !== null ? `${selected + 1} de ${photos.length}` : ""}</DialogDescription>
          {selected !== null && photos[selected] && <img src={photos[selected].data} alt={photos[selected].caption || label} className="max-h-[65dvh] w-full object-contain" />}
          <div className="flex items-center justify-between gap-2">
            <Button variant="outline" size="icon" aria-label="Foto anterior" disabled={selected === null || selected === 0} onClick={() => setSelected((n) => n === null ? null : n - 1)}><ArrowLeft /></Button>
            <p className="min-w-0 text-center text-sm">{selected !== null ? photos[selected]?.caption : ""}</p>
            <Button variant="outline" size="icon" aria-label="Próxima foto" disabled={selected === null || selected >= photos.length - 1} onClick={() => setSelected((n) => n === null ? null : n + 1)}><ArrowRight /></Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GroupCard({ room, gi, v, onAll, setEntry, onRemove, onRemoveCheck, onAddCheck }: { room: Room; gi: number; v: Inspection; onAll: (a: Answer) => void; setEntry: (k: string, p: Partial<CheckEntry>) => void; onRemove: () => void; onRemoveCheck: (ci: number) => void; onAddCheck: (c: string) => void }) {
  const g = room.groups[gi];
    if (!g) return;
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);
  const closeItem = () => {
    const el = headerRef.current;
    if (el) {
      const head = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--app-head")) || 0;
      const delta = el.getBoundingClientRect().top - head - 8;
      if (delta < 0) window.scrollBy(0, delta);
    }
    setClosing(true);
    window.setTimeout(() => { setOpen(false); setClosing(false); }, 260);
  };
  const [nc, setNc] = useState("");
  const submit = () => { const c = nc.trim(); if (!c) return; if (g.checks.includes(c)) { toast.error("Verificação já existe neste item"); return; } onAddCheck(c); setNc(""); };
  const entries = g.checks.map((_, ci) => v.entries[checkKey(room.id, gi, ci)]);
  const answers = entries.map((e) => e?.answer);
  const answered = answers.filter(Boolean).length;
  const nNao = entries.filter((e) => isApontamento(e)).length;
  const uniform = answered === g.checks.length && answers.every((a) => a === answers[0]) ? answers[0] : undefined;
  return (
    <div className="rounded-xl border border-border bg-card">
      <div ref={headerRef} className={`sticky z-[5] flex items-center gap-1 rounded-t-[11px] bg-secondary px-3 py-2 text-secondary-foreground ${open || closing ? "" : "rounded-b-[11px]"}`} style={{ top: "var(--app-head, 0px)" }}>
      <Button variant="ghost" onClick={() => setOpen((o) => !o)} className="h-auto min-w-0 flex-1 justify-start gap-2 whitespace-normal p-0 text-left text-secondary-foreground">
        <span className="flex-1 font-display text-xl font-bold uppercase">{g.item}</span>
        {nNao > 0 && <span className="inline-flex shrink-0 items-center justify-center gap-1 rounded-full bg-destructive px-2 py-1 text-center text-xs font-bold leading-none text-destructive-foreground">{nNao} {nNao === 1 ? "apontamento" : "apontamentos"}</span>}
        <span className="text-sm font-semibold">{answered}/{g.checks.length}</span>
        <ChevronDown className={`h-5 w-5 transition-transform ${open ? "rotate-180" : ""}`} />
      </Button>
      <DiscreetDelete label={`item ${g.item}`} onDelete={onRemove} />
      </div>
      {(open || closing) && (
        <div className="inspection-collapse" data-aberto={open && !closing ? "true" : "false"}>
          <div className="inspection-collapse-clip overflow-hidden rounded-b-[11px]">
        <div className="grid grid-cols-3 gap-2 border-t border-border p-2">
          {OPTS.map(({ a, label: l, icon: I, on }) => (
            <button key={a} onClick={() => onAll(a)}
              className={`flex h-10 items-center justify-center gap-1 rounded-lg border-2 px-1 text-center text-[11px] font-bold leading-tight sm:text-sm ${uniform === a ? on : "border-border bg-background"}`}>
              <I className="h-4 w-4 shrink-0" /> Todos {l}
            </button>
          ))}
        </div>
        <div className="divide-y divide-border border-t border-border">
          {g.checks.map((c, ci) => {
            const k = checkKey(room.id, gi, ci);
            return <CheckRow key={`${room.id}:${g.item}:${c}`} label={c} entry={v.entries[k] || {}} onChange={(p) => setEntry(k, p)} onRemove={() => onRemoveCheck(ci)} />;
          })}
          <div className="flex gap-2 p-2">
            <div className="relative flex-1">
              <input list={`chk-${room.id}-${gi}`} value={nc} onChange={(e) => setNc(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder="Escolha ou digite uma verificação" className="h-10 w-full rounded-lg border border-border bg-background pl-3 pr-14 text-sm" />
              <datalist id={`chk-${room.id}-${gi}`}>{ALL_CHECKS.filter((c) => !g.checks.includes(c)).map((c) => <option key={c} value={c} />)}</datalist>
              <div className="absolute inset-y-0 right-0 flex items-center">
                {nc && (
                  <button onClick={() => setNc("")} aria-label="Limpar" className="flex h-8 w-8 items-center justify-center text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                )}
                <button onClick={() => { const el = document.getElementById(`chk-${room.id}-${gi}`) as HTMLDataListElement | null; const input = el?.previousElementSibling as HTMLInputElement | null; input?.focus(); input?.showPicker?.(); }} aria-label="Abrir lista" className="flex h-8 w-8 items-center justify-center text-muted-foreground hover:text-foreground">
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
            </div>
            <button onClick={submit} className="h-10 rounded-lg bg-primary px-3 text-sm font-bold text-primary-foreground">+</button>
          </div>
          <button onClick={closeItem} aria-label={`Fechar item ${g.item}`}
            className="flex w-full items-center justify-center py-2 text-muted-foreground/70">
            <ChevronUp className="h-4 w-4" />
          </button>
        </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Summary({ v, rooms: ROOMS, onGo, setEntry }: { v: Inspection; rooms: Room[]; onGo: (s: number) => void; setEntry: (k: string, patch: Partial<CheckEntry>) => void }) {
  const candidates: { key: string; room: number; text: string; selected: boolean }[] = [];
  let pending = 0, nPhotos = 0;
  ROOMS.forEach((r, ri) => r.groups.forEach((g, gi) => g.checks.forEach((c, ci) => {
    const e = v.entries[checkKey(r.id, gi, ci)];
    if (!e?.answer) pending++;
    if (e?.answer === "nao" || isApontamento(e)) candidates.push({ key: checkKey(r.id, gi, ci), room: ri + 1, text: `${r.name} › ${g.item} › ${c}`, selected: isApontamento(e) });
    nPhotos += e?.photos?.length || 0;
  })));
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat n={candidates.filter((n) => n.selected).length} l="Apontamentos" cls="text-destructive" />
        <Stat n={pending} l="Pendentes" cls="text-secondary-foreground" />
        <Stat n={nPhotos} l="Fotos" cls="text-primary" />
      </div>
      {pending > 0 && <p className="rounded-xl bg-accent p-3 text-sm">Ainda há {pending} itens sem resposta. Você pode exportar mesmo assim.</p>}
      {candidates.length > 0 && (
        <div className="rounded-xl border-2 border-destructive/40 bg-card p-3">
          <div className="mb-1 font-bold text-destructive">Selecionar apontamentos</div>
          {candidates.map((n) => (
            <div key={n.key} className="flex items-center gap-3 py-1.5">
              <Checkbox aria-label={`Incluir como apontamento: ${n.text}`} checked={n.selected} onCheckedChange={(checked) => setEntry(n.key, { apontamento: checked === true })} />
              <Button variant="ghost" onClick={() => onGo(n.room)} className="h-auto min-w-0 flex-1 justify-start whitespace-normal px-0 text-left text-sm">{n.text}</Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
function Stat({ n, l, cls }: { n: number; l: string; cls: string }) {
  return <div className="rounded-xl border border-border bg-card p-3"><div className={`font-display text-3xl font-bold ${cls}`}>{n}</div><div className="text-xs text-muted-foreground">{l}</div></div>;
}
