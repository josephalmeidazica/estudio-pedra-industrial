import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PublicProduct } from "@/lib/types";
import { useCart } from "./CartContext";
import { CustomPieceDialog } from "./CustomPieceDialog";

type Props = {
  product: Pick<PublicProduct, "id" | "name" | "isCustom">;
  className?: string;
  variant?: "outline" | "ghost";
  /** Bag-with-plus glyph only (phone action bar); the label stays as the accessible name. */
  iconOnly?: boolean;
};

export function AddToCartButton({ product, className, variant = "outline", iconOnly }: Props) {
  const { addItem, addCustomItem } = useCart();
  const [open, setOpen] = useState(false);

  const onClick = () => {
    if (product.isCustom) setOpen(true);
    else addItem({ productId: product.id, name: product.name });
  };

  return (
    <>
      <Button
        variant={variant}
        className={cn("w-full", className)}
        onClick={onClick}
        aria-label={iconOnly ? "Adicionar ao carrinho" : undefined}
      >
        {iconOnly ? (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="!size-[22px]"
            aria-hidden="true"
          >
            <path d="M5 8h14l-1 13H6L5 8z" />
            <path d="M9 8V6a3 3 0 0 1 6 0v2" />
            <path d="M12 12v6M9 15h6" />
          </svg>
        ) : (
          <>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar ao carrinho
          </>
        )}
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
