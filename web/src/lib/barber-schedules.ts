import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { BarberName } from "@/lib/constants";
import { BARBERS, SALON } from "@/lib/constants";
import {
  DEFAULT_SALON_SCHEDULE,
  getDefaultBarberSchedule,
  mergeSchedule,
} from "@/lib/scheduling/barber-config";
import type { BarberScheduleConfig, SalonScheduleConfig } from "@/lib/types/schedule";

const BARBER_COLLECTION = "barber_schedules";
const SALON_DOC = "salon_config";

let cachedSchedules: Record<BarberName, BarberScheduleConfig> | null = null;
let cachedSalon: SalonScheduleConfig | null = null;
let cacheTime = 0;
const CACHE_MS = 60_000;

export async function loadBarberSchedules(
  force = false
): Promise<Record<BarberName, BarberScheduleConfig>> {
  if (!force && cachedSchedules && Date.now() - cacheTime < CACHE_MS) {
    return cachedSchedules;
  }

  const result = {} as Record<BarberName, BarberScheduleConfig>;

  try {
    const snap = await getDocs(collection(db, BARBER_COLLECTION));
    const byName = new Map<string, BarberScheduleConfig>();
    snap.docs.forEach((d) => {
      byName.set(d.id, d.data() as BarberScheduleConfig);
    });

    for (const barber of BARBERS) {
      result[barber] = mergeSchedule(barber, byName.get(barber) ?? null);
    }
  } catch {
    for (const barber of BARBERS) {
      result[barber] = getDefaultBarberSchedule(barber);
    }
  }

  cachedSchedules = result;
  cacheTime = Date.now();
  return result;
}

export async function loadSalonSchedule(force = false): Promise<SalonScheduleConfig> {
  if (!force && cachedSalon && Date.now() - cacheTime < CACHE_MS) {
    return cachedSalon;
  }

  try {
    const snap = await getDoc(doc(db, SALON_DOC, SALON.id));
    if (snap.exists()) {
      cachedSalon = { ...DEFAULT_SALON_SCHEDULE, ...snap.data() } as SalonScheduleConfig;
    } else {
      cachedSalon = DEFAULT_SALON_SCHEDULE;
    }
  } catch {
    cachedSalon = DEFAULT_SALON_SCHEDULE;
  }

  return cachedSalon;
}

export async function saveBarberSchedule(config: BarberScheduleConfig): Promise<void> {
  await setDoc(doc(db, BARBER_COLLECTION, config.barber), {
    ...config,
    updatedAt: new Date().toISOString(),
  });
  cachedSchedules = null;
}

export async function saveSalonSchedule(config: SalonScheduleConfig): Promise<void> {
  await setDoc(doc(db, SALON_DOC, SALON.id), config, { merge: true });
  cachedSalon = null;
}

export async function seedDefaultSchedulesIfEmpty(): Promise<boolean> {
  const snap = await getDocs(collection(db, BARBER_COLLECTION));
  if (!snap.empty) return false;

  for (const barber of BARBERS) {
    await saveBarberSchedule(getDefaultBarberSchedule(barber));
  }
  await saveSalonSchedule(DEFAULT_SALON_SCHEDULE);
  return true;
}

export function invalidateScheduleCache(): void {
  cachedSchedules = null;
  cachedSalon = null;
  cacheTime = 0;
}
