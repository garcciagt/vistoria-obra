export type Field = { label: string; type?: "text" | "date" | "email" | "textarea" | "radio"; options?: string[]; outro?: boolean; required?: boolean };
export type Section = { title: string; note?: string; fields: Field[] };
export type FormDef = { titulo: string; sections: Section[] };

const sim = ["Sim", "Não"];
const pessoa = (req: boolean, extra: Field[] = []): Field[] => [
  { label: "Nome completo", required: req },
  { label: "CPF", required: req },
  { label: "RG" },
  { label: "Data de nascimento", type: "date" },
  ...extra,
  { label: "Telefone/WhatsApp", required: req },
  { label: "E-mail", type: "email", required: req },
];
const endereco: Field[] = ["Rua/Avenida", "Número", "Complemento", "Bairro", "Cidade", "CEP"].map((l) => ({ label: l }));

export const FORMS: Record<string, FormDef> = {
  vistoria: {
    titulo: "Dados para Vistoria Técnica de Entrega de Apartamento",
    sections: [
      { title: "Proprietário(a) 1 – para emissão da ART", fields: pessoa(true, [{ label: "Endereço atual" }, { label: "CEP" }, { label: "Cidade" }]) },
      { title: "Proprietário(a) 2 – caso haja", note: "Caso o imóvel possua mais de um proprietário, informe os dados de todos para emissão da ART.", fields: pessoa(false, [{ label: "Endereço atual" }]) },
      { title: "Tipo de imóvel", fields: [{ label: "Tipo de imóvel", type: "radio", options: ["Apartamento", "Casa"], required: true }] },
      { title: "Dados do imóvel", fields: ["Nome do empreendimento/condomínio", "Nome da construtora", "Endereço completo", "Número", "Complemento", "Bairro", "Cidade", "CEP", "Bloco/Torre", "Número do apartamento", "Andar", "Área aproximada do imóvel (m²), se souber"].map((l) => ({ label: l })) },
      { title: "Entrega das chaves", fields: [{ label: "Data", type: "date" }, { label: "Horário" }, { label: "Já recebeu as chaves?", type: "radio", options: sim }] },
      { title: "Informações para a vistoria", fields: [
        { label: "O imóvel possui piso?", type: "radio", options: sim },
        { label: "Se sim, o piso está instalado", type: "radio", options: ["Em todos os cômodos", "Somente nas áreas molhadas"], outro: true },
        { label: "O empreendimento informou limite de pessoas para acompanhar a vistoria?", type: "radio", options: sim },
        { label: "Se sim, quantas pessoas são permitidas?" },
      ] },
      { title: "Acesso ao imóvel – quem acompanhará a vistoria", fields: [{ label: "Nome" }, { label: "Telefone/WhatsApp" }, { label: "Relação com o proprietário", type: "radio", options: ["Proprietário(a)", "Cônjuge", "Familiar", "Procurador(a)"], outro: true }] },
      { title: "Observações importantes", fields: [{ label: "Informações importantes sobre o imóvel, empreendimento ou entrega", type: "textarea" }, { label: "Você confirma que todos os dados estão corretos?", type: "radio", options: sim, required: true }] },
    ],
  },
  projeto: {
    titulo: "Dados do Cliente para Elaboração de Projeto Arquitetônico",
    sections: [
      { title: "Proprietário(a) 1", fields: [...pessoa(true), ...endereco] },
      { title: "Proprietário(a) 2 – caso haja", note: "Caso o terreno possua mais de um proprietário, informe os dados de todos.", fields: [...pessoa(false), ...endereco] },
      { title: "Dados do terreno / obra", fields: ["Endereço completo do terreno", "Número", "Bairro", "Cidade", "CEP", "Lote", "Quadra", "Inscrição municipal do imóvel", "Área total do terreno (m²)", "Medida da frente do terreno (m)", "Medida do comprimento do terreno (m)", "Raio/Esquina", "Área construída (m²)"].map((l) => ({ label: l })) },
      { title: "Informações da construção", fields: [
        { label: "Finalidade da construção", type: "radio", options: ["Residencial", "Comercial", "Mista"], outro: true },
        { label: "Tipo de construção", type: "radio", options: ["Casa térrea", "Sobrado", "Edificação comercial"], outro: true },
      ] },
      { title: "Observações e confirmação", fields: [{ label: "Alguma informação importante sobre o terreno ou a construção?", type: "textarea" }, { label: "Você confirma que todas as informações estão corretas?", type: "radio", options: sim, required: true }] },
    ],
  },
  contrato: {
    titulo: "Dados para Geração de Contrato de Vistoria Técnica",
    sections: [
      { title: "Dados do contratante", fields: [
        { label: "Nome completo", required: true },
        { label: "CPF", required: true },
        { label: "RG" },
        { label: "Data de nascimento", type: "date" },
        { label: "Endereço completo", required: true },
        { label: "Número" },
        { label: "Bairro" },
        { label: "Cidade" },
        { label: "Telefone/WhatsApp", required: true },
        { label: "E-mail", type: "email", required: true },
      ] },
      { title: "Dados do imóvel", fields: [
        { label: "Tipo de imóvel", type: "radio", options: ["Apartamento", "Casa"], required: true },
        { label: "Nome do empreendimento/condomínio" },
        { label: "Nome da construtora" },
        { label: "Endereço completo do imóvel", required: true },
        { label: "Número" },
        { label: "Bairro" },
        { label: "Cidade" },
        { label: "CEP" },
        { label: "Bloco/Torre" },
        { label: "Número do apartamento" },
        { label: "Andar" },
        { label: "Área aproximada do imóvel (m²), se souber" },
      ] },
      { title: "Data e horário da vistoria", fields: [
        { label: "Data", type: "date", required: true },
        { label: "Horário", required: true },
      ] },
      { title: "Informações adicionais", fields: [
        { label: "O imóvel possui piso?", type: "radio", options: ["Sim", "Não"] },
        { label: "Se sim, o piso está instalado", type: "radio", options: ["Em todos os cômodos", "Somente nas áreas molhadas"], outro: true },
        { label: "Limite de pessoas para acompanhar a vistoria?", type: "radio", options: ["Sim", "Não"] },
        { label: "Se sim, quantas pessoas são permitidas?" },
      ] },
      { title: "Quem acompanhará a vistoria", fields: [
        { label: "Nome" },
        { label: "Telefone/WhatsApp" },
        { label: "Relação com o proprietário", type: "radio", options: ["Proprietário(a)", "Cônjuge", "Familiar", "Procurador(a)"], outro: true },
      ] },
      { title: "Observações e confirmação", fields: [
        { label: "Informações importantes sobre o imóvel ou a vistoria", type: "textarea" },
        { label: "Você confirma que todas as informações estão corretas?", type: "radio", options: ["Sim", "Não"], required: true },
      ] },
    ],
  },
};

