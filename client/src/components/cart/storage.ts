import type { CartItem } from "./cartReducer";

export const CART_KEY = "eps_cart_v2";
/** Batch 1 key (name-keyed lines); removed on first load, never read. */
export const LEGACY_CART_KEY = "eps_cart";
export const CUSTOMER_KEY = "eps_customer";

export type Customer = { name: string; bairro: string };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

/** Keep only well-formed lines; anything else (old shapes, hand edits) is dropped. */
export function parseStoredCart(raw: string | null): CartItem[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const out: CartItem[] = [];
  for (const v of parsed) {
    if (!isRecord(v)) continue;
    const { lineId, productId, name, quantity, note } = v;
    if (typeof lineId !== "string" || !lineId) continue;
    if (typeof productId !== "number" || !Number.isInteger(productId)) continue;
    if (typeof name !== "string") continue;
    if (typeof quantity !== "number" || !(quantity > 0)) continue;
    if (note !== undefined && typeof note !== "string") continue;
    out.push(note === undefined ? { lineId, productId, name, quantity } : { lineId, productId, name, quantity, note });
  }
  return out;
}

export function parseStoredCustomer(raw: string | null): Customer {
  const empty: Customer = { name: "", bairro: "" };
  if (!raw) return empty;
  try {
    const v: unknown = JSON.parse(raw);
    if (!isRecord(v)) return empty;
    return {
      name: typeof v.name === "string" ? v.name : "",
      bairro: typeof v.bairro === "string" ? v.bairro : "",
    };
  } catch {
    return empty;
  }
}
