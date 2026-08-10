import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "./CartContext";

export function AddToCartButton({ name }: { name: string }) {
  const { addItem } = useCart();
  return (
    <Button variant="outline" className="w-full" onClick={() => addItem(name)}>
      <Plus className="mr-2 h-4 w-4" />
      Adicionar ao carrinho
    </Button>
  );
}
