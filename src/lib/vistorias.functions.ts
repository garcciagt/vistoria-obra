import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listVistorias = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("vistorias")
      .select("id, data")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });
    return (data ?? []).map((r) => r.data) as any[];
  });

export const getVistoria = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: r } = await supabase
      .from("vistorias")
      .select("data")
      .eq("id", data.id)
      .eq("user_id", userId)
      .maybeSingle();
    return (r?.data ?? null) as any;
  });

export const saveVistoria = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; data: unknown }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("vistorias")
      .upsert({
        id: data.id,
        user_id: userId,
        data: data.data as never,
        updated_at: new Date().toISOString(),
      });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteVistoria = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await supabase.from("vistorias").delete().eq("id", data.id).eq("user_id", userId);
    return { ok: true };
  });
