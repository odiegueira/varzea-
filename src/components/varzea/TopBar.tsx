import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, LogOut, UserCog } from "lucide-react";
import { useState } from "react";
import logo from "@/assets/varzea-logo.png";
import { useAuth } from "@/hooks/useAuth";
import { ProfileEditDialog } from "@/components/varzea/ProfileEditDialog";

export function TopBar({ title, back }: { title?: string; back?: string }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 flex items-center gap-3 px-4 py-3 bg-card/80 backdrop-blur-xl border-b border-border">
      {back ? (
        <Link to={back} className="p-1 -ml-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-6 w-6" />
        </Link>
      ) : (
        <img src={logo} alt="Várzea+" width={36} height={36} className="h-9 w-9" />
      )}
      <h1 className="font-display text-2xl tracking-wide flex-1">{title ?? "VÁRZEA+"}</h1>
      {user && (
        <>
          <button
            onClick={() => setEditOpen(true)}
            aria-label="Editar perfil"
            className="p-2 text-muted-foreground hover:text-foreground"
          >
            <UserCog className="h-5 w-5" />
          </button>
          <button
            onClick={async () => { await signOut(); navigate({ to: "/" }); }}
            aria-label="Sair"
            className="p-2 -mr-1 text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-5 w-5" />
          </button>
          <ProfileEditDialog open={editOpen} onOpenChange={setEditOpen} />
        </>
      )}
    </header>
  );
}
