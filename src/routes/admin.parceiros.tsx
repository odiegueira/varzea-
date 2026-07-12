import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { MobileShell } from "@/components/varzea/MobileShell";
import { TopBar } from "@/components/varzea/TopBar";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";

export const Route = createFileRoute("/admin/parceiros")({
  component: () => (
    <RequireAuth>
      <Gate />
    </RequireAuth>
  ),
});

function Gate() {
  const { isDirector, loading } = useUserRole();
  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Verificando permissões...</p>
      </div>
    );
  if (!isDirector) return <Navigate to="/home" />;
  return <ManagePartners />;
}

type Partner = {
  id: string;
  name: string;
  category: string;
  discount: string;
  icon: string;
  is_active: boolean;
  team_id: string | null;
  address: string | null;
  description: string | null;
  products: string | null;
  whatsapp: string | null;
};

type TeamOpt = { id: string; name: string };

function ManagePartners() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [myTeams, setMyTeams] = useState<TeamOpt[]>([]);
  const [teamId, setTeamId] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [discount, setDiscount] = useState("");
  const [icon, setIcon] = useState("🏷️");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [products, setProducts] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("partners")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setPartners((data ?? []) as Partner[]);
    setLoading(false);
  }

  async function loadTeams() {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    const { data: links } = await supabase
      .from("team_directors")
      .select("team_id")
      .eq("user_id", auth.user.id);
    const ids = (links ?? []).map((l) => l.team_id);
    if (ids.length === 0) {
      const { data: all } = await supabase.from("teams").select("id,name").order("name");
      setMyTeams((all ?? []) as TeamOpt[]);
      return;
    }
    const { data: teams } = await supabase
      .from("teams")
      .select("id,name")
      .in("id", ids)
      .order("name");
    const list = (teams ?? []) as TeamOpt[];
    setMyTeams(list);
    if (list.length === 1) setTeamId(list[0].id);
  }

  useEffect(() => {
    load();
    loadTeams();
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !category.trim() || !discount.trim()) {
      toast.error("Preencha nome, categoria e desconto.");
      return;
    }
    setSaving(true);
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase.from("partners").insert({
      name: name.trim(),
      category: category.trim(),
      discount: discount.trim(),
      icon: icon.trim() || "🏷️",
      team_id: teamId || null,
      address: address.trim() || null,
      description: description.trim() || null,
      products: products.trim() || null,
      whatsapp: whatsapp.trim() || null,
      created_by: auth.user?.id,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Parceiro adicionado!");
    setName("");
    setCategory("");
    setDiscount("");
    setIcon("🏷️");
    setAddress("");
    setDescription("");
    setProducts("");
    setWhatsapp("");
    if (myTeams.length !== 1) setTeamId("");
    load();
  }

  async function remove(id: string) {
    if (!confirm("Remover este parceiro?")) return;
    const { error } = await supabase.from("partners").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Parceiro removido.");
    setPartners((p) => p.filter((x) => x.id !== id));
  }

  async function toggleActive(p: Partner) {
    const { error } = await supabase
      .from("partners")
      .update({ is_active: !p.is_active })
      .eq("id", p.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setPartners((arr) => arr.map((x) => (x.id === p.id ? { ...x, is_active: !p.is_active } : x)));
  }

  return (
    <MobileShell>
      <TopBar title="ADICIONAR PARCEIROS" back="/admin" />
      <div className="px-4 pt-4 space-y-5">
        <form onSubmit={add} className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <h2 className="font-display text-lg flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" /> NOVO PARCEIRO
          </h2>

          <label className="block">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Time vinculado</span>
            <select
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              className="mt-1 w-full bg-input border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-primary"
            >
              <option value="">— Selecione o time —</option>
              {myTeams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </label>

          <Field label="Nome" value={name} onChange={(e) => setName(e.target.value)} placeholder="Bar do Zé" />
          <Field label="Categoria" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Bar / Restaurante / Esporte" />
          <Field label="Desconto" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="15% OFF" />
          <Field label="Ícone (emoji)" value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="🍺" />
          <Field label="Endereço" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Rua, número — bairro, cidade" />

          <label className="block">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">O que é</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 240))}
              placeholder="Boteco da quebrada, ambiente família, com TV ao vivo nos jogos."
              rows={2}
              className="mt-1 w-full bg-input border border-border rounded-xl px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
            />
            <span className="text-[10px] text-muted-foreground">{description.length}/240</span>
          </label>

          <label className="block">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">O que vende</span>
            <textarea
              value={products}
              onChange={(e) => setProducts(e.target.value.slice(0, 200))}
              placeholder="Cerveja, porções, hambúrguer, drinks..."
              rows={2}
              className="mt-1 w-full bg-input border border-border rounded-xl px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
            />
            <span className="text-[10px] text-muted-foreground">{products.length}/200</span>
          </label>

          <Field label="WhatsApp (opcional)" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="(11) 99999-9999" />

          <button
            disabled={saving}
            className="w-full bg-gradient-pitch text-primary-foreground font-display text-lg py-3 rounded-xl shadow-glow-green disabled:opacity-60"
          >
            {saving ? "SALVANDO..." : "ADICIONAR PARCEIRO"}
          </button>
        </form>

        <section>
          <h2 className="font-display text-lg mb-3">PARCEIROS CADASTRADOS</h2>
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : partners.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum parceiro cadastrado ainda.</p>
          ) : (
            <ul className="space-y-2">
              {partners.map((p) => (
                <li key={p.id} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
                  <span className="text-2xl">{p.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{p.name}</p>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{p.category}</p>
                    <p className="text-xs text-gradient-gold font-bold">{p.discount}</p>
                    {p.address && <p className="text-[11px] text-muted-foreground truncate">📍 {p.address}</p>}
                  </div>
                  <button
                    onClick={() => toggleActive(p)}
                    className={`text-[10px] uppercase px-2 py-1 rounded-md border ${
                      p.is_active ? "border-primary text-primary" : "border-muted text-muted-foreground"
                    }`}
                  >
                    {p.is_active ? "Ativo" : "Inativo"}
                  </button>
                  <button
                    onClick={() => remove(p.id)}
                    aria-label="Remover"
                    className="p-2 text-destructive hover:bg-destructive/10 rounded-lg"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </MobileShell>
  );
}

function Field({ label, ...rest }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <input
        {...rest}
        className="mt-1 w-full bg-input border border-border rounded-xl px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition"
      />
    </label>
  );
}