export const key = (s: number, f: string) => `${s}. ${f}`;

// ---- Regras de preenchimento por campo ----
export type Rule = {
  inputType: string;
  inputMode?: "text" | "numeric" | "decimal" | "tel" | "email";
  maxLength?: number;
  placeholder?: string;
  min?: string;
  max?: string;
  pattern?: string;
  title?: string;
  format: (v: string) => string;
};

const digits = (v: string) => v.replace(/\D/g, "");
const mask = (pattern: string) => (v: string) => {
  const d = digits(v);
  let out = "";
  let i = 0;
  for (const c of pattern) {
    if (i >= d.length) break;
    if (c === "0") out += d[i++];
    else out += c;
  }
  return out;
};
const phone = (v: string) => {
  const d = digits(v).slice(0, 11);
  if (d.length <= 10) return mask("(00) 0000-0000")(d);
  return mask("(00) 00000-0000")(d);
};
const only = (re: RegExp, max: number) => (v: string) => v.replace(re, "").slice(0, max);
const decimal = (v: string) => {
  let s = v.replace(/\./g, ",").replace(/[^\d,]/g, "");
  const [a = "", ...b] = s.split(",");
  s = b.length ? `${a.slice(0, 7)},${b.join("").slice(0, 2)}` : a.slice(0, 7);
  return s;
};
const LETTERS = /[^A-Za-zÀ-ÖØ-öø-ÿ' .-]/g;

export function ruleFor(f: Field): Rule {
  const l = f.label.toLowerCase();
  if (f.type === "date")
    return { inputType: "date", min: "1900-01-01", max: "2100-12-31", format: (v) => v.slice(0, 10) };
  if (f.type === "email")
    return { inputType: "email", inputMode: "email", maxLength: 120, placeholder: "nome@exemplo.com", format: (v) => v.replace(/\s/g, "").slice(0, 120) };
  if (l === "cpf")
    return { inputType: "text", inputMode: "numeric", maxLength: 14, placeholder: "000.000.000-00", pattern: "\\d{3}\\.\\d{3}\\.\\d{3}-\\d{2}", title: "CPF com 11 dígitos", format: mask("000.000.000-00") };
  if (l === "cep")
    return { inputType: "text", inputMode: "numeric", maxLength: 9, placeholder: "00000-000", pattern: "\\d{5}-\\d{3}", title: "CEP com 8 dígitos", format: mask("00000-000") };
  if (l === "rg")
    return { inputType: "text", maxLength: 14, placeholder: "Somente números", format: (v) => v.toUpperCase().replace(/[^0-9X]/g, "").slice(0, 14) };
  if (l.includes("telefone"))
    return { inputType: "tel", inputMode: "tel", maxLength: 15, placeholder: "(00) 00000-0000", pattern: "\\(\\d{2}\\) \\d{4,5}-\\d{4}", title: "Telefone com DDD", format: phone };
  if (l.includes("horário"))
    return { inputType: "time", format: (v) => v.slice(0, 5) };
  if (l.includes("quantas pessoas") || l === "andar")
    return { inputType: "text", inputMode: "numeric", maxLength: 3, format: only(/\D/g, 3) };
  if (l.includes("(m²)") || l.includes("(m)"))
    return { inputType: "text", inputMode: "decimal", maxLength: 10, placeholder: "0,00", format: decimal };
  if (l === "número")
    return { inputType: "text", maxLength: 8, placeholder: "Ex.: 123 ou S/N", format: (v) => v.toUpperCase().replace(/[^0-9A-Z/ -]/g, "").slice(0, 8) };
  if (["lote", "quadra", "bloco/torre", "número do apartamento"].includes(l))
    return { inputType: "text", maxLength: 10, format: (v) => v.toUpperCase().replace(/[^0-9A-Z -]/g, "").slice(0, 10) };
  if (l.includes("inscrição municipal"))
    return { inputType: "text", maxLength: 30, format: (v) => v.replace(/[^0-9A-Za-z./-]/g, "").slice(0, 30) };
  if (l.startsWith("nome completo") || l === "nome")
    return { inputType: "text", maxLength: 120, format: (v) => v.replace(LETTERS, "").slice(0, 120) };
  if (l === "cidade" || l === "bairro")
    return { inputType: "text", maxLength: 80, format: (v) => v.replace(LETTERS, "").slice(0, 80) };
  return { inputType: "text", maxLength: 150, format: (v) => v.slice(0, 150) };
}
