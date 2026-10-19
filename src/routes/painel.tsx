import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building2, LogIn, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/painel")({
  head: () => ({
    meta: [
      { title: "Entrar — Vistoria Obra" },
      { name: "description", content: "Faça login para acessar suas vistorias e formulários." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"login" | "forgot" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if already logged in
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) nav({ to: "/" });
    });

    // Listen for PASSWORD_RECOVERY event (user clicked reset link)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setMode("reset");
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message === "Invalid login credentials"
        ? "E-mail ou senha incorretos."
        : error.message);
      return;
    }
    nav({ to: "/" });
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/painel`,
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("E-mail de recuperação enviado! Verifique sua caixa de entrada.");
    setMode("login");
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Senha atualizada com sucesso!");
    nav({ to: "/" });
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-primary p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center text-primary-foreground">
          <div className="flex items-center justify-center gap-3">
            <Building2 className="h-10 w-10 text-secondary" />
            <h1 className="font-display text-4xl font-bold uppercase">
              Vistoria <span className="text-secondary">Obra</span>
            </h1>
          </div>
          <p className="mt-2 text-primary-foreground/70">
            {mode === "login" ? "Entre na sua conta" : mode === "forgot" ? "Recuperar senha" : "Nova senha"}
          </p>
        </div>

        <div className="rounded-2xl bg-card p-6 shadow-lg">
          {mode === "reset" ? (
            <form onSubmit={handleReset} className="space-y-4">
              <div className="relative">
                <Input type={showPw ? "text" : "password"} placeholder="Nova senha" required minLength={6} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="pr-10" />
                <button type="button" tabIndex={-1} className="absolute right-3 top-2.5 text-muted-foreground" onClick={() => setShowPw((s) => !s)}>
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>{loading ? "Salvando…" : "Salvar nova senha"}</Button>
            </form>
          ) : mode === "forgot" ? (
            <form onSubmit={handleForgot} className="space-y-4">
              <Input type="email" placeholder="Seu e-mail" required value={email} onChange={(e) => setEmail(e.target.value)} />
              <Button type="submit" className="w-full" disabled={loading}>{loading ? "Enviando…" : "Enviar link de recuperação"}</Button>
              <button type="button" className="w-full text-center text-sm text-muted-foreground underline" onClick={() => setMode("login")}>Voltar ao login</button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <Input type="email" placeholder="E-mail" required value={email} onChange={(e) => setEmail(e.target.value)} />
              <div className="relative">
                <Input type={showPw ? "text" : "password"} placeholder="Senha" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="pr-10" />
                <button type="button" tabIndex={-1} className="absolute right-3 top-2.5 text-muted-foreground" onClick={() => setShowPw((s) => !s)}>
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button type="submit" className="w-full gap-2" disabled={loading}>
                <LogIn className="h-4 w-4" />
                {loading ? "Aguarde…" : "Entrar"}
              </Button>
              <button type="button" className="w-full text-center text-sm text-muted-foreground underline" onClick={() => setMode("forgot")}>Esqueci minha senha</button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
