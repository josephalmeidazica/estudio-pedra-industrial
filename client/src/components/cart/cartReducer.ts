export type CartItem = { name: string; quantity: number };

export type CartAction =
  | { type: "add"; name: string }
  | { type: "setQuantity"; name: string; quantity: number }
  | { type: "remove"; name: string }
  | { type: "clear" }
  | { type: "replace"; items: CartItem[] };

export function cartReducer(items: CartItem[], action: CartAction): CartItem[] {
  switch (action.type) {
    case "add": {
      const exists = items.some((i) => i.name === action.name);
      if (exists) {
        return items.map((i) =>
          i.name === action.name ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...items, { name: action.name, quantity: 1 }];
    }
    case "setQuantity": {
      if (action.quantity <= 0) return items.filter((i) => i.name !== action.name);
      return items.map((i) =>
        i.name === action.name ? { ...i, quantity: action.quantity } : i
      );
    }
    case "remove":
      return items.filter((i) => i.name !== action.name);
    case "clear":
      return [];
    case "replace":
      return action.items;
    default:
      return items;
  }
}

export function totalCount(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.quantity, 0);
}
