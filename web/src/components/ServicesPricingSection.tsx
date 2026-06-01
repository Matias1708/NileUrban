"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { loadPricingConfig } from "@/lib/pricing-store";
import { formatPriceARS, getServiceOptions } from "@/lib/scheduling/pricing";
import type { PricingConfig } from "@/lib/types/pricing";
import { WEEKDAY_LABELS } from "@/lib/types/schedule";

export function ServicesPricingSection() {
  const [pricing, setPricing] = useState<PricingConfig | null>(null);

  useEffect(() => {
    loadPricingConfig().then(setPricing).catch(() => setPricing(null));
  }, []);

  const services = getServiceOptions(undefined, pricing);

  const discountText =
    pricing?.weekdayDiscountEnabled && pricing.weekdayDiscountDays.length
      ? `${pricing.weekdayDiscountDays.map((d) => WEEKDAY_LABELS[d]).join(", ")}: ${formatPriceARS(pricing.weekdayDiscountAmount)} de descuento en todos los servicios`
      : "Lunes a miércoles: $2.000 de descuento en todos los servicios";

  return (
    <section id="servicios" className="bg-surface py-20">
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="text-3xl font-bold text-gold">Servicios y precios</h2>
        <p className="mt-2 text-muted">{discountText}</p>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {services.map((s) => (
            <div key={s.value} className="card text-center">
              <h3 className="text-xl font-semibold">{s.value}</h3>
              <p className="mt-2 text-2xl font-bold text-gold">{formatPriceARS(s.price)}</p>
              <p className="mt-2 text-sm text-muted">Duración aprox. 40 min</p>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-muted">
          <Link href="/politica-cancelacion" className="text-gold hover:underline">
            Ver política de cancelación
          </Link>
        </p>
      </div>
    </section>
  );
}
