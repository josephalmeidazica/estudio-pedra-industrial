export type CartItem = {
  /** Random id generated when the line is created; the key for every edit. */
  lineId: string;
  productId: number;
  /** Display snapshot; the live name comes from products.list at render time. */
  name: string;
  quantity: number;
  /** Only the custom piece ("Móvel personalizado") carries a description. */
  note?: string;
};

export type CartAction =
  | { type: "add"; lineId: string; productId: number; name: string }
  | { type: "addCustom"; lineId: string; productId: number; name: string; note: string }
  | { type: "setQuantity"; lineId: string; quantity: number }
  | { type: "setNote"; lineId: string; note: string }
  | { type: "remove"; lineId: string }
  | { type: "clear" }
  | { type: "replace"; items: CartItem[] };

export function cartReducer(items: CartItem[], action: CartAction): CartItem[] {
  switch (action.type) {
    case "add": {
      const existing = items.find((i) => i.productId === action.productId && i.note === undefined);
      if (existing) {
        return items.map((i) => (i.lineId === existing.lineId ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...items, { lineId: action.lineId, productId: action.productId, name: action.name, quantity: 1 }];
    }
    case "addCustom":
      return [
        ...items,
        { lineId: action.lineId, productId: action.productId, name: action.name, quantity: 1, note: action.note },
      ];
    case "setQuantity": {
      if (action.quantity <= 0) return items.filter((i) => i.lineId !== action.lineId);
      return items.map((i) => (i.lineId === action.lineId ? { ...i, quantity: action.quantity } : i));
    }
    case "setNote":
      return items.map((i) => (i.lineId === action.lineId ? { ...i, note: action.note } : i));
    case "remove":
      return items.filter((i) => i.lineId !== action.lineId);
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
