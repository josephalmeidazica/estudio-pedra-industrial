# Admin Panel (/admin) Implementation Plan (Feature 2 of 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A password-gated `/admin` panel for full product + image CRUD, the secret renamed `ADMIN_API_TOKEN`→`ADMIN_PASSWORD`, and the catalog's inline "Editar" mode removed.

**Architecture:** Built bottom-up so every task type-checks against already-built pieces: shared types + compress util → `ImageManager` → `ProductDialog` (embeds ImageManager) → `Admin` page (login gate + list, renders ProductDialog) + route → remove Editar from Catalog. All admin data/mutations use the existing token-protected tRPC endpoints; the tRPC client already sends the bearer from `localStorage["eps_admin_token"]`.

**Tech Stack:** React 19 + TS (ESM, strict), Vite, wouter, Tailwind v4, shadcn/ui (`Dialog`, `AlertDialog`, `Table`, `Switch`, `Textarea`, `Input`, `Label`, `Button`, `Badge`), lucide, tRPC, Vitest.

## Global Constraints

- ESM, strict TS, extensionless local imports. Windows-safe. No git remote/push.
- No new colors — existing Tailwind tokens + shadcn + lucide only.
- Server auth secret is **`ADMIN_PASSWORD`** (fail-closed, constant-time) after Task 1.
- `/admin` is **unlisted** (no public link). Enforcement is server-side; the client login is UX.
- Path alias `@/` → `client/src/`. Commit after every task.

---

### Task 1: Rename the secret `ADMIN_API_TOKEN` → `ADMIN_PASSWORD`

**Files:**
- Modify: `server/lib/auth.ts`, `server/lib/auth.test.ts`, `server/routers/routers.test.ts`, `server/index.ts`, `.env`, `.env.example`, `DEPLOY.md`, `VPS-SETUP.md`

**Interfaces:**
- Produces: server reads `process.env.ADMIN_PASSWORD`. No signature change to `isValidAdminToken`.

- [ ] **Step 1: Update the tests first (RED)**

In `server/lib/auth.test.ts` replace every `process.env.ADMIN_API_TOKEN` with `process.env.ADMIN_PASSWORD` (the `original`/`beforeEach`/`afterEach` and the empty-token case). In `server/routers/routers.test.ts` replace `process.env.ADMIN_API_TOKEN = "test-token"` with `process.env.ADMIN_PASSWORD = "test-token"`.

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- auth`
Expected: FAIL (auth.ts still reads `ADMIN_API_TOKEN`, so the renamed-env tests don't authenticate).

- [ ] **Step 3: Update `server/lib/auth.ts`**

Change the env read:
```ts
const expected = process.env.ADMIN_PASSWORD ?? "";
```
(Leave the rest — `Bearer ` parse, length guard, `crypto.timingSafeEqual` — unchanged.)

- [ ] **Step 4: Update the boot warning in `server/index.ts`**

```ts
if (!process.env.ADMIN_PASSWORD) {
  console.warn("[auth] ADMIN_PASSWORD is not set — write endpoints are disabled. Set it in .env.");
}
```

- [ ] **Step 5: Rename in `.env` and `.env.example`**

Edit `.env` (git-ignored): rename the key `ADMIN_API_TOKEN=<value>` → `ADMIN_PASSWORD=<value>` keeping the same value. In `.env.example`, rename the key and update the comment to say "admin password".

- [ ] **Step 6: Rename references in the deploy docs**

```bash
cd "C:/Users/josephz/estudio-pedra-industrial"
sed -i 's/ADMIN_API_TOKEN/ADMIN_PASSWORD/g' DEPLOY.md VPS-SETUP.md
```

- [ ] **Step 7: Run tests + type-check**

Run: `npm test` and `npm run check`
Expected: all pass; 0 type errors.

- [ ] **Step 8: Commit**

```bash
git add server/lib/auth.ts server/lib/auth.test.ts server/routers/routers.test.ts server/index.ts .env.example DEPLOY.md VPS-SETUP.md
git commit -m "refactor(auth): rename ADMIN_API_TOKEN -> ADMIN_PASSWORD"
```
(Do NOT stage `.env` — it's git-ignored.)

---

### Task 2: Shared types + image-compress util

**Files:**
- Create: `client/src/lib/types.ts`
- Create: `client/src/lib/imageCompress.ts`

**Interfaces:**
- Produces: `AdminProduct`, `AdminImage` types; `compressImage(dataUrl, quality?): Promise<string>`.

- [ ] **Step 1: Write `client/src/lib/types.ts`**

```ts
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../server/routers";

