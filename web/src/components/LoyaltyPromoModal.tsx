"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LOYALTY_CYCLE, LOYALTY_CYCLE_DAYS } from "@/lib/loyalty-logic";

const SESSION_KEY = "nile_loyalty_promo_seen";
const OPEN_DELAY_MS = 900;
const AUTO_CLOSE_MS = 8000;

export function LoyaltyPromoModal() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);

  const dismiss = useCallback(() => {
    setClosing(true);
    window.setTimeout(() => {
      setVisible(false);
      setClosing(false);
      try {
        sessionStorage.setItem(SESSION_KEY, "1");
      } catch {
        /* private browsing */
      }
    }, 320);
  }, []);

  useEffect(() => {
    if (pathname.startsWith("/staff") || pathname === "/fidelidad") return;

    let seen = false;
    try {
      seen = sessionStorage.getItem(SESSION_KEY) === "1";
    } catch {
      seen = false;
    }
    if (seen) return;

    const openTimer = window.setTimeout(() => setVisible(true), OPEN_DELAY_MS);
    return () => window.clearTimeout(openTimer);
  }, [pathname]);

  useEffect(() => {
    if (!visible || closing) return;
    const closeTimer = window.setTimeout(dismiss, AUTO_CLOSE_MS);
    return () => window.clearTimeout(closeTimer);
  }, [visible, closing, dismiss]);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, dismiss]);

  if (!visible) return null;

  return (
    <div
      className={`loyalty-promo-bar ${closing ? "is-closing" : "is-open"}`}
      role="region"
      aria-live="polite"
      aria-labelledby="loyalty-promo-title"
    >
      <div className="loyalty-promo-bar-accent" aria-hidden />

      <div className="loyalty-promo-bar-inner loyalty-promo-bar-inner--simple">
        <div className="loyalty-promo-bar-copy">
          <p className="loyalty-promo-eyebrow">Programa de fidelidad</p>
          <h2 id="loyalty-promo-title" className="loyalty-promo-bar-title">
            Sumá puntos en cada visita y canjeá premios
          </h2>
          <p className="loyalty-promo-bar-sub">
            1 visita = 1 punto · hasta corte gratis · ciclo de {LOYALTY_CYCLE} visitas · renueva
            cada {LOYALTY_CYCLE_DAYS} días
          </p>
        </div>

        <div className="loyalty-promo-bar-actions">
          <Link href="/fidelidad" className="loyalty-promo-bar-cta" onClick={dismiss}>
            Ver programa
          </Link>
          <button
            type="button"
            onClick={dismiss}
            className="loyalty-promo-bar-close"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>
      </div>

      <div
        className="loyalty-promo-bar-timer"
        style={{ animationDuration: `${AUTO_CLOSE_MS}ms` }}
        aria-hidden
      />
    </div>
  );
}
