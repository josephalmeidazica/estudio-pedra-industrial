import { useEffect, useRef, useState, type RefObject } from "react";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { QuoteButton } from "@/components/catalog/QuoteButton";
import type { PublicProduct } from "@/lib/types";

const PHONE = "(max-width: 639px)";
const BAR_PADDING = "calc(76px + env(safe-area-inset-bottom))";

type Props = {
  product: PublicProduct;
  /** The in-flow actions group; the bar shows while it is out of view. */
  anchorRef: RefObject<HTMLElement | null>;
  onVisibilityChange: (visible: boolean) => void;
};

/** Fixed quote + cart bar on phones, shown when the in-flow actions scroll out of view. */
export function MobileActionBar({ product, anchorRef, onVisibilityChange }: Props) {
  const [phone, setPhone] = useState(() => window.matchMedia(PHONE).matches);
  const [anchorVisible, setAnchorVisible] = useState(true);
  const notify = useRef(onVisibilityChange);
  notify.current = onVisibilityChange;

  useEffect(() => {
    const mq = window.matchMedia(PHONE);
    const onChange = () => setPhone(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const el = anchorRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setAnchorVisible(entry.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, [anchorRef, product.id]);

  const show = phone && !anchorVisible;

  useEffect(() => {
    notify.current(show);
    return () => notify.current(false);
  }, [show]);

  useEffect(() => {
    if (!show) return;
    const prev = document.body.style.paddingBottom;
    document.body.style.paddingBottom = BAR_PADDING;
    return () => {
      document.body.style.paddingBottom = prev;
    };
  }, [show]);

  if (!show) return null;
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 flex gap-2.5 border-t border-border bg-background px-5 pt-3"
      style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
    >
      <AddToCartButton product={product} iconOnly className="h-12 w-[52px] shrink-0 px-0" />
      <QuoteButton product={product} className="h-12 flex-1 text-xs font-medium uppercase tracking-[0.12em]" />
    </div>
  );
}
