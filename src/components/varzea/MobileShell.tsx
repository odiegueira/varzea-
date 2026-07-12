import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Users, Trophy, IdCard, Tag, Shirt, Shield } from "lucide-react";
import type { ReactNode } from "react";
import { useUserRole } from "@/hooks/useUserRole";

const BASE_NAV = [
  { to: "/home", label: "Feed", icon: Home },
  { to: "/times", label: "Times", icon: Users },
  { to: "/mercado", label: "Mercado", icon: Shirt },
  { to: "/ranking", label: "Ranking", icon: Trophy },
  { to: "/carteirinha", label: "Carteira", icon: IdCard },
  { to: "/parceiros", label: "Parceiros", icon: Tag },
] as const;

export function MobileShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { isDirector } = useUserRole();
  const NAV = isDirector
    ? [...BASE_NAV, { to: "/admin", label: "Diretoria", icon: Shield } as const]
    : BASE_NAV;
  const cols = NAV.length === 7 ? "grid-cols-7" : "grid-cols-6";
  return (
    <div className="min-h-screen bg-background flex justify-center">
      <div className="w-full max-w-[460px] min-h-screen bg-gradient-night relative pb-24">
        {children}
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[460px] z-50 bg-card/95 backdrop-blur-xl border-t border-border">
          <ul className={`grid ${cols}`}>
            {NAV.map(({ to, label, icon: Icon }) => {
              const active = path === to || (to !== "/home" && path.startsWith(to));
              return (
                <li key={to}>
                  <Link
                    to={to}
                    className={`flex flex-col items-center gap-1 py-3 text-[9px] uppercase tracking-wider transition-colors ${
                      active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className={`h-[18px] w-[18px] ${active ? "drop-shadow-[0_0_8px_oklch(0.72_0.19_145)]" : ""}`} />
                    <span>{label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </div>
  );
}
