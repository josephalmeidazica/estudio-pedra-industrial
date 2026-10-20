import { useEffect } from "react";

/**
 * Keep the tab title right after in-app navigation. The server renders the
 * same strings (shared/seo-text.ts) into the initial HTML; this only matters
 * once wouter swaps pages without a reload. Undefined = leave the title alone
 * (e.g. while a product is still loading).
 */
export function usePageTitle(title: string | undefined): void {
  useEffect(() => {
    if (title === undefined) return;
    const previous = document.title;
    document.title = title;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
