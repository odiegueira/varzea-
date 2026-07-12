import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { z } from "zod";
import { MapPin, LocateFixed, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { MobileShell } from "@/components/varzea/MobileShell";
import { TopBar } from "@/components/varzea/TopBar";
import { confirmLocationCheckin, getCheckinInfo } from "@/lib/checkin.functions";

export const Route = createFileRoute("/qrcode")({
  validateSearch: (search) => z.object({ team: z.string().optional().default("uniao-fc") }).parse(search),
  component: () => <RequireAuth><LocationCheckin /></RequireAuth>,
});

function LocationCheckin() {
  const { team } = Route.useSearch();
  const infoFn = useServerFn(getCheckinInfo);
  const confirmFn = useServerFn(confirmLocationCheckin);
  const [info, setInfo] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => { infoFn({ data: { teamId: team } }).then(setInfo).catch((e) => setMessage(e.message)); }, [team]);

  function checkIn() {
    if (!navigator.geolocation) { setMessage("Este celular não oferece suporte à localização."); return; }
    setBusy(true); setMessage(null);
    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const result = await confirmFn({ data: {
          teamId: team, latitude: position.coords.latitude, longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        }});
        setSuccess(true);
        setMessage(result.alreadyDone ? "Seu check-in de hoje já estava confirmado." : `Presença confirmada! Você ganhou +${result.points} pontos.`);
        setInfo(await infoFn({ data: { teamId: team } }));
      } catch (e: any) { setMessage(e.message || "Não foi possível confirmar o check-in."); }
      finally { setBusy(false); }
    }, (error) => {
      setBusy(false);
      setMessage(error.code === 1 ? "Permita o acesso à localização nas configurações do navegador e tente novamente." : "Não conseguimos obter sua localização. Vá para uma área aberta e tente novamente.");
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  }

  const configured = info?.stadium_latitude != null && info?.stadium_longitude != null;
  const done = info?.checkedInToday || success;
  return <MobileShell>
    <TopBar title="CHECK-IN NO JOGO" back="/carteirinha" />
    <div className="px-4 pt-6 text-center space-y-5">
      <div className={`mx-auto h-24 w-24 rounded-full flex items-center justify-center ${done ? "bg-primary/15 text-primary" : "bg-gold/15 text-gold"}`}>
        {done ? <CheckCircle2 className="h-12 w-12" /> : <MapPin className="h-12 w-12" />}
      </div>
      <div><p className="text-xs uppercase tracking-widest text-gold">{info?.name ?? "Carregando time..."}</p><h1 className="font-display text-2xl mt-1">{info?.stadium_name || "LOCAL DO JOGO"}</h1><p className="text-sm text-muted-foreground">Check-in permitido em um raio de {info?.checkin_radius_m ?? 250} metros</p></div>
      <div className="rounded-2xl border border-border bg-card p-4 text-left">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Como validar sua presença</p>
        <ol className="mt-2 space-y-2 text-sm"><li>1. Esteja no estádio ou campo do jogo</li><li>2. Ative a localização do celular</li><li>3. Toque no botão e permita o acesso</li></ol>
      </div>
      {!configured && info && <div className="flex gap-2 text-left rounded-xl bg-destructive/10 text-destructive p-3 text-sm"><AlertTriangle className="h-5 w-5 shrink-0" />O administrador ainda precisa cadastrar a localização deste estádio.</div>}
      {message && <div className={`rounded-xl p-3 text-sm ${done ? "bg-primary/10 text-primary" : "bg-muted text-foreground"}`}>{message}</div>}
      <button onClick={checkIn} disabled={busy || done || !configured} className="w-full flex items-center justify-center gap-2 bg-gradient-pitch text-primary-foreground py-4 rounded-xl font-display text-lg disabled:opacity-50">
        {busy ? <><Loader2 className="h-5 w-5 animate-spin" /> LOCALIZANDO...</> : done ? <><CheckCircle2 className="h-5 w-5" /> CHECK-IN CONFIRMADO</> : <><LocateFixed className="h-5 w-5" /> USAR MINHA LOCALIZAÇÃO</>}
      </button>
      {info && <p className="font-display text-2xl text-gradient-gold">{info.totalPoints ?? 0} PONTOS ACUMULADOS</p>}
      <Link to="/carteirinha" className="block text-sm text-primary">← Voltar para carteirinha</Link>
    </div>
  </MobileShell>;
}
