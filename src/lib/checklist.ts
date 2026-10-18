export type Group = { item: string; checks: string[] };
export type Room = { id: string; name: string; groups: Group[] };

const paredes: Group = { item: "Paredes", checks: ["Pintura", "Trincas/fissuras", "Manchas/sujeira", "Ondas/irregularidades", "Respingos"] };
const pisoContra: Group = { item: "Piso/Contrapiso", checks: ["Trincas", "Peças ocas", "Tonalidade diferente", "Desnivelamento", "Desplacamento", "Nivelamento"] };
const porta: Group = { item: "Porta", checks: ["Funcionamento", "Alinhamento", "Batente", "Guarnições/acabamento", "Fechadura"] };
const janela: Group = { item: "Janela", checks: ["Funcionamento", "Vidros", "Esquadria", "Pingadeira", "Vedação", "Acabamento do vão"] };
const teto: Group = { item: "Teto", checks: ["Pintura", "Trincas/fissuras", "Manchas/infiltração"] };
const eletrica: Group = { item: "Instalações elétricas", checks: ["Tomadas", "Interruptores", "Funcionamento", "Acabamento"] };
const ralo: Group = { item: "Ralo", checks: ["Limpo", "Trincas/quebras", "Esquadro/alinhamento", "Bem assentado", "Acabamento", "Caimento para o ralo"] };
const azulejo: Group = { item: "Azulejo/Revestimento", checks: ["Trincas", "Peças ocas", "Desplacamento", "Tonalidade diferente", "Alinhamento/nivelamento"] };
const rejunte: Group = { item: "Rejunte", checks: ["Acabamento de rejunte", "Falhas/fissuras", "Completo e bem feito"] };
const registro: Group = { item: "Registro de água", checks: ["Funcionamento", "Acabamento", "Vazamentos"] };
const pisoMolhado = (extra = false): Group => ({
  item: "Piso",
  checks: ["Trincas", "Peças ocas", "Tonalidade diferente", "Desnivelamento", "Desplacamento", "Nivelamento", ...(extra ? ["Caimento para o ralo"] : [])],
});

export const ROOMS: Room[] = [
  { id: "cozinha", name: "Cozinha", groups: [ralo, pisoMolhado(), azulejo, rejunte, registro,
    { item: "Pia", checks: ["Nivelamento", "Torneira funcionando", "Sifão", "Vazamentos", "Acabamento"] },
    { item: "Bancada", checks: ["Nivelamento", "Trincas/quebras", "Acabamento das bordas", "Vedação junto à parede/cuba"] }] },
  { id: "servico", name: "Área de Serviço", groups: [ralo, pisoMolhado(true), azulejo, rejunte,
    { item: "Tanque", checks: ["Trincas/quebras", "Nivelamento", "Torneira funcionando", "Sifão", "Vazamentos", "Acabamento"] }, registro] },
  { id: "sala", name: "Sala", groups: [paredes, pisoContra, porta, janela, teto, eletrica] },
  { id: "quarto1", name: "Quarto 1", groups: [paredes, pisoContra, porta, janela, teto, eletrica] },
  { id: "quarto2", name: "Quarto 2", groups: [paredes, pisoContra, porta, janela, teto, eletrica] },
  { id: "banheiro", name: "Banheiro", groups: [pisoMolhado(true), ralo, { ...azulejo, item: "Revestimento (Azulejo)" }, rejunte,
    { item: "Vaso sanitário", checks: ["Trincas/quebras", "Fixação", "Nivelamento", "Descarga funcionando", "Vazamentos", "Acabamento"] },
    { item: "Pia/Lavatório", checks: ["Trincas/quebras", "Nivelamento", "Torneira funcionando", "Sifão", "Vazamentos", "Acabamento"] },
    registro, paredes, teto, janela, eletrica] },
];

const varanda: Group = { item: "Guarda-corpo", checks: ["Fixação", "Altura adequada", "Acabamento", "Vidros/oxidação"] };

/** Tipos de ambiente que podem ser adicionados à vistoria. */
export const TEMPLATES: Room[] = [
  ...ROOMS.filter((r) => !r.id.startsWith("quarto2")).map((r) => (r.id === "quarto1" ? { ...r, id: "quarto", name: "Quarto" } : r)),
  { id: "varanda", name: "Varanda", groups: [paredes, pisoMolhado(true), ralo, porta, varanda, eletrica] },
  { id: "privativa", name: "Área Privativa", groups: [paredes, pisoMolhado(true), ralo, porta, varanda, eletrica,
    { item: "Tanque", checks: ["Trincas/quebras", "Nivelamento", "Torneira funcionando", "Sifão", "Vazamentos", "Acabamento"] },
    { item: "Concreto", checks: ["Trincas/fissuras", "Nivelamento", "Caimento", "Acabamento"] },
    { item: "Grama", checks: ["Cobertura uniforme", "Falhas/áreas secas", "Nivelamento do solo", "Drenagem"] }] },
  { id: "corredor", name: "Corredor/Hall", groups: [paredes, pisoContra, teto, eletrica] },
  { id: "lavabo", name: "Lavabo", groups: [pisoMolhado(), azulejo, rejunte,
    { item: "Vaso sanitário", checks: ["Trincas/quebras", "Fixação", "Descarga funcionando", "Vazamentos"] },
    { item: "Pia/Lavatório", checks: ["Torneira funcionando", "Sifão", "Vazamentos", "Acabamento"] }, porta, eletrica] },
  { id: "escritorio", name: "Escritório", groups: [paredes, pisoContra, porta, janela, teto, eletrica] },
  { id: "garagem", name: "Garagem", groups: [{ ...pisoContra, item: "Piso" }, paredes, eletrica] },
];

export type RoomRef = { id: string; name: string; type: string; customGroups?: Group[]; removedItems?: string[]; removedChecks?: Record<string, string[]>; extraChecks?: Record<string, string[]> };
export const DEFAULT_ROOMS: RoomRef[] = ROOMS.map((r) => ({ id: r.id, name: r.name, type: r.id.startsWith("quarto") ? "quarto" : r.id }));
export const resolveRoom = (ref: RoomRef): Room => {
  const t = ref.type === "custom" ? undefined : TEMPLATES.find((x) => x.id === ref.type) || TEMPLATES[0];
  const base = (t?.groups ?? []).filter((g) => !ref.removedItems?.includes(g.item));
  const ex = ref.extraChecks ?? {};
  return { id: ref.id, name: ref.name, groups: [...base, ...(ref.customGroups ?? [])].map((g) => ({ ...g, checks: [...g.checks, ...(ex[g.item] ?? []).filter((c) => !g.checks.includes(c))].filter((c) => !ref.removedChecks?.[g.item]?.includes(c)) })) };
};
export const roomsOf = (v: { rooms?: RoomRef[] }) => (v.rooms ?? DEFAULT_ROOMS).map(resolveRoom);
export const totalOf = (v: { rooms?: RoomRef[] }) => roomsOf(v).reduce((a, r) => a + roomTotal(r), 0);

export const checkKey = (roomId: string, gi: number, ci: number) => `${roomId}:${gi}:${ci}`;
export const roomTotal = (r: Room) => r.groups.reduce((a, g) => a + g.checks.length, 0);
export const TOTAL = ROOMS.reduce((a, r) => a + roomTotal(r), 0);

export const ALL_CHECKS = [...new Set(TEMPLATES.concat(ROOMS).flatMap((r) => r.groups.flatMap((g) => g.checks)))].sort();
