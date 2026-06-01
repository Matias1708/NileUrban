import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { SALON } from "@/lib/constants";
import { DEFAULT_PRICING_CONFIG, mergePricingConfig } from "@/lib/pricing-config";
import type { PricingConfig } from "@/lib/types/pricing";

const SALON_DOC = "salon_config";

let cachedPricing: PricingConfig | null = null;
let cacheTime = 0;
const CACHE_MS = 60_000;

export async function loadPricingConfig(force = false): Promise<PricingConfig> {
  if (!force && cachedPricing && Date.now() - cacheTime < CACHE_MS) {
    return cachedPricing;
  }

  try {
    const snap = await getDoc(doc(db, SALON_DOC, SALON.id));
    if (snap.exists() && snap.data().pricing) {
      cachedPricing = mergePricingConfig(snap.data().pricing as Partial<PricingConfig>);
    } else {
      cachedPricing = mergePricingConfig(null);
    }
  } catch {
    cachedPricing = mergePricingConfig(null);
  }

  cacheTime = Date.now();
  return cachedPricing;
}

export async function savePricingConfig(config: PricingConfig): Promise<void> {
  await setDoc(
    doc(db, SALON_DOC, SALON.id),
    { pricing: { ...config, updatedAt: new Date().toISOString() } },
    { merge: true }
  );
  cachedPricing = null;
}

export async function seedDefaultPricingIfMissing(): Promise<void> {
  const snap = await getDoc(doc(db, SALON_DOC, SALON.id));
  if (snap.exists() && snap.data().pricing) return;
  await savePricingConfig(DEFAULT_PRICING_CONFIG);
}

export function invalidatePricingCache(): void {
  cachedPricing = null;
  cacheTime = 0;
}
