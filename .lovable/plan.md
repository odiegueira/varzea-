## Objetivo

Adicionar o botão "Editar perfil" (ícone `UserCog`) no `TopBar`, ao lado do botão de sair, para que fique disponível em todas as telas do app — não só em `/carteirinha`.

## Mudanças

1. **Novo componente `src/components/varzea/ProfileEditDialog.tsx`**
   - Extrai o `Dialog` de edição de perfil que hoje vive dentro de `src/routes/carteirinha.tsx` (campos `full_name` e `nickname`, salvando via `supabase.auth.updateUser` + `profiles.update`, com toast).
   - Recebe `open` / `onOpenChange` por props para ser controlado externamente.

2. **`src/components/varzea/TopBar.tsx`**
   - Importar `UserCog` do `lucide-react` e o novo `ProfileEditDialog`.
   - Adicionar um `<button>` antes do botão de sair (só quando `user` existe), com o mesmo estilo do botão de logout (`p-2 text-muted-foreground hover:text-foreground`, `aria-label="Editar perfil"`).
   - Estado local `editOpen` controla a abertura do `ProfileEditDialog`.

3. **`src/routes/carteirinha.tsx`**
   - Remover o botão grande "Editar perfil" do topo da página e o `Dialog` inline (agora redundantes — o usuário acessa pelo TopBar).
   - Limpar imports/states não usados (`UserCog`, `Dialog*`, `Input`, `Label`, `editOpen`, `savingProfile`, `formName`, `formNick`, `openEdit`, `saveProfile`).

## Resultado

O ícone de perfil aparece no header de todas as páginas (Home, Times, Mercado, Carteirinha, etc.), à esquerda do botão de sair, abrindo o mesmo modal de edição.