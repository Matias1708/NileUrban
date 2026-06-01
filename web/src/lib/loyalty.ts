import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  query,
  where,
  type DocumentReference,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { normalizePhone, phoneLookupVariants } from "@/lib/phone";
import type { LoyaltyProfile, LoyaltyRewardId } from "@/lib/types/booking";
import {
  applyVisitToLoyalty,
  normalizeLoyaltyCycle,
} from "@/lib/loyalty-logic";

export {
  LOYALTY_CYCLE,
  LOYALTY_CYCLE_DAYS,
  LOYALTY_MILESTONES,
  LOYALTY_REWARD_LABELS,
  getLoyaltyProgress,
  getPrimaryPendingReward,
  applyVisitToLoyalty,
  daysUntilCycleReset,
  isLoyaltyCycleExpired,
  normalizeLoyaltyCycle,
  formatLoyaltyWhatsAppMessage,
  buildLoyaltyWhatsAppUrl,
} from "@/lib/loyalty-logic";
export type { LoyaltyProgress } from "@/lib/loyalty-logic";

export interface LoyaltyProfileWithId extends LoyaltyProfile {
  id: string;
}

async function findLoyaltyDoc(contacto: string) {
  const normalized = normalizePhone(contacto);
  if (!normalized) return null;

  for (const variant of phoneLookupVariants(contacto)) {
    const snap = await getDocs(query(collection(db, "loyalty"), where("contacto", "==", variant)));
    if (!snap.empty) {
      return { ref: snap.docs[0].ref, data: snap.docs[0].data() as LoyaltyProfile };
    }
  }

  const byNormalized = await getDocs(
    query(collection(db, "loyalty"), where("contacto", "==", normalized))
  );
  if (!byNormalized.empty) {
    return { ref: byNormalized.docs[0].ref, data: byNormalized.docs[0].data() as LoyaltyProfile };
  }

  return null;
}

async function persistLoyaltyCycle(ref: DocumentReference, profile: LoyaltyProfile): Promise<void> {
  await updateDoc(ref, {
    points: profile.points,
    pendingRewards: profile.pendingRewards ?? [],
    cycleStartedAt: profile.cycleStartedAt,
  });
}

function loyaltyUpdateData(profile: LoyaltyProfile) {
  return {
    contacto: profile.contacto,
    nombre: profile.nombre,
    points: profile.points,
    totalVisits: profile.totalVisits,
    pendingRewards: profile.pendingRewards ?? [],
    lastVisit: profile.lastVisit,
    cycleStartedAt: profile.cycleStartedAt,
  };
}

async function loadNormalizedLoyalty(found: {
  ref: DocumentReference;
  data: LoyaltyProfile;
}): Promise<LoyaltyProfile> {
  const { profile, needsPersist } = normalizeLoyaltyCycle(found.data);
  if (needsPersist) {
    await persistLoyaltyCycle(found.ref, profile);
  }
  return profile;
}

export async function getLoyaltyByPhone(contacto: string): Promise<LoyaltyProfile | null> {
  const found = await findLoyaltyDoc(contacto);
  if (!found) return null;
  return loadNormalizedLoyalty(found);
}

export async function getLoyaltyProfilesForPhones(
  phones: string[]
): Promise<Record<string, LoyaltyProfile>> {
  const normalizedKeys = new Map<string, string>();
  for (const phone of phones) {
    const n = normalizePhone(phone);
    if (n) normalizedKeys.set(n, phone);
  }

  const result: Record<string, LoyaltyProfile> = {};
  await Promise.all(
    [...normalizedKeys.entries()].map(async ([normalized, originalPhone]) => {
      const profile = await getLoyaltyByPhone(normalized);
      if (profile) {
        result[normalized] = profile;
        result[originalPhone] = profile;
        result[normalizePhone(originalPhone)] = profile;
      }
    })
  );
  return result;
}

export async function getAllLoyaltyProfiles(): Promise<LoyaltyProfileWithId[]> {
  const snap = await getDocs(collection(db, "loyalty"));
  const byPhone = new Map<string, LoyaltyProfileWithId>();

  for (const docSnap of snap.docs) {
    const data = docSnap.data() as LoyaltyProfile;
    const key = normalizePhone(data.contacto);
    if (!key) continue;

    const raw: LoyaltyProfileWithId = {
      id: docSnap.id,
      ...data,
      contacto: key,
      points: data.points ?? 0,
      totalVisits: data.totalVisits ?? data.visits ?? 0,
      pendingRewards: data.pendingRewards ?? [],
    };

    const { profile: normalized, needsPersist } = normalizeLoyaltyCycle(raw);
    if (needsPersist) {
      await persistLoyaltyCycle(docSnap.ref, normalized);
    }

    const profile: LoyaltyProfileWithId = { ...normalized, id: docSnap.id, contacto: key };

    const existing = byPhone.get(key);
    if (!existing || profile.totalVisits > existing.totalVisits) {
      byPhone.set(key, profile);
    }
  }

  return [...byPhone.values()].sort((a, b) => {
    const pendingA = a.pendingRewards?.length ?? 0;
    const pendingB = b.pendingRewards?.length ?? 0;
    if (pendingA !== pendingB) return pendingB - pendingA;
    return b.totalVisits - a.totalVisits;
  });
}

export async function recordCompletedVisit(
  contacto: string,
  nombre: string,
  visitDate?: string
): Promise<LoyaltyProfile> {
  const normalized = normalizePhone(contacto);
  const found = await findLoyaltyDoc(contacto);

  if (!found) {
    const now = new Date().toISOString();
    const afterVisit = applyVisitToLoyalty({ points: 0, totalVisits: 0, pendingRewards: [] });
    const profile: LoyaltyProfile = {
      contacto: normalized,
      nombre,
      points: afterVisit.points,
      totalVisits: afterVisit.totalVisits,
      pendingRewards: afterVisit.pendingRewards,
      lastVisit: visitDate,
      cycleStartedAt: now,
    };
    await addDoc(collection(db, "loyalty"), profile);
    return profile;
  }

  const current = await loadNormalizedLoyalty(found);
  const afterVisit = applyVisitToLoyalty({
    points: current.points ?? 0,
    totalVisits: current.totalVisits ?? current.visits ?? 0,
    pendingRewards: current.pendingRewards ?? [],
  });

  const updated: LoyaltyProfile = {
    ...current,
    contacto: normalized,
    nombre,
    points: afterVisit.points,
    totalVisits: afterVisit.totalVisits,
    pendingRewards: afterVisit.pendingRewards,
    lastVisit: visitDate,
  };

  await updateDoc(found.ref, loyaltyUpdateData(updated));
  return updated;
}

export async function redeemLoyaltyReward(
  contacto: string,
  reward: LoyaltyRewardId
): Promise<LoyaltyProfile | null> {
  const found = await findLoyaltyDoc(contacto);
  if (!found) return null;

  const current = await loadNormalizedLoyalty(found);
  const pending = current.pendingRewards ?? [];
  if (!pending.includes(reward)) return current;

  const updated: LoyaltyProfile = {
    ...current,
    pendingRewards: pending.filter((r) => r !== reward),
  };
  await updateDoc(found.ref, loyaltyUpdateData(updated));
  return updated;
}
