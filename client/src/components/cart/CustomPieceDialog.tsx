import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCart } from "./CartContext";
import type { Customer } from "./storage";

export const NOTE_MAX = 500;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** "cart" adds a line; "quote" also asks name + bairro and goes straight to WhatsApp. */
  mode: "cart" | "quote";
  initialNote?: string;
  onConfirm: (result: { note: string; customer?: Customer }) => void;
};

/** Asks for a description of the custom piece ("Móvel personalizado"). */
export function CustomPieceDialog({ open, onOpenChange, mode, initialNote = "", onConfirm }: Props) {
  const { customer } = useCart();
  const [note, setNote] = useState(initialNote);
  const [name, setName] = useState(customer.name);
  const [bairro, setBairro] = useState(customer.bairro);

  // Reset the fields every time the dialog opens.
  useEffect(() => {
    if (open) {
      setNote(initialNote);
      setName(customer.name);
      setBairro(customer.bairro);
    }
  }, [open, initialNote, customer.name, customer.bairro]);

  const askCustomer = mode === "quote";
  const canConfirm =
    note.trim().length > 0 && (!askCustomer || (name.trim().length > 0 && bairro.trim().length > 0));

  const confirm = () => {
    if (!canConfirm) return;
    onConfirm(askCustomer ? { note: note.trim(), customer: { name, bairro } } : { note: note.trim() });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Descreva o móvel que você quer</DialogTitle>
          <DialogDescription>
            Conte em poucas palavras o que você imagina; o estúdio responde com um orçamento sob medida.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="custom-note">Descrição</Label>
            <Textarea
              id="custom-note"
              required
              maxLength={NOTE_MAX}
              rows={4}
              placeholder="Ex.: mesa de jantar 2 m, tampo em MDF amadeirado, pés em aço preto"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <p className="text-right text-xs text-muted-foreground">
              {note.length}/{NOTE_MAX}
            </p>
          </div>
          {askCustomer && (
            <>
              <div className="space-y-1">
                <Label htmlFor="custom-name">Seu nome</Label>
                <Input id="custom-name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="custom-bairro">Seu bairro</Label>
                <Input
                  id="custom-bairro"
                  placeholder="Ex.: Savassi, Belo Horizonte"
                  value={bairro}
                  onChange={(e) => setBairro(e.target.value)}
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={confirm} disabled={!canConfirm}>
            {askCustomer ? "Enviar no WhatsApp" : "Adicionar ao carrinho"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
