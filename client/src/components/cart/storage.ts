import type { CartItem } from "./cartReducer";

export const CART_KEY = "eps_cart_v2";
/** Batch 1 key (name-keyed lines); removed on first load, never read. */
export const LEGACY_CART_KEY = "eps_cart";
export const CUSTOMER_KEY = "eps_customer";

export type Deadline =
  | { kind: "sem-pressa" }
  | { kind: "ate-1-mes" }
  | { kind: "ate-2-meses" }
  | { kind: "data"; when: string };

export type Customer = { name: string; bairro: string; measurements?: string; deadline?: Deadline };

/** Text for the WhatsApp message; null when there is nothing to say (empty free-form date). */
export function deadlineLabel(d: Deadline): string | null {
  switch (d.kind) {
    case "sem-pressa":
      return "Sem pressa";
    case "ate-1-mes":
      return "Em até 1 mês";
    case "ate-2-meses":
      return "Em até 2 meses";
    case "data":
      return d.when.trim() || null;
  }
}

function parseDeadline(v: unknown): Deadline | undefined {
  if (!isRecord(v)) return undefined;
  switch (v.kind) {
    case "sem-pressa":
    case "ate-1-mes":
    case "ate-2-meses":
      return { kind: v.kind };
    case "data":
      return typeof v.when === "string" ? { kind: "data", when: v.when } : undefined;
    default:
      return undefined;
  }
}

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
    const customer: Customer = {
      name: typeof v.name === "string" ? v.name : "",
      bairro: typeof v.bairro === "string" ? v.bairro : "",
    };
    if (typeof v.measurements === "string") customer.measurements = v.measurements;
    const deadline = parseDeadline(v.deadline);
    if (deadline) customer.deadline = deadline;
    return customer;
  } catch {
    return empty;
  }
}
