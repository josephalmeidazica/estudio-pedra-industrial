import { useState } from "react";
import { ImageOff, MessageCircle, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { buildWhatsAppUrl } from "./whatsapp";

export function CartWidget() {
  const { items, totalCount, setQuantity, removeItem, clear } = useCart();
  const { data: products = [] } = trpc.products.list.useQuery();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const canCheckout = items.length > 0 && name.trim().length > 0;

  // Join cart lines (by name) to product cover image + category for display only.
  const infoByName = new Map(
    products.map((p) => [p.name, { url: p.images[0]?.url, category: p.category }])
  );

  const checkout = () => {
    if (!canCheckout) return;
    window.open(buildWhatsAppUrl(name, items), "_blank", "noopener,noreferrer");
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
        {totalCount > 0 && (
          <Badge className="absolute -right-1 -top-1 h-5 min-w-5 justify-center rounded-full px-1 text-xs">
            {totalCount}
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
              {items.map((item) => {
                const info = infoByName.get(item.name);
                return (
                  <div key={item.name} className="flex items-center gap-3">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md border bg-muted">
                      {info?.url ? (
                        <img src={info.url} alt={item.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                          <ImageOff className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.name}</p>
                      {info?.category ? (
                        <p className="truncate text-xs text-muted-foreground">{info.category}</p>
                      ) : null}
                    </div>
                    <div className="flex items-center rounded-md border">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        aria-label="Diminuir quantidade"
                        onClick={() => setQuantity(item.name, item.quantity - 1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-6 text-center text-sm">{item.quantity}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        aria-label="Aumentar quantidade"
                        onClick={() => setQuantity(item.name, item.quantity + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground"
                      aria-label="Remover item"
                      onClick={() => removeItem(item.name)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          <Separator />
          <SheetFooter className="flex-col gap-3 sm:flex-col sm:space-x-0">
            {items.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ShoppingBag className="h-4 w-4" />
                <span>
                  {totalCount} {totalCount === 1 ? "item" : "itens"}
                </span>
              </div>
            )}
            <label htmlFor="cart-customer-name" className="sr-only">
              Seu nome
            </label>
            <Input
              id="cart-customer-name"
              placeholder="Seu nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Button className="w-full" disabled={!canCheckout} onClick={checkout}>
              <MessageCircle className="mr-2 h-4 w-4" />
              Finalizar pedido no WhatsApp
            </Button>
            {items.length > 0 && (
              <Button
                variant="ghost"
                className="w-full text-muted-foreground"
                onClick={clear}
              >
                Limpar carrinho
              </Button>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
