import type { ServiceName } from "@/lib/constants";
import { SERVICES } from "@/lib/constants";

export interface PricingConfig {
  basePrices: Record<ServiceName, number>;
  weekdayDiscountEnabled: boolean;
  weekdayDiscountDays: number[];
  weekdayDiscountAmount: number;
  depositAmount: number;
  updatedAt?: string;
}

export const PRICING_WEEKDAYS = [1, 2, 3, 4, 5, 6] as const;

export function validatePricingConfig(config: PricingConfig): string | null {
  for (const s of SERVICES) {
    const p = config.basePrices[s];
    if (!p || p < 1000) return `Precio inválido para ${s}.`;
  }
  if (config.depositAmount < 0) return "La seña no puede ser negativa.";
  return null;
}
