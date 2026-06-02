import { SERVICES, type ServiceName } from "@/lib/constants";
import { parseDateDMY } from "./dates";
import { DEFAULT_PRICING_CONFIG, mergePricingConfig } from "@/lib/pricing-config";
import type { PricingConfig } from "@/lib/types/pricing";

export function getServicePrice(
  service: ServiceName,
  dateString?: string,
  config?: PricingConfig | null
): number {
  const pricing = config ?? DEFAULT_PRICING_CONFIG;

  let dow: number;
  if (dateString) {
    const d = parseDateDMY(dateString);
    dow = d ? d.getDay() : new Date().getDay();
  } else {
    dow = new Date().getDay();
  }

  let price = pricing.basePrices[service];
  if (
    pricing.weekdayDiscountEnabled &&
    pricing.weekdayDiscountDays.includes(dow)
  ) {
    price -= pricing.weekdayDiscountAmount;
  }
  return price;
}

export function formatPriceARS(amount: number): string {
  return `$${amount.toLocaleString("es-AR")}`;
}

export function getServiceOptions(
  dateString?: string,
  config?: PricingConfig | null
): { value: ServiceName; label: string; price: number }[] {
  return SERVICES.map((service) => {
    const price = getServicePrice(service, dateString, config);
    return {
      value: service,
      label: `${service} ${formatPriceARS(price)}`,
      price,
    };
  });
}

/** Precios de lista (sin descuento por día) — para la home y cartelería. */
export function getServiceBasePriceOptions(
  config?: PricingConfig | null
): { value: ServiceName; label: string; price: number }[] {
  const pricing = config ?? DEFAULT_PRICING_CONFIG;
  return SERVICES.map((service) => {
    const price = pricing.basePrices[service];
    return {
      value: service,
      label: `${service} ${formatPriceARS(price)}`,
      price,
    };
  });
}

/** Finance panel price resolver */
export function getPriceFromServiceString(
  service: string,
  dateString: string,
  config?: PricingConfig | null
): number {
  const pricing = config ?? DEFAULT_PRICING_CONFIG;
  const parts = dateString.split("/");
  if (parts.length !== 3) return 0;
  const date = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
  const day = date.getDay();

  const discounted = (base: number) =>
    pricing.weekdayDiscountEnabled && pricing.weekdayDiscountDays.includes(day)
      ? base - pricing.weekdayDiscountAmount
      : base;

  if (service.includes("Corte + Barba")) return discounted(pricing.basePrices["Corte + Barba"]);
  if (service.includes("Corte")) return discounted(pricing.basePrices.Corte);
  if (service.includes("Barba")) return discounted(pricing.basePrices.Barba);
  return 0;
}

export function getDepositAmount(config?: PricingConfig | null): number {
  return (config ?? DEFAULT_PRICING_CONFIG).depositAmount;
}

export { mergePricingConfig, DEFAULT_PRICING_CONFIG };
