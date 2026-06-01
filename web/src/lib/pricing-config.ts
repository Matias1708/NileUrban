import { BASE_PRICES, DEPOSIT_AMOUNT, SERVICES, type ServiceName } from "@/lib/constants";
import type { PricingConfig } from "@/lib/types/pricing";

export const DEFAULT_PRICING_CONFIG: PricingConfig = {
  basePrices: { ...BASE_PRICES },
  weekdayDiscountEnabled: true,
  weekdayDiscountDays: [1, 2, 3],
  weekdayDiscountAmount: 2000,
  depositAmount: DEPOSIT_AMOUNT,
};

export function mergePricingConfig(partial: Partial<PricingConfig> | null): PricingConfig {
  if (!partial) return { ...DEFAULT_PRICING_CONFIG, basePrices: { ...DEFAULT_PRICING_CONFIG.basePrices } };
  return {
    ...DEFAULT_PRICING_CONFIG,
    ...partial,
    basePrices: { ...DEFAULT_PRICING_CONFIG.basePrices, ...partial.basePrices },
  };
}

export function emptyPricingDraft(): PricingConfig {
  return mergePricingConfig(null);
}
