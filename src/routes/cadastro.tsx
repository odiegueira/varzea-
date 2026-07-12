import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/varzea-logo.png";

export const Route = createFileRoute("/cadastro")({ component: Cadastro });

function Cadastro() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", nickname: "", email: "", city: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof typeof form>(key: K) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/home`,
        data: { full_name: form.name, nickname: form.nickname, city: form.city },
      },
    });
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
        <div className="flex flex-col items-center mt-6">
          <img src={logo} alt="Várzea+" width={64} height={64} className="h-16 w-16" loading="lazy" />
          <h1 className="mt-4 font-display text-3xl text-center">VIRA APOIADOR</h1>
          <p className="text-sm text-muted-foreground text-center px-6">Crie sua carteirinha digital e fortaleça o time da sua quebrada.</p>
        </div>
        <form className="mt-8 space-y-4" onSubmit={onSubmit}>
          <Field label="Nome completo" placeholder="João da Silva" required value={form.name} onChange={update("name")} />
          <Field label="Apelido / Nome de torcida" placeholder="Joãozinho da Vila" value={form.nickname} onChange={update("nickname")} />
          <Field label="E-mail" type="email" placeholder="seu@email.com" required value={form.email} onChange={update("email")} />
          <Field label="Cidade / Bairro" placeholder="São Paulo / Vila Nova" value={form.city} onChange={update("city")} />
          <Field label="Senha" type="password" placeholder="••••••••" required minLength={6} value={form.password} onChange={update("password")} />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button disabled={loading} className="w-full bg-gradient-gold text-gold-foreground font-display text-xl py-4 rounded-2xl shadow-glow-gold mt-4 disabled:opacity-60">
            {loading ? "CRIANDO..." : "CRIAR MINHA CARTEIRINHA"}
          </button>
          <p className="text-center text-sm text-muted-foreground">
            Já é apoiador? <Link to="/login" className="text-primary font-semibold">Entrar</Link>
          </p>
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
