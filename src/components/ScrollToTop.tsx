"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/cn";

// Bouton flottant « Remonter en haut ».
// Détecte automatiquement le conteneur défilant : la fenêtre pour la vitrine
// publique, ou le conteneur interne `overflow-y-auto` de l'application.
export function ScrollToTop({ threshold = 300 }: { threshold?: number }) {
  const sentinelRef = useRef<HTMLSpanElement>(null);
  const targetRef = useRef<HTMLElement | Window | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Plus proche ancêtre réellement défilant ; sinon, la fenêtre.
    function findScrollParent(el: HTMLElement | null): HTMLElement | Window {
      let node = el?.parentElement ?? null;
      while (node) {
        const oy = getComputedStyle(node).overflowY;
        if ((oy === "auto" || oy === "scroll") && node.scrollHeight > node.clientHeight) {
          return node;
        }
        node = node.parentElement;
      }
      return window;
    }

    const target = findScrollParent(sentinelRef.current);
    targetRef.current = target;

    const getTop = () => (target === window ? window.scrollY : (target as HTMLElement).scrollTop);
    const onScroll = () => setVisible(getTop() > threshold);

    onScroll(); // état initial (page déjà défilée)
    target.addEventListener("scroll", onScroll, { passive: true });
    return () => target.removeEventListener("scroll", onScroll);
  }, [threshold]);

  const scrollToTop = useCallback(() => {
    const target = targetRef.current;
    if (!target) return;
    if (target === window) window.scrollTo({ top: 0, behavior: "smooth" });
    else (target as HTMLElement).scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <>
      {/* Repère invisible servant à localiser le conteneur défilant. */}
      <span ref={sentinelRef} aria-hidden className="hidden" />
      <button
        type="button"
        onClick={scrollToTop}
        aria-label="Remonter en haut de la page"
        title="Remonter en haut"
        className={cn(
          "fixed bottom-6 right-6 z-50 flex h-11 w-11 items-center justify-center rounded-full",
          "bg-brand-interactive text-white shadow-lg transition-all duration-200",
          "hover:bg-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-interactive focus-visible:ring-offset-2",
          visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"
        )}
      >
        <ArrowUp size={20} aria-hidden />
      </button>
    </>
  );
}
