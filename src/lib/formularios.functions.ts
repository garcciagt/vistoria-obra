import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { submissionSchema, otherDetailsError } from "@/lib/form-validation";

// ---- Funções públicas (cliente preenche sem login) ----

export const getFormulario = createServerFn({ method: "GET" })
  .inputValidator((d: { token: string }) => d)
  .handler(async ({ data }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: row, error } = await supabaseAdmin
        .from("formularios")
        .select("tipo, cliente_nome, status")
        .eq("token", data.token)
        .maybeSingle();
      if (error) console.error(error);
      return row ?? null;
    } catch (err) {
      console.error(err);
      return null;
    }
  });

export const enviarFormulario = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; respostas: Record<string, string> }) => submissionSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: form, error: readError } = await supabaseAdmin
        .from("formularios")
        .select("tipo, cliente_nome, user_id")
        .eq("token", data.token)
        .eq("status", "pendente")
        .maybeSingle();
      if (readError || !form) return { ok: false, error: "Formulário indisponível." };
      const detailError = otherDetailsError(form.tipo, data.respostas);
      if (detailError) return { ok: false, error: detailError };
      const { data: row, error } = await supabaseAdmin
        .from("formularios")
        .update({ respostas: data.respostas, status: "preenchido", submitted_at: new Date().toISOString() })
        .eq("token", data.token)
        .eq("status", "pendente")
        .select("id")
        .maybeSingle();
      if (error || !row) return { ok: false };
      // Send email with form responses to the user who created the form
      (async () => {
        try {
          const { data: userData } = await supabaseAdmin.auth.admin.getUserById(form.user_id);
          const userEmail = userData?.user?.email;
          if (!userEmail) { console.warn("[email] user email not found"); return; }
          const { enviarEmailFormulario } = await import("@/lib/email-formulario.server");
          await enviarEmailFormulario({ clienteNome: form.cliente_nome, tipo: form.tipo, respostas: data.respostas, destinatario: userEmail });
        } catch (err) { console.error("[email] error:", err); }
      })();
      return { ok: true };
    } catch (err) {
      console.error(err);
      return { ok: false };
    }
  });

// ---- Funções protegidas (painel do profissional, com login) ----

export const listarFormularios = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("formularios")
      .select("id, token, tipo, cliente_nome, status, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) {
      console.error(error);
      return [];
    }
    return data;
  });

export const getRespostasFormulario = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("formularios")
      .select("respostas")
      .eq("id", data.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) console.error(error);
    return (row?.respostas ?? null) as Record<string, string> | null;
  });

export const criarFormulario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { cliente_nome: string; tipo: string }) => {
    const nome = d.cliente_nome.trim().slice(0, 120);
    if (!nome) throw new Error("Nome obrigatório");
    if (!["vistoria_apto", "vistoria_casa", "projeto", "contrato"].includes(d.tipo)) throw new Error("Tipo inválido");
    return { cliente_nome: nome, tipo: d.tipo };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("formularios")
      .insert({ ...data, user_id: userId });
    if (error) {
      console.error(error);
      return { ok: false };
    }
    return { ok: true };
  });

export const excluirFormulario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("formularios")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) {
      console.error(error);
      return { ok: false };
    }
    return { ok: true };
  });

export const renomearFormulario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; cliente_nome: string }) => {
    const nome = d.cliente_nome.trim().slice(0, 120);
    if (!nome) throw new Error("Nome obrigatório");
    return { id: d.id, cliente_nome: nome };
  })
  .handler(async ({ data, context }) => {
    try {
      const { supabase, userId } = context;
      const { data: row, error } = await supabase
        .from("formularios")
        .update({ cliente_nome: data.cliente_nome })
        .eq("id", data.id)
        .eq("user_id", userId)
        .select("id, cliente_nome")
        .maybeSingle();
      if (error) console.error(error);
      return { ok: Boolean(row) };
    } catch (err) {
      console.error(err);
      return { ok: false };
    }
  });
