import type { RoomRef } from "./checklist";
import { listVistorias, getVistoria, saveVistoria, deleteVistoria } from "./vistorias.functions";
import { createAutosaveQueue } from "./autosave";

export type Answer = "sim" | "nao" | "na";
export type Photo = { id: string; data: string; caption: string };
export type CheckEntry = { answer?: Answer | undefined; obs?: string; photos?: Photo[]; apontamento?: boolean };
export type Inspection = {
  id: string;
  tipoImovel?: "apartamento" | "casa";
  empreendimento: string;
  unidade: string;
  endereco?: string;
  data: string;
  responsavel: string;
  crea: string;
  art?: string;
  proprietario?: { nome: string; cpf: string; telefone: string; email: string };
  rooms?: RoomRef[];
  entries: Record<string, CheckEntry>;
  obsGerais: string;
  apontamentos: string[];
  signature?: string | undefined;
  status: "andamento" | "concluida";
  createdAt: number;
  updatedAt: number;
};

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

const draftPrefix = "vo:inspection-draft:";
const queues = new Map<string, ReturnType<typeof createAutosaveQueue<Inspection>>>();

function readDraft(id: string): Inspection | undefined {
  try {
    const raw = localStorage.getItem(draftPrefix + id);
    const draft = raw ? JSON.parse(raw) as Inspection : undefined;
    return draft?.id === id ? draft : undefined;
  } catch { return undefined; }
}

export async function listInspections(): Promise<Inspection[]> {
  const drafts: Inspection[] = [];
  for (let n = 0; n < localStorage.length; n++) {
    const key = localStorage.key(n);
    if (!key?.startsWith(draftPrefix)) continue;
    const draft = readDraft(key.slice(draftPrefix.length));
    if (draft) drafts.push(draft);
  }
  const remote = await listVistorias().catch((error) => {
    if (!drafts.length) throw error;
    return [];
  }) as Inspection[];
  const merged = new Map(remote.map((row) => [row.id, row]));
  drafts.forEach((draft) => merged.set(draft.id, draft));
  return [...merged.values()].sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getInspection(id: string): Promise<Inspection | undefined> {
  const draft = readDraft(id);
  if (draft) {
    void saveInspection(draft).catch(() => undefined);
    return draft;
  }
  return ((await getVistoria({ data: { id } })) as Inspection | null) ?? undefined;
}

export function saveInspection(i: Inspection): Promise<void> {
  const snapshot = { ...i, updatedAt: Date.now() };
  // Save synchronously before starting a request: closing the screen cannot cancel this copy.
  try { localStorage.setItem(draftPrefix + i.id, JSON.stringify(snapshot)); }
  catch { /* A successful cloud save still protects data when device storage is full. */ }
  let queue = queues.get(i.id);
  if (!queue) {
    queue = createAutosaveQueue<Inspection>(async (data) => {
      await saveVistoria({ data: { id: data.id, data } });
      try {
        if (localStorage.getItem(draftPrefix + data.id) === JSON.stringify(data)) {
          localStorage.removeItem(draftPrefix + data.id);
        }
      } catch { /* Cloud save succeeded. */ }
    });
    queues.set(i.id, queue);
  }
  return queue(snapshot);
}

export async function deleteInspection(id: string) {
  await deleteVistoria({ data: { id } });
  localStorage.removeItem(draftPrefix + id);
}

/** Reduce photo size so storage and PDF stay light. */
export function compressImage(file: File, max = 1280, q = 0.65): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) { reject(new Error("Selecione uma imagem.")); return; }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * s);
      c.height = Math.round(img.height * s);
      const ctx = c.getContext("2d");
      if (!ctx) { URL.revokeObjectURL(url); reject(new Error("Não foi possível processar a foto.")); return; }
      ctx.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      const data = c.toDataURL("image/jpeg", q);
      c.width = 0;
      c.height = 0;
      img.src = "";
      resolve(data);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Não foi possível ler a imagem.")); };
    img.src = url;
  });
}
