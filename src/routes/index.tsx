import { createFileRoute, Link } from "@tanstack/react-router";
import logo from "@/assets/varzea-logo.png";
import hero from "@/assets/varzea-hero.jpg";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Várzea+ — A casa da torcida de várzea" }] }),
  component: Splash,
});

function Splash() {
  return (
    <div className="min-h-screen bg-background flex justify-center">
      <div className="relative w-full max-w-[460px] min-h-screen overflow-hidden flex flex-col">
        <img src={hero} alt="Partida de várzea ao pôr do sol" width={1024} height={1280}
             className="absolute inset-0 h-full w-full object-cover opacity-60" />
        <div className="absolute inset-0 bg-gradient-hero" />
        <div className="relative z-10 flex-1 flex flex-col items-center justify-between px-6 py-12">
          <div className="pt-16 flex flex-col items-center text-center">
            <img src={logo} alt="Várzea+" width={160} height={160}
                 className="h-40 w-40 drop-shadow-[0_0_30px_oklch(0.82_0.15_85_/_50%)]" />
            <p className="mt-6 font-display text-4xl leading-none">
              ORGULHO DO <span className="text-gradient-gold">BAIRRO</span>
            </p>
            <p className="mt-3 text-sm text-muted-foreground max-w-xs">
              Apoie o time da sua quebrada. Carteirinha digital, ranking de torcidas e parcerias na sua mão.
            </p>
          </div>
          <div className="w-full space-y-3">
            <Link to="/cadastro"
                  className="block w-full text-center bg-gradient-pitch text-primary-foreground font-display text-xl py-4 rounded-2xl shadow-glow-green hover:scale-[1.02] transition-transform">
              ENTRAR NA TORCIDA
            </Link>
            <Link to="/login"
                  className="block w-full text-center border border-border bg-card/60 backdrop-blur text-foreground font-medium py-4 rounded-2xl hover:bg-card transition">
              Já sou apoiador
            </Link>
            <p className="text-center text-xs text-muted-foreground pt-2">
              <span className="text-gradient-gold font-semibold">+12.000</span> torcedores · <span className="text-primary font-semibold">340</span> times
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
