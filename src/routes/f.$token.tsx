import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { FORMS, key, ruleFor } from "@/lib/forms";
import { getFormulario, enviarFormulario } from "@/lib/formularios.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { otherDetailsError } from "@/lib/form-validation";
import { useServerFn } from "@tanstack/react-start";

export const Route = createFileRoute("/f/$token")({
  loader: ({ params }) => getFormulario({ data: { token: params.token } }),
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Formulário do cliente – Eng. Mariana Nunes" },
      { name: "description", content: "Preencha seus dados para a vistoria ou projeto." },
      { property: "og:title", content: "Formulário do cliente" },
      { property: "og:description", content: "Preencha seus dados para a vistoria ou projeto." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Page,
});

function Page() {
  const row = Route.useLoaderData();
  const { token } = Route.useParams();
  const [vals, setVals] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  const [sending, setSending] = useState(false);
  const send = useServerFn(enviarFormulario);

  if (!row) return <Box>Link inválido.</Box>;
  if (row.status !== "pendente" || done)
    return done ? <Confirmado /> : <Box>Este formulário já foi enviado.</Box>;
  const def = FORMS[row.tipo];
  if (!def) return <Box>Link inválido.</Box>;
  const set = (k: string, v: string) => setVals((p) => ({ ...p, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!row) return;
    const detailError = otherDetailsError(row.tipo, vals);
    if (detailError) { alert(detailError); return; }
    setSending(true);
    try {
      const r = await send({ data: { token, respostas: vals } });
      if (r.ok) setDone(true);
      else alert("error" in r ? r.error : "Não foi possível enviar. Tente novamente.");
    } catch { alert("Não foi possível enviar. Tente novamente."); }
    finally { setSending(false); }
  }

  return (
    <main className="mx-auto max-w-2xl p-4 pb-16">
      <header className="sticky top-0 z-20 border-b border-border bg-background py-3">
      <h1 className="text-2xl font-bold text-primary">{def.titulo}</h1>
      <p className="mt-1 text-muted-foreground">Cliente: {row.cliente_nome}</p>
      </header>
      <form onSubmit={submit} className="mt-6 space-y-6">
        {def.sections.map((s, si) => (
          <section key={si} className="rounded-xl border bg-card p-4 space-y-3">
            <h2 className="font-semibold">{s.title}</h2>
            {s.note && <p className="text-sm text-muted-foreground">{s.note}</p>}
            {s.fields.map((f) => {
              const k = key(si + 1, f.label);
              return (
                <label key={k} className="block text-sm">
                  <span>{f.label}{f.required && " *"}</span>
                  {f.type === "textarea" ? (
                    <Textarea className="mt-1" maxLength={1000} value={vals[k] ?? ""} onChange={(e) => set(k, e.target.value.slice(0, 1000))} />
                  ) : f.type === "radio" ? (
                    <div className="mt-1 flex flex-wrap gap-3">
                      {[...(f.options ?? []), ...(f.outro ? ["Outro"] : [])].map((o) => (
                        <span key={o} className="flex items-center gap-1">
                          <input type="radio" name={k} required={f.required} checked={(vals[k] ?? "").split(":")[0] === o} onChange={() => set(k, o)} /> {o}
                        </span>
                      ))}
                      {f.outro && (vals[k] ?? "").startsWith("Outro") && (
                        <Input placeholder="Qual?" aria-label={`Outro: ${f.label}`} required pattern=".*\S.*" title="Preencha os detalhes de Outro." maxLength={60} value={(vals[k] ?? "").slice(7)} onChange={(e) => set(k, "Outro: " + e.target.value.slice(0, 60))} />
                      )}
                    </div>
                  ) : (
                    (() => {
                      const r = ruleFor(f);
                      return (
                        <Input
                          className="mt-1"
                          type={r.inputType}
                          inputMode={r.inputMode}
                          maxLength={r.maxLength}
                          placeholder={r.placeholder}
                          min={r.min}
                          max={r.max}
                          pattern={r.pattern}
                          title={r.title}
                          required={f.required}
                          value={vals[k] ?? ""}
                          onChange={(e) => set(k, r.format(e.target.value))}
                        />
                      );
                    })()
                  )}
                </label>
              );
            })}
          </section>
        ))}
        <Button type="submit" size="lg" className="w-full" disabled={sending}>{sending ? "Enviando..." : "Enviar formulário"}</Button>
      </form>
    </main>
  );
}

function Confirmado() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-5 p-6 text-center">
      <img src="/check-success.avif" alt="Enviado com sucesso" className="h-48 w-auto max-w-full" />
      <p className="text-lg font-medium">Obrigado! Seus dados foram enviados com sucesso.</p>
      <div className="text-sm text-muted-foreground">
        <p className="whitespace-nowrap font-semibold text-foreground">Atenciosamente, Mariana</p>
        <p>CREA 5071270454-SP</p>
      </div>
    </main>
  );
}

function Box({ children }: { children: React.ReactNode }) {
  return <main className="flex min-h-screen items-center justify-center p-6 text-center text-lg">{children}</main>;
}
