import { jsPDF } from "jspdf";
import { roomsOf, checkKey, totalOf } from "./checklist";
import type { Inspection } from "./store";
import { isApontamento } from "./apontamentos";

const NAVY: [number, number, number] = [27, 42, 74];
const AMBER: [number, number, number] = [240, 180, 50];
const fmt = (d: string) => (d ? d.split("-").reverse().join("/") : "");

export function buildPdf(v: Inspection): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210, M = 12;
  let y = 0;
  const ensure = (h: number) => { if (y + h > 285) { doc.addPage(); y = 15; } };

  // Header
  doc.setFillColor(...NAVY); doc.rect(0, 0, W, 34, "F");
  doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(18);
  doc.text("CHECKLIST DE VISTORIA", M, 14);
  doc.setTextColor(...AMBER); doc.text("DE APARTAMENTO", M + 86, 14);
  doc.setTextColor(255); doc.setFontSize(9); doc.setFont("helvetica", "normal");
  doc.text(`Empreendimento: ${v.empreendimento}`, M, 23);
  doc.text(`Unidade: ${v.unidade}`, 130, 23);
  doc.text(`Data: ${fmt(v.data)}`, M, 29);
  doc.text(`Responsável: ${v.responsavel}`, 130, 29);
  y = 42;
  if (v.art) {
    doc.setTextColor(30); doc.setFontSize(9);
    doc.text(`CREA: ${v.crea || "—"}`, M, y);
    doc.text(`Número da ART: ${v.art}`, M, y + 5);
    y += 12;
  }
  if (v.endereco) { doc.setTextColor(30); doc.setFontSize(9); doc.text(`Endereço: ${v.endereco}`, M, y); y += 7; }
  const pr = v.proprietario;
  if (pr && (pr.nome || pr.cpf || pr.telefone || pr.email)) {
    doc.setTextColor(30); doc.setFontSize(9); doc.setFont("helvetica", "bold");
    doc.text("PROPRIETÁRIO", M, y); doc.setFont("helvetica", "normal");
    doc.text(`Nome: ${pr.nome || "—"}`, M, y + 5); doc.text(`CPF/CNPJ: ${pr.cpf || "—"}`, 130, y + 5);
    doc.text(`Telefone: ${pr.telefone || "—"}`, M, y + 10); doc.text(`E-mail: ${pr.email || "—"}`, 130, y + 10);
    y += 17;
  }
  const ROOMS = roomsOf(v);

  const answered = Object.values(v.entries).filter((e) => e.answer).length;
  const apontamentoList: string[] = [];

  ROOMS.forEach((room, ri) => {
    ensure(20);
    doc.setFillColor(...NAVY); doc.rect(M, y, W - 2 * M, 8, "F");
    doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(11);
    doc.text(`${ri + 1}. ${room.name.toUpperCase()}`, M + 2, y + 5.6);
    y += 8;
    doc.setFillColor(...AMBER); doc.rect(M, y, W - 2 * M, 6, "F");
    doc.setTextColor(...NAVY); doc.setFontSize(8);
    doc.text("ITEM", M + 2, y + 4); doc.text("O QUE VERIFICAR", M + 42, y + 4);
    doc.setFontSize(6);
    doc.text("CONFORME", M + 76, y + 4); doc.text("NÃO CONFORME", M + 91, y + 4); doc.text("N/A", M + 111, y + 4);
    doc.setFontSize(8);
    doc.text("OBSERVAÇÃO", M + 130, y + 4);
    y += 6;
    room.groups.forEach((g, gi) => {
      g.checks.forEach((c, ci) => {
        const e = v.entries[checkKey(room.id, gi, ci)] || {};
        const obs = doc.splitTextToSize(e.obs || "", 56) as string[];
        const h = Math.max(5, obs.length * 3.5 + 1.5);
        ensure(h);
        doc.setDrawColor(210); doc.line(M, y + h, W - M, y + h);
        doc.setFont("helvetica", ci === 0 ? "bold" : "normal"); doc.setTextColor(30); doc.setFontSize(7.5);
        if (ci === 0) doc.text(g.item, M + 2, y + 3.6);
        doc.setFont("helvetica", "normal"); doc.text(c, M + 42, y + 3.6);
        const box = (x: number, on: boolean, col: [number, number, number]) => {
          doc.setDrawColor(120); doc.rect(x, y + 1, 3, 3);
          if (on) { doc.setFillColor(...col); doc.rect(x, y + 1, 3, 3, "F"); }
        };
        box(M + 81, e.answer === "sim", [40, 140, 80]);
        box(M + 98, e.answer === "nao", [200, 50, 40]);
        box(M + 111, e.answer === "na", [130, 130, 130]);
        if (obs.length) doc.text(obs, M + 130, y + 3.6);
        if (isApontamento(e)) apontamentoList.push(`${room.name} › ${g.item} › ${c}${e.obs ? ` — ${e.obs}` : ""}`);
        y += h;
      });
    });
    y += 4;
  });

  // Observações gerais
  ensure(40);
  doc.setFillColor(...NAVY); doc.rect(M, y, W - 2 * M, 8, "F");
  doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(11);
  doc.text("7. OBSERVAÇÕES GERAIS DA VISTORIA", M + 2, y + 5.6); y += 13;
  doc.setTextColor(30); doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  doc.text(`Itens verificados: ${answered} de ${totalOf(v)}  •  Apontamentos: ${apontamentoList.length}`, M, y); y += 6;
  const write = (t: string) => {
    (doc.splitTextToSize(t, W - 2 * M) as string[]).forEach((l) => { ensure(5); doc.text(l, M, y); y += 4.5; });
  };
  if (v.obsGerais) write(v.obsGerais);
  y += 2;
  doc.setFont("helvetica", "bold"); ensure(6); doc.text("Apontamentos encontrados:", M, y); y += 5;
  doc.setFont("helvetica", "normal");
  const ap = [...v.apontamentos.filter(Boolean), ...apontamentoList];
  if (!ap.length) write("Nenhum apontamento.");
  ap.forEach((a, i) => write(`${i + 1}. ${a}`));

  // Fotos
  const photos: { label: string; data: string; caption: string }[] = [];
  ROOMS.forEach((room) => room.groups.forEach((g, gi) => g.checks.forEach((c, ci) => {
    (v.entries[checkKey(room.id, gi, ci)]?.photos || []).forEach((p) =>
      photos.push({ label: `${room.name} › ${g.item} › ${c}`, data: p.data, caption: p.caption }));
  })));
  if (photos.length) {
    doc.addPage(); y = 15;
    doc.setFillColor(...NAVY); doc.rect(M, y, W - 2 * M, 8, "F");
    doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(11);
    doc.text("REGISTRO FOTOGRÁFICO", M + 2, y + 5.6); y += 12;
    const cw = (W - 2 * M - 6) / 2, ih = 62;
    photos.forEach((p, i) => {
      const col = i % 2;
      if (col === 0) ensure(ih + 14);
      const x = M + col * (cw + 6);
      try {
        const props = doc.getImageProperties(p.data);
        const r = Math.min(cw / props.width, ih / props.height);
        const w = props.width * r, h = props.height * r;
        doc.addImage(p.data, "JPEG", x + (cw - w) / 2, y, w, h);
      } catch { /* ignore broken image */ }
      doc.setTextColor(30); doc.setFontSize(7.5); doc.setFont("helvetica", "bold");
      doc.text(doc.splitTextToSize(`${i + 1}. ${p.label}`, cw) as string[], x, y + ih + 4);
      if (p.caption) { doc.setFont("helvetica", "normal"); doc.text(doc.splitTextToSize(p.caption, cw)[0] as string, x, y + ih + 8); }
      if (col === 1 || i === photos.length - 1) y += ih + 13;
    });
  }

  // Assinatura
  ensure(45); y += 6;
  if (v.signature) doc.addImage(v.signature, "PNG", M, y, 70, 25);
  y += 27;
  doc.setDrawColor(60); doc.line(M, y, M + 80, y);
  doc.setFontSize(9); doc.setTextColor(30); doc.setFont("helvetica", "normal");
  doc.text(`Responsável pela vistoria: ${v.responsavel}`, M, y + 5);
  doc.text(`CREA: ${v.crea || "—"}`, M + 100, y + 5);
  doc.text(`Data: ${fmt(v.data)}`, M + 150, y + 5);

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i); doc.setFontSize(7); doc.setTextColor(140);
    doc.text(`${v.empreendimento} — Unidade ${v.unidade}   •   Página ${i}/${pages}`, M, 292);
  }
  return doc;
}

/** Return a preview without navigating away from the application. */
export async function exportPdf(v: Inspection) {
  const doc = buildPdf(v);
  const name = `vistoria-${(v.empreendimento || "obra").replace(/\W+/g, "-")}-${v.unidade || ""}.pdf`;
  const blob = doc.output("blob");
  return { url: URL.createObjectURL(blob), name, file: new File([blob], name, { type: "application/pdf" }) };
}