export type RouterOutputs = inferRouterOutputs<AppRouter>;
export type AdminProduct = RouterOutputs["products"]["listAll"][number];
export type AdminImage = AdminProduct["images"][number];
```

- [ ] **Step 2: Write `client/src/lib/imageCompress.ts`**

```ts
/** Resize (≤1200px) + JPEG-compress a data URL in the browser. Returns the original on failure. */
export function compressImage(dataUrl: string, quality = 0.6): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(dataUrl);
      let width = img.width;
      let height = img.height;
      const max = 1200;
      if (width > max || height > max) {
        const ratio = Math.min(max / width, max / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}
```

- [ ] **Step 3: Type-check**

Run: `npm run check`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add client/src/lib/types.ts client/src/lib/imageCompress.ts
git commit -m "feat(admin): shared router-output types + image-compress util"
```

---

### Task 3: `ImageManager` component

**Files:**
- Create: `client/src/components/admin/ImageManager.tsx`

**Interfaces:**
- Consumes: `AdminImage` (types), `compressImage`, `trpc.images.*`, `trpc.useUtils`.
- Produces: `ImageManager({ productId, images })`.

- [ ] **Step 1: Write `client/src/components/admin/ImageManager.tsx`**

```tsx
import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Star, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { compressImage } from "@/lib/imageCompress";
import type { AdminImage } from "@/lib/types";
import { trpc } from "@/lib/trpc";

export function ImageManager({ productId, images }: { productId: number; images: AdminImage[] }) {
  const utils = trpc.useUtils();
  const addImage = trpc.images.add.useMutation();
  const delImage = trpc.images.delete.useMutation();
  const reorder = trpc.images.reorder.useMutation();
  const setCover = trpc.images.setCover.useMutation();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const refresh = () => utils.products.listAll.invalidate();

  const onFiles = async (files: FileList) => {
    setBusy(true);
    for (const file of Array.from(files)) {
      const dataUrl: string = await new Promise((res) => {
        const r = new FileReader();
        r.onload = (e) => res(e.target?.result as string);
        r.readAsDataURL(file);
      });
      let compressed = await compressImage(dataUrl, 0.6);
      try {
        await addImage.mutateAsync({ productId, dataUrl: compressed });
      } catch {
        compressed = await compressImage(dataUrl, 0.3);
        try {
          await addImage.mutateAsync({ productId, dataUrl: compressed });
        } catch {
          alert("Erro ao enviar imagem. Tente uma imagem menor.");
        }
      }
    }
    await refresh();
    setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const move = async (index: number, dir: -1 | 1) => {
    const ordered = images.map((i) => i.id);
    const j = index + dir;
    if (j < 0 || j >= ordered.length) return;
    [ordered[index], ordered[j]] = [ordered[j], ordered[index]];
    await reorder.mutateAsync({ productId, orderedIds: ordered });
    await refresh();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Imagens</span>
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => fileRef.current?.click()}>
          <Upload className="mr-2 h-4 w-4" />
          {busy ? "Enviando..." : "Enviar imagem"}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && onFiles(e.target.files)}
        />
      </div>

      {images.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma imagem ainda.</p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {images.map((img, i) => (
            <div key={img.id} className="group relative overflow-hidden rounded-md border">
              <img src={img.url} alt="" className="aspect-square w-full object-cover" />
              {i === 0 && (
                <span className="absolute left-1 top-1 rounded bg-background/80 px-1 text-[10px]">Capa</span>
              )}
              <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1 bg-background/80 p-1 opacity-0 transition group-hover:opacity-100">
                <Button type="button" variant="ghost" size="icon" className="h-6 w-6" aria-label="Mover para a esquerda" onClick={() => move(i, -1)}>
                  <ChevronLeft className="h-3 w-3" />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-6 w-6" aria-label="Definir como capa" onClick={async () => { await setCover.mutateAsync({ imageId: img.id }); await refresh(); }}>
                  <Star className="h-3 w-3" />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-6 w-6" aria-label="Remover" onClick={async () => { await delImage.mutateAsync({ imageId: img.id }); await refresh(); }}>
                  <Trash2 className="h-3 w-3" />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-6 w-6" aria-label="Mover para a direita" onClick={() => move(i, 1)}>
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npm run check`
Expected: 0 errors. (Verify the shadcn `button` supports `size="icon"`/`variant="ghost"|"outline"` — it does.)

- [ ] **Step 3: Commit**

```bash
git add client/src/components/admin/ImageManager.tsx
git commit -m "feat(admin): per-product image manager (upload/remove/cover/reorder)"
```

---

### Task 4: `ProductDialog` component

**Files:**
- Create: `client/src/components/admin/ProductDialog.tsx`

**Interfaces:**
- Consumes: `AdminProduct` (types), `ImageManager`, `trpc.products.create/update`, shadcn `Dialog`/`Input`/`Label`/`Switch`/`Textarea`/`Button`.
- Produces: `ProductDialog({ open, onOpenChange, product })` where `product: AdminProduct | null` (null = create).

- [ ] **Step 1: Write `client/src/components/admin/ProductDialog.tsx`**

```tsx
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { AdminProduct } from "@/lib/types";
import { trpc } from "@/lib/trpc";
import { ImageManager } from "./ImageManager";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: AdminProduct | null;
};

const empty = {
  name: "",
  slug: "",
  description: "",
  category: "",
  materials: "",
  dimensions: "",
  price: "",
  featured: false,
  published: true,
};

export function ProductDialog({ open, onOpenChange, product }: Props) {
  const utils = trpc.useUtils();
  const create = trpc.products.create.useMutation();
  const update = trpc.products.update.useMutation();
  const [form, setForm] = useState(empty);
  const [currentId, setCurrentId] = useState<number | null>(null);

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name,
        slug: product.slug,
        description: product.description,
        category: product.category,
        materials: product.materials,
        dimensions: product.dimensions,
        price: product.price == null ? "" : String(product.price),
        featured: product.featured,
        published: product.published,
      });
      setCurrentId(product.id);
    } else {
      setForm(empty);
      setCurrentId(null);
    }
  }, [product, open]);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const refreshLists = async () => {
    await utils.products.listAll.invalidate();
    await utils.products.list.invalidate();
  };

  const save = async () => {
    if (!form.name.trim()) return;
    const base = {
      name: form.name.trim(),
      description: form.description,
      category: form.category,
      materials: form.materials,
      dimensions: form.dimensions,
      price: form.price.trim() === "" ? null : Number(form.price),
      featured: form.featured,
      published: form.published,
      ...(form.slug.trim() ? { slug: form.slug.trim() } : {}),
    };
    if (currentId == null) {
      const created = await create.mutateAsync(base);
      setCurrentId(created.id); // switch to edit mode so images can be added
    } else {
      await update.mutateAsync({ id: currentId, ...base });
    }
    await refreshLists();
  };

  // The current product's fresh images (for the ImageManager) come from listAll.
  const listAll = trpc.products.listAll.useQuery(undefined, { enabled: currentId != null });
  const currentImages = listAll.data?.find((p) => p.id === currentId)?.images ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{currentId == null ? "Novo produto" : "Editar produto"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="p-name">Nome</Label>
            <Input id="p-name" value={form.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="p-slug">Slug (opcional)</Label>
            <Input id="p-slug" placeholder="gerado a partir do nome" value={form.slug} onChange={(e) => set("slug", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="p-cat">Categoria</Label>
            <Input id="p-cat" value={form.category} onChange={(e) => set("category", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="p-mat">Materiais</Label>
              <Input id="p-mat" value={form.materials} onChange={(e) => set("materials", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="p-dim">Dimensões</Label>
              <Input id="p-dim" value={form.dimensions} onChange={(e) => set("dimensions", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="p-price">Preço (vazio = sob consulta)</Label>
            <Input id="p-price" type="number" value={form.price} onChange={(e) => set("price", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="p-desc">Descrição</Label>
            <Textarea id="p-desc" value={form.description} onChange={(e) => set("description", e.target.value)} />
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={form.featured} onCheckedChange={(v) => set("featured", v)} /> Destaque
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={form.published} onCheckedChange={(v) => set("published", v)} /> Publicado
            </label>
          </div>

          {currentId != null && (
            <div className="border-t pt-3">
              <ImageManager productId={currentId} images={currentImages} />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Fechar</Button>
          <Button onClick={save} disabled={!form.name.trim() || create.isPending || update.isPending}>
            {currentId == null ? "Criar" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npm run check`
Expected: 0 errors. If shadcn `Switch` uses `onCheckedChange` (it does) confirm the prop name against `components/ui/switch.tsx`; adapt only if it differs.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/admin/ProductDialog.tsx
git commit -m "feat(admin): product create/edit dialog with fields + image manager"
```

---

### Task 5: `Admin` page (login gate + list) + `/admin` route

**Files:**
- Create: `client/src/pages/Admin.tsx`
- Modify: `client/src/App.tsx`

**Interfaces:**
- Consumes: `ProductDialog`, `AdminProduct`, `trpc.products.listAll/reorder/delete`, shadcn `Table`/`AlertDialog`/`Input`/`Button`/`Badge`.

- [ ] **Step 1: Write `client/src/pages/Admin.tsx`**

```tsx
import { useState } from "react";
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
import { trpc } from "@/lib/trpc";
import { ProductDialog } from "@/components/admin/ProductDialog";

const TOKEN_KEY = "eps_admin_token";

export default function Admin() {
  const utils = trpc.useUtils();
  const [token, setToken] = useState<string | null>(
    typeof localStorage !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null
  );
  const [pw, setPw] = useState("");

  const listAll = trpc.products.listAll.useQuery(undefined, {
    enabled: Boolean(token),
    retry: false,
  });
  const reorder = trpc.products.reorder.useMutation();
  const del = trpc.products.delete.useMutation();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminProduct | null>(null);
  const [toDelete, setToDelete] = useState<AdminProduct | null>(null);

  const unauthorized = listAll.error?.data?.code === "UNAUTHORIZED";
  const authed = Boolean(token) && !unauthorized;

  const login = async () => {
    const value = pw.trim();
    if (!value) return;
    localStorage.setItem(TOKEN_KEY, value);
    setToken(value);
    setPw("");
    await utils.products.listAll.invalidate();
  };
  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    utils.products.listAll.invalidate();
  };

  // Login screen
  if (!authed) {
    return (
      <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-6">
        <h1 className="text-xl font-semibold">Administração</h1>
        {unauthorized && <p className="text-sm text-destructive">Senha incorreta.</p>}
        <Input
          type="password"
          placeholder="Senha de administrador"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && login()}
        />
        <Button onClick={login} disabled={!pw.trim()}>Entrar</Button>
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
        <h1 className="text-xl font-semibold">Produtos</h1>
        <div className="flex gap-2">
          <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" />Novo produto</Button>
          <Button variant="ghost" onClick={logout}><LogOut className="mr-2 h-4 w-4" />Sair</Button>
        </div>
      </div>

      <div className="divide-y rounded-md border">
        {products.map((p, i) => (
          <div key={p.id} className="flex items-center gap-3 p-3">
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded border bg-muted">
              {p.images[0]?.url ? (
                <img src={p.images[0].url} alt="" className="h-full w-full object-cover" />
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
```

- [ ] **Step 2: Register the route in `client/src/App.tsx`**

Add the import and a route inside the `<Switch>` (before the fallback):
```tsx
import Admin from "./pages/Admin";
// ...
<Route path={"/admin"} component={Admin} />
```

- [ ] **Step 3: Type-check**

Run: `npm run check`
Expected: 0 errors. Confirm the `AlertDialog*` export names against `components/ui/alert-dialog.tsx` and adjust imports only if they differ.

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/Admin.tsx client/src/App.tsx
git commit -m "feat(admin): /admin route with login gate + product list (reorder/delete)"
```

---

### Task 6: Remove "Editar" mode from the catalog

**Files:**
- Modify: `client/src/pages/Catalog.tsx`

**Interfaces:** Catalog becomes public-only (browse + gallery + AddToCartButton + CartWidget); no admin/upload code.

- [ ] **Step 1: Read `client/src/pages/Catalog.tsx`** and remove all of:
- `const addImageMutation = trpc.images.add.useMutation();` and `const deleteImageMutation = trpc.images.delete.useMutation();` (lines ~19–20).
- the `adminToken`/`editMode` state and `enableEditMode`/`exitEditMode` (lines ~22–41).
- the inline `compressImage` helper (~43–...), and the `handleImageUpload`/`removeImage`/`handleAddPhotosClick` handlers + `uploadingProduct` state.
- the header "Editar"/"Sair do modo edição" toggle (the `{editMode ? ... : ...}` block, ~200–207).
- the two `{editMode && ( ... )}` blocks in the product card (the per-image remove control ~260 and the "Adicionar Fotos"/"Adicionar Mais" button ~300–307).
- any now-unused imports (e.g. `trpc` if nothing else uses it — but `trpc.products.list` is still used, so keep `trpc`; remove only unused icon imports like `Plus`/`X` if they're no longer referenced).

Keep: `trpc.products.list.useQuery()`, the product cards + cover image + category chip, the gallery/lightbox state and its viewer, `AddToCartButton`, and `CartWidget`.

- [ ] **Step 2: Type-check + tests + build**

```bash
npm run check   # 0 errors (fix any now-unused-var/import errors from the removals)
npm test        # all pass
npm run build   # succeeds
```

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/Catalog.tsx
git commit -m "refactor(catalog): remove inline Editar mode (management moved to /admin)"
```

---

### Task 7: Full verification (browser)

**Files:** none (verification).

- [ ] **Step 1: Build + suite**

```bash
npm run check && npm test && npm run build
```
All must pass.

- [ ] **Step 2: Browser verification**

Start `PORT=3100 npm run dev` (log to a file; ensure `.env` has `ADMIN_PASSWORD` set; stop the server after). Then:
1. `/catalogo` — confirm there is **no "Editar"** control; browsing, gallery, and cart still work.
2. `/admin` — wrong password → "Senha incorreta"; correct password (`ADMIN_PASSWORD` from `.env`) → the product list appears.
3. **Create** a product (published) → it appears on `/catalogo`. In the dialog after create, **upload an image** → it shows on the card and in the cart thumbnail.
4. **Edit** a product: change a field; toggle **Publicado** off → it disappears from `/catalogo` (but remains in `/admin` with a "Rascunho" badge); toggle back on → reappears.
5. **Images:** upload multiple, **set cover** (cover changes on the card), **reorder** (←/→), **remove**.
6. **Reorder products** (↑/↓ in the list) → order changes on `/catalogo`.
7. **Delete** a product (confirm dialog) → gone from both.
8. **Sair** → back to the login form. In a fresh/incognito window, `/admin` shows only the login (no data); confirm a wrong password cannot read unpublished products (network: `listAll` returns 401).
9. Home/Contact still render; check a mobile width.
Stop the dev server (kill PID on 3100).

- [ ] **Step 3: (No new commit needed unless a fix was made during verification.)**

---

## Self-review notes

- **Spec coverage:** secret rename across server + docs (T1); shared types + compress util (T2); image CRUD UI (T3); product create/edit form incl. all fields + embedded images (T4); `/admin` route + login gate + list + reorder/delete (T5); remove catalog Editar (T6); browser verification incl. publish visibility + wrong-password can't read unpublished (T7). All covered.
- **Placeholder scan:** none — full component code + concrete commands.
- **Type consistency:** `AdminProduct`/`AdminImage` (T2) are used by `ImageManager` (T3), `ProductDialog` (T4), `Admin` (T5); mutation input shapes match the routers (`products.create/update/delete/reorder`, `images.add/delete/reorder/setCover`); the client bearer/`eps_admin_token` key matches `main.tsx`'s existing fetch wiring; `create.mutateAsync` returns the product whose `.id` drives the post-create ImageManager.
- **Bottom-up order** avoids dangling imports: each new file imports only already-built modules.
- **Auth:** after T1 the server reads `ADMIN_PASSWORD`; `/admin` login stores it under `eps_admin_token` and the existing fetch wrapper sends it — no client bearer change needed.
