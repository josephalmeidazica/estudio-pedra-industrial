import { useEffect, useState } from "react";
import { TRPCClientError } from "@trpc/client";
import { ArrowDown, ArrowUp, LogOut, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { AdminProduct } from "@/lib/types";
import { thumbUrl } from "@/lib/imageSrcSet";
import { trpc } from "@/lib/trpc";
import { usePageTitle } from "@/lib/usePageTitle";
import { titles } from "@shared/seo-text";
import { ProductDialog } from "@/components/admin/ProductDialog";
import { AmbientesTab } from "@/components/admin/AmbientesTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/** Batch 1-3 kept the password in localStorage; the session cookie replaces it. */
const LEGACY_TOKEN_KEY = "eps_admin_token";

export default function Admin() {
  usePageTitle(titles.admin());
  const utils = trpc.useUtils();
  const me = trpc.auth.me.useQuery(undefined, { retry: false });
  const loginMutation = trpc.auth.login.useMutation();
  const logoutMutation = trpc.auth.logout.useMutation();
  const [pw, setPw] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.removeItem(LEGACY_TOKEN_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const authenticated = me.data?.authenticated === true;
  const listAll = trpc.products.listAll.useQuery(undefined, { enabled: authenticated, retry: false });
  const reorder = trpc.products.reorder.useMutation();
  const del = trpc.products.delete.useMutation();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminProduct | null>(null);
  const [toDelete, setToDelete] = useState<AdminProduct | null>(null);

  // A 401 on an admin query means the cookie expired or the password changed.
  const sessionExpired = listAll.error?.data?.code === "UNAUTHORIZED";
  useEffect(() => {
    if (sessionExpired) {
      setLoginError("Sua sessão expirou. Entre de novo.");
      utils.auth.me.setData(undefined, { authenticated: false });
    }
  }, [sessionExpired, utils]);

  const login = async () => {
    const password = pw.trim();
    if (!password) return;
    setLoginError(null);
    try {
      await loginMutation.mutateAsync({ password });
      setPw("");
      await utils.auth.me.invalidate();
      await utils.products.listAll.invalidate();
    } catch (e) {
      setLoginError(e instanceof TRPCClientError ? e.message : "Não foi possível entrar. Tente de novo.");
    }
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
    utils.products.listAll.setData(undefined, undefined);
    utils.auth.me.setData(undefined, { authenticated: false });
  };

  if (me.isLoading) {
    return <div className="mx-auto flex min-h-screen max-w-sm items-center justify-center p-6 text-muted-foreground">Carregando…</div>;
  }

  // Login screen
  if (!authenticated) {
    return (
      <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-6">
        <h1 className="text-xl font-semibold">Administração</h1>
        {loginError && <p className="text-sm text-destructive">{loginError}</p>}
        <Input
          type="password"
          autoComplete="current-password"
          placeholder="Senha de administrador"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && login()}
        />
        <Button onClick={login} disabled={!pw.trim() || loginMutation.isPending}>
          {loginMutation.isPending ? "Entrando…" : "Entrar"}
        </Button>
        <p className="text-xs text-muted-foreground">Você fica conectado neste aparelho por 30 dias.</p>
      </div>
    );
  }

  const products = listAll.data ?? [];

  const move = async (index: number, dir: -1 | 1) => {
    const ordered = products.map((p) => p.id);
    const j = index + dir;
    if (j < 0 || j >= ordered.length) return;
    [ordered[index], ordered[j]] = [ordered[j], ordered[index]];
    await reorder.mutateAsync({ orderedIds: ordered });
    await utils.products.listAll.invalidate();
  };

  const openNew = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (p: AdminProduct) => { setEditing(p); setDialogOpen(true); };

  const confirmDelete = async () => {
    if (!toDelete) return;
    await del.mutateAsync({ id: toDelete.id });
    setToDelete(null);
    await utils.products.listAll.invalidate();
    await utils.products.list.invalidate();
  };

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Administração</h1>
        <div className="flex gap-2">
          <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" />Novo produto</Button>
          <Button variant="ghost" onClick={logout}><LogOut className="mr-2 h-4 w-4" />Sair</Button>
        </div>
      </div>

      <Tabs defaultValue="produtos">
        <TabsList className="mb-4">
          <TabsTrigger value="produtos">Produtos</TabsTrigger>
          <TabsTrigger value="ambientes">Ambientes</TabsTrigger>
        </TabsList>
        <TabsContent value="produtos">
      <div className="divide-y rounded-md border">
        {products.map((p, i) => (
          <div key={p.id} className="flex items-center gap-3 p-3">
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded border bg-muted">
              {p.images[0]?.url ? (
                <img src={thumbUrl(p.images[0])} alt="" className="h-full w-full object-cover" />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate font-medium">{p.name}</span>
                {!p.published && <Badge variant="secondary">Rascunho</Badge>}
              </div>
              <span className="text-xs text-muted-foreground">{p.category}</span>
            </div>
            <Button variant="ghost" size="icon" aria-label="Mover para cima" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" aria-label="Mover para baixo" disabled={i === products.length - 1} onClick={() => move(i, 1)}><ArrowDown className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" aria-label="Editar" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" aria-label="Excluir" className="text-destructive" onClick={() => setToDelete(p)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
        {products.length === 0 && <p className="p-6 text-center text-muted-foreground">Nenhum produto.</p>}
      </div>

        </TabsContent>
        <TabsContent value="ambientes">
          <AmbientesTab />
        </TabsContent>
      </Tabs>

      <ProductDialog open={dialogOpen} onOpenChange={setDialogOpen} product={editing} />

      <AlertDialog open={toDelete != null} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir produto?</AlertDialogTitle>
            <AlertDialogDescription>
              "{toDelete?.name}" e suas imagens serão removidos. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
