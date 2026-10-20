import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PublicProduct } from "@/lib/types";
import { useCart } from "./CartContext";
import { CustomPieceDialog } from "./CustomPieceDialog";

type Props = { product: Pick<PublicProduct, "id" | "name" | "isCustom"> };

export function AddToCartButton({ product }: Props) {
  const { addItem, addCustomItem } = useCart();
  const [open, setOpen] = useState(false);

  const onClick = () => {
    if (product.isCustom) setOpen(true);
    else addItem({ productId: product.id, name: product.name });
  };

  return (
    <>
      <Button variant="outline" className="w-full" onClick={onClick}>
        <Plus className="mr-2 h-4 w-4" />
        Adicionar ao carrinho
      </Button>
      {product.isCustom && (
        <CustomPieceDialog
          open={open}
          onOpenChange={setOpen}
          mode="cart"
          onConfirm={({ note }) => addCustomItem({ productId: product.id, name: product.name, note })}
        />
      )}
    </>
  );
}
