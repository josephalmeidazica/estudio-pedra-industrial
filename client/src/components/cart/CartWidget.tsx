import { useState } from "react";
import { ImageOff, MessageCircle, Minus, Pencil, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResponseBadge } from "@/components/ui/ResponseBadge";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { trpc } from "@/lib/trpc";
import { useCart } from "./CartContext";
import { totalCount } from "./cartReducer";
import { CustomPieceDialog } from "./CustomPieceDialog";
import { DeadlineChips } from "./DeadlineChips";
import { resolveCartLines, toMessageLines, type ResolvedLine } from "./resolve";
import { buildWhatsAppUrl } from "./whatsapp";

export function CartWidget() {
  const { items, setQuantity, setNote, removeItem, clear, customer, setCustomer } = useCart();
  const productsQuery = trpc.products.list.useQuery();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ResolvedLine | null>(null);

  // Until the catalog has loaded, lines keep their snapshot names and nothing is judged unavailable.
  const { available, unavailable, pending } = resolveCartLines(
    items,
    productsQuery.isSuccess ? productsQuery.data : undefined
  );
  const count = totalCount(available);
  const canCheckout =
    !pending && available.length > 0 && customer.name.trim().length > 0 && customer.bairro.trim().length > 0;

  const checkout = () => {
    if (!canCheckout) return;
    const lines = toMessageLines(available, window.location.origin);
    window.open(buildWhatsAppUrl(customer, lines), "_blank", "noopener,noreferrer");
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        aria-label="Abrir carrinho"
        onClick={() => setOpen(true)}
      >
        <ShoppingBag className="h-5 w-5" />
        {count > 0 && (
          <Badge className="absolute -right-1 -top-1 h-5 min-w-5 justify-center rounded-full bg-accent px-1 text-xs text-accent-foreground">
            {count}
          </Badge>
        )}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="flex w-full flex-col sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Seu carrinho</SheetTitle>
            <SheetDescription className="sr-only">
              Revise os itens do seu carrinho e finalize o pedido pelo WhatsApp.
            </SheetDescription>
          </SheetHeader>

          {items.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
              <ShoppingBag className="h-10 w-10 opacity-40" />
              <p className="font-medium">Seu carrinho está vazio</p>
              <p className="text-sm">Adicione produtos do catálogo.</p>
            </div>
          ) : (
            <div className="flex-1 space-y-3 overflow-y-auto py-4">
              {available.map((line) => (
                <div key={line.lineId} className="flex items-start gap-3">
                  <div className="h-12 w-12 shrink-0 overflow-hidden border bg-muted">
                    {line.thumb ? (
                      <img src={line.thumb} alt={line.liveName} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                        <ImageOff className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{line.liveName}</p>
                    {line.note !== undefined ? (
                      <p className="line-clamp-2 text-xs text-muted-foreground">{line.note}</p>
                    ) : line.category ? (
                      <p className="truncate text-xs text-muted-foreground">{line.category}</p>
                    ) : null}
                  </div>
                  {line.note !== undefined ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      aria-label="Editar descrição"
                      onClick={() => setEditing(line)}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                  ) : (
                    <div className="flex items-center border">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        aria-label="Diminuir quantidade"
                        onClick={() => setQuantity(line.lineId, line.quantity - 1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-6 text-center text-sm">{line.quantity}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        aria-label="Aumentar quantidade"
                        onClick={() => setQuantity(line.lineId, line.quantity + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground"
                    aria-label="Remover item"
                    onClick={() => removeItem(line.lineId)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}

              {unavailable.map((line) => (
                <div key={line.lineId} className="flex items-center gap-3 opacity-60">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center border bg-muted text-muted-foreground">
                    <ImageOff className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium line-through">{line.name}</p>
                    <p className="text-xs text-muted-foreground">Produto indisponível</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground"
                    aria-label="Remover item"
                    onClick={() => removeItem(line.lineId)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <Separator />
          <SheetFooter className="flex-col gap-3 sm:flex-col sm:space-x-0">
            {productsQuery.isError && (
              <p className="text-sm text-destructive">
                Não foi possível carregar o catálogo. Verifique sua conexão e tente de novo.
              </p>
            )}
            {available.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ShoppingBag className="h-4 w-4" />
                <span>
                  {count} {count === 1 ? "item" : "itens"}
                </span>
              </div>
            )}
            <label htmlFor="cart-customer-name" className="sr-only">
              Seu nome
            </label>
            <Input
              id="cart-customer-name"
              placeholder="Seu nome"
              value={customer.name}
              onChange={(e) => setCustomer({ name: e.target.value })}
            />
            <label htmlFor="cart-customer-bairro" className="sr-only">
              Seu bairro
            </label>
            <Input
              id="cart-customer-bairro"
              placeholder="Seu bairro (ex.: Savassi, Belo Horizonte)"
              value={customer.bairro}
              onChange={(e) => setCustomer({ bairro: e.target.value })}
            />
            <label htmlFor="cart-customer-measurements" className="sr-only">
              Medidas aproximadas
            </label>
            <Input
              id="cart-customer-measurements"
              placeholder="Medidas aproximadas (ex.: 120 × 60 cm, altura 75)"
              value={customer.measurements ?? ""}
              onChange={(e) => setCustomer({ measurements: e.target.value })}
            />
            <div className="space-y-2">
              <p className="text-sm font-medium">Para quando precisa?</p>
              <DeadlineChips value={customer.deadline} onChange={(deadline) => setCustomer({ deadline })} />
            </div>
            <ResponseBadge className="self-start" />
            <Button className="w-full" disabled={!canCheckout} onClick={checkout}>
              <MessageCircle className="mr-2 h-4 w-4" />
              Finalizar pedido no WhatsApp
            </Button>
            <p className="text-xs text-muted-foreground">
              Preencha o bairro para enviar. Medidas e prazo são opcionais.
            </p>
            {items.length > 0 && (
              <Button variant="ghost" className="w-full text-muted-foreground" onClick={clear}>
                Limpar carrinho
              </Button>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {editing && (
        <CustomPieceDialog
          open={editing !== null}
          onOpenChange={(o) => !o && setEditing(null)}
          mode="cart"
          initialNote={editing.note}
          onConfirm={({ note }) => setNote(editing.lineId, note)}
        />
      )}
    </>
  );
}
