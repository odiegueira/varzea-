import { createFileRoute, Link } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { MobileShell } from "@/components/varzea/MobileShell";
import { TopBar } from "@/components/varzea/TopBar";

export const Route = createFileRoute("/qrcode")({
  component: () => (<RequireAuth><QR /></RequireAuth>),
});

function QR() {
  // Simple SVG checker pattern as faux QR code
  const cells = Array.from({ length: 21 * 21 }, (_, i) => {
    const x = i % 21, y = Math.floor(i / 21);
    const finder = (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13);
    const corner = (x === 0 || x === 6 || y === 0 || y === 6) && finder;
    const center = x >= 2 && x <= 4 && y >= 2 && y <= 4 && finder;
    if (finder) return corner || center;
    // pseudo-random
    return ((x * 7 + y * 13 + (x ^ y) * 3) % 5) < 2;
  });

  return (
    <MobileShell>
      <TopBar title="PRESENÇA NO JOGO" back="/carteirinha" />
      <div className="px-4 pt-6 flex flex-col items-center text-center">
        <p className="text-xs uppercase tracking-widest text-gold">União Vila Nova FC vs Real Jardim</p>
        <p className="font-display text-2xl mt-1">DOMINGO · 10:00</p>
        <p className="text-sm text-muted-foreground">Campo da Vila Nova</p>

        <div className="mt-8 p-5 bg-white rounded-3xl shadow-glow-green animate-pulse-glow">
          <svg viewBox="0 0 21 21" className="h-64 w-64">
            {cells.map((on, i) => on && (
              <rect key={i} x={i % 21} y={Math.floor(i / 21)} width="1" height="1" fill="#0a1a14" />
            ))}
          </svg>
        </div>

        <p className="mt-6 font-display text-3xl text-gradient-gold">+50 PONTOS</p>
        <p className="text-sm text-muted-foreground max-w-xs mt-1">Mostre este QR Code na entrada do campo. Cada presença te aproxima de virar Lenda da Várzea.</p>

        <div className="mt-8 w-full bg-card border border-border rounded-2xl p-4 text-left">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Como funciona</p>
          <ul className="mt-2 space-y-1.5 text-sm">
            <li>1. Mostre o QR no portão antes do jogo</li>
            <li>2. Diretor escaneia e confirma sua presença</li>
            <li>3. Pontos caem na sua carteirinha</li>
          </ul>
        </div>
        <Link to="/carteirinha" className="mt-6 text-sm text-primary">← Voltar para carteirinha</Link>
      </div>
    </MobileShell>
  );
}
