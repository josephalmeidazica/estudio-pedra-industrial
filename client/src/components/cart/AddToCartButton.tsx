import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PublicProduct } from "@/lib/types";
import { useCart } from "./CartContext";
import { CustomPieceDialog } from "./CustomPieceDialog";

type Props = { product: Pick<PublicProduct, "id" | "name" | "isCustom">; className?: string; variant?: "outline" | "ghost"; hideIcon?: boolean };

export function AddToCartButton({ product, className, variant = "outline", hideIcon }: Props) {
  const { addItem, addCustomItem } = useCart();
  const [open, setOpen] = useState(false);

  const onClick = () => {
    if (product.isCustom) setOpen(true);
    else addItem({ productId: product.id, name: product.name });
  };

  return (
    <>
      <Button variant={variant} className={cn("w-full", className)} onClick={onClick}>
        {hideIcon ? null : <Plus className="mr-2 h-4 w-4" />}
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
