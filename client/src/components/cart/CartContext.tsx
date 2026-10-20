import { createContext, useContext, useEffect, useReducer, useState, type ReactNode } from "react";
import { cartReducer, type CartItem } from "./cartReducer";
import { CART_KEY, CUSTOMER_KEY, LEGACY_CART_KEY, parseStoredCart, parseStoredCustomer, type Customer } from "./storage";

function read(key: string): string | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota/availability errors */
  }
}

function newLineId(): string {
  return crypto.randomUUID();
}

type CartContextValue = {
  items: CartItem[];
  addItem: (p: { productId: number; name: string }) => void;
  addCustomItem: (p: { productId: number; name: string; note: string }) => void;
  setQuantity: (lineId: string, quantity: number) => void;
  setNote: (lineId: string, note: string) => void;
  removeItem: (lineId: string) => void;
  clear: () => void;
  customer: Customer;
  setCustomer: (patch: Partial<Customer>) => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, dispatch] = useReducer(cartReducer, null, () => parseStoredCart(read(CART_KEY)));
  const [customer, setCustomerState] = useState<Customer>(() => parseStoredCustomer(read(CUSTOMER_KEY)));

  // The Batch 1 cart (name-keyed) is not migrated; drop it once.
  useEffect(() => {
    try {
      localStorage.removeItem(LEGACY_CART_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => write(CART_KEY, items), [items]);
  useEffect(() => write(CUSTOMER_KEY, customer), [customer]);

  // Sync when another tab changes the cart.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === CART_KEY) dispatch({ type: "replace", items: parseStoredCart(e.newValue) });
      if (e.key === CUSTOMER_KEY) setCustomerState(parseStoredCustomer(e.newValue));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const value: CartContextValue = {
    items,
    addItem: ({ productId, name }) => dispatch({ type: "add", lineId: newLineId(), productId, name }),
    addCustomItem: ({ productId, name, note }) =>
      dispatch({ type: "addCustom", lineId: newLineId(), productId, name, note }),
    setQuantity: (lineId, quantity) => dispatch({ type: "setQuantity", lineId, quantity }),
    setNote: (lineId, note) => dispatch({ type: "setNote", lineId, note }),
    removeItem: (lineId) => dispatch({ type: "remove", lineId }),
    clear: () => dispatch({ type: "clear" }),
    customer,
    setCustomer: (patch) => setCustomerState((c) => ({ ...c, ...patch })),
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
