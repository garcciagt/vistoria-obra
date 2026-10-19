// src/lib/email-formulario.server.ts
// Server-only: sends form responses by email when a client submits a form.

import { FORMS, key } from "@/lib/forms";

type SendParams = {
  clienteNome: string;
  tipo: string;
  respostas: Record<string, string>;
  destinatario: string;
};

export async function enviarEmailFormulario({ clienteNome, tipo, respostas, destinatario }: SendParams) {
  const apiKey = process.env["RESEND_API_KEY"];
  const destino = destinatario;
  if (!apiKey) { console.warn("[email] RESEND_API_KEY not set — skipping email"); return; }

  const def = FORMS[tipo];
  if (!def) return;

  const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] ?? c));

  const secoes = def.sections.map((s, si) => {
    const campos = s.fields.map((f) => {
      const k = key(si + 1, f.label);
      const v = respostas[k] ?? "";
      return `<tr><td style="padding:6px 10px;border:1px solid #ddd;font-weight:600;width:40%;vertical-align:top">${esc(f.label)}</td><td style="padding:6px 10px;border:1px solid #ddd">${v ? esc(v) : '<span style="color:#999">—</span>'}</td></tr>`;
    }).join("");
    return `<h2 style="margin:24px 0 8px;font-size:15px;color:#1a56db">${esc(s.title)}</h2><table style="width:100%;border-collapse:collapse;font-size:13px">${campos}</table>`;
  }).join("");

  const html = `
<!doctype html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;margin:0;padding:20px;color:#222">
  <div style="max-width:600px;margin:0 auto">
    <h1 style="font-size:18px;color:#1a56db;margin-bottom:4px">${esc(def.titulo)}</h1>
    <p style="color:#666;margin:0 0 20px">Cliente: <b>${esc(clienteNome)}</b> — ${new Date().toLocaleDateString("pt-BR")} ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
    ${secoes}
    <p style="margin-top:24px;font-size:12px;color:#999">Enviado automaticamente pelo sistema de formulários.</p>
  </div>
</body></html>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Formulários <onboarding@resend.dev>",
        to: [destino],
        subject: `📋 ${def.titulo} — ${clienteNome}`,
        html,
      }),
    });
    if (!res.ok) console.error("[email] Resend error:", await res.text());
  } catch (err) { console.error("[email] Failed to send:", err); }
}
