import { createContext, useContext, useEffect, useReducer, type ReactNode } from "react";
import { cartReducer, totalCount, type CartItem } from "./cartReducer";

const STORAGE_KEY = "eps_cart";

function loadInitial(): CartItem[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (i) =>
          i &&
          typeof i.name === "string" &&
          typeof i.quantity === "number" &&
          i.quantity > 0
      );
    }
  } catch {
    /* corrupt value -> empty cart */
  }
  return [];
}

type CartContextValue = {
  items: CartItem[];
  totalCount: number;
  addItem: (name: string) => void;
  setQuantity: (name: string, quantity: number) => void;
  removeItem: (name: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, dispatch] = useReducer(cartReducer, undefined, loadInitial);

  // Persist on every change.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* ignore quota/availability errors */
    }
  }, [items]);

  // Sync when another tab changes the cart.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) dispatch({ type: "replace", items: loadInitial() });
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const value: CartContextValue = {
    items,
    totalCount: totalCount(items),
    addItem: (name) => dispatch({ type: "add", name }),
    setQuantity: (name, quantity) => dispatch({ type: "setQuantity", name, quantity }),
    removeItem: (name) => dispatch({ type: "remove", name }),
    clear: () => dispatch({ type: "clear" }),
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
