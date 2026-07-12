import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/varzea-logo.png";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    navigate({ to: "/home" });
  }

  return (
    <div className="min-h-screen bg-gradient-night flex justify-center">
      <div className="w-full max-w-[460px] px-6 py-10 flex flex-col">
        <Link to="/" className="text-sm text-muted-foreground">← Voltar</Link>
        <div className="flex flex-col items-center mt-8">
          <img src={logo} alt="Várzea+" width={80} height={80} className="h-20 w-20" loading="lazy" />
          <h1 className="mt-4 font-display text-3xl">BEM-VINDO DE VOLTA</h1>
          <p className="text-sm text-muted-foreground">A torcida tava sentindo sua falta.</p>
        </div>
        <form className="mt-10 space-y-4" onSubmit={onSubmit}>
          <Field label="E-mail" type="email" placeholder="seu@email.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <Field label="Senha" type="password" placeholder="••••••••" required value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button disabled={loading} className="w-full bg-gradient-pitch text-primary-foreground font-display text-xl py-4 rounded-2xl shadow-glow-green mt-4 disabled:opacity-60">
            {loading ? "ENTRANDO..." : "ENTRAR"}
          </button>
          <p className="text-center text-sm text-muted-foreground">
            Ainda não tem conta? <Link to="/cadastro" className="text-primary font-semibold">Cadastre-se</Link>
          </p>
          <div className="mt-6 rounded-xl border border-border bg-card/60 p-4 text-center">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">É diretor de time?</p>
            <p className="text-sm mt-1 text-foreground">
              Faça login normalmente. O painel da <span className="text-primary font-semibold">Diretoria</span> aparece automaticamente na sua barra de navegação.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, ...rest }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <input {...rest} className="mt-1 w-full bg-input border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:shadow-glow-green transition" />
    </label>
  );
}
