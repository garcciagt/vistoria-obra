import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building2, LogIn, UserPlus, Eye, EyeOff } from "lucide-react";
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
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  // Se já logado, redireciona
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) nav({ to: "/" });
    });
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

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { toast.error("A senha deve ter pelo menos 6 caracteres."); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nome } },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Conta criada! Verifique seu e-mail para confirmar.");
    setMode("login");
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/`,
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("E-mail de recuperação enviado!");
    setMode("login");
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
            {mode === "login" ? "Entre na sua conta" : mode === "signup" ? "Crie sua conta" : "Recuperar senha"}
          </p>
        </div>

        <div className="rounded-2xl bg-card p-6 shadow-lg">
          {mode === "forgot" ? (
            <form onSubmit={handleForgot} className="space-y-4">
              <Input type="email" placeholder="Seu e-mail" required value={email} onChange={(e) => setEmail(e.target.value)} />
              <Button type="submit" className="w-full" disabled={loading}>{loading ? "Enviando…" : "Enviar link de recuperação"}</Button>
              <button type="button" className="w-full text-center text-sm text-muted-foreground underline" onClick={() => setMode("login")}>Voltar ao login</button>
            </form>
          ) : (
            <form onSubmit={mode === "login" ? handleLogin : handleSignup} className="space-y-4">
              {mode === "signup" && (
                <Input placeholder="Seu nome" required maxLength={120} value={nome} onChange={(e) => setNome(e.target.value)} />
              )}
              <Input type="email" placeholder="E-mail" required value={email} onChange={(e) => setEmail(e.target.value)} />
              <div className="relative">
                <Input type={showPw ? "text" : "password"} placeholder="Senha" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="pr-10" />
                <button type="button" tabIndex={-1} className="absolute right-3 top-2.5 text-muted-foreground" onClick={() => setShowPw((s) => !s)}>
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button type="submit" className="w-full gap-2" disabled={loading}>
                {mode === "login" ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                {loading ? "Aguarde…" : mode === "login" ? "Entrar" : "Criar conta"}
              </Button>
              {mode === "login" && (
                <button type="button" className="w-full text-center text-sm text-muted-foreground underline" onClick={() => setMode("forgot")}>Esqueci minha senha</button>
              )}
            </form>
          )}

          <div className="mt-4 border-t pt-4 text-center text-sm text-muted-foreground">
            {mode === "login" ? (
              <>Não tem conta? <button type="button" className="font-semibold text-primary underline" onClick={() => setMode("signup")}>Criar conta</button></>
            ) : mode === "signup" ? (
              <>Já tem conta? <button type="button" className="font-semibold text-primary underline" onClick={() => setMode("login")}>Entrar</button></>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}
