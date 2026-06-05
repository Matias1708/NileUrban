import type { BarberName } from "@/lib/constants";
import { BARBERS } from "@/lib/constants";
import type { BarberScheduleConfig, SalonScheduleConfig } from "@/lib/types/schedule";

const BASE = [
  "10:00", "10:40", "11:20", "12:00", "13:00", "13:40", "14:20",
  "15:00", "15:40", "16:20", "17:00", "17:40", "18:20", "19:00",
];

/** Grilla estándar de turnos (40 min) — única permitida para reservas públicas */
export const CANONICAL_SLOT_GRID = [...BASE];

const CANONICAL_SLOT_SET = new Set<string>(CANONICAL_SLOT_GRID);

export function isCanonicalSlotTime(time: string): boolean {
  return CANONICAL_SLOT_SET.has(time);
}

const MON_SHORT = [
  "13:00", "13:40", "14:20", "15:00", "15:40", "16:20", "17:00", "17:40", "18:20",
];

/** Configuración por defecto (equivalente al código legacy actual) */
export const DEFAULT_BARBER_SCHEDULES: Record<BarberName, BarberScheduleConfig> = {
  Pablo: {
    barber: "Pablo",
    offWeekdays: [],
    defaultSlots: BASE,
    weekdaySlots: { 1: MON_SHORT },
    blockedByWeekday: { 5: ["19:00"] },
    minTimeByWeekday: {},
  },
  Nicolas: {
    barber: "Nicolas",
    offWeekdays: [3],
    defaultSlots: BASE,
    weekdaySlots: { 1: MON_SHORT },
    blockedByWeekday: {
      1: ["10:00"],
      2: ["18:00"],
      4: ["10:00", "14:20", "17:00"],
    },
    minTimeByWeekday: {},
  },
  Lautaro: {
    barber: "Lautaro",
    offWeekdays: [1],
    defaultSlots: BASE,
    weekdaySlots: {},
    blockedByWeekday: {},
    minTimeByWeekday: {},
    excludeTimesUnlessWeekday: { times: ["18:20", "19:00"], unlessWeekday: 6 },
  },
  Matias: {
    barber: "Matias",
    offWeekdays: [2],
    defaultSlots: BASE,
    weekdaySlots: {},
    blockedByWeekday: {},
    minTimeByWeekday: { 0: "13:00", 1: "13:00", 2: "13:00", 3: "13:00", 4: "13:00", 5: "13:00" },
  },
};

export const DEFAULT_SALON_SCHEDULE: SalonScheduleConfig = {
  closedWeekdays: [0],
};

export function getDefaultBarberSchedule(barber: BarberName): BarberScheduleConfig {
  return structuredClone(DEFAULT_BARBER_SCHEDULES[barber]);
}

export function getAllDefaultSchedules(): Record<BarberName, BarberScheduleConfig> {
  return structuredClone(DEFAULT_BARBER_SCHEDULES);
}

export function emptySchedule(barber: BarberName): BarberScheduleConfig {
  return {
    barber,
    offWeekdays: [],
    defaultSlots: [...BASE],
    weekdaySlots: {},
    blockedByWeekday: {},
    minTimeByWeekday: {},
  };
}

export function validateScheduleConfig(config: BarberScheduleConfig): string | null {
  if (!config.defaultSlots.length && !Object.keys(config.weekdaySlots).length) {
    return "Agregá al menos un horario disponible.";
  }
  return null;
}

export function mergeSchedule(
  barber: BarberName,
  fromDb: Partial<BarberScheduleConfig> | null
): BarberScheduleConfig {
  const defaults = getDefaultBarberSchedule(barber);
  if (!fromDb) return defaults;
  const merged: BarberScheduleConfig = {
    ...defaults,
    ...fromDb,
    barber,
    weekdaySlots: { ...defaults.weekdaySlots, ...fromDb.weekdaySlots },
    blockedByWeekday: { ...defaults.blockedByWeekday, ...fromDb.blockedByWeekday },
    minTimeByWeekday: { ...defaults.minTimeByWeekday, ...fromDb.minTimeByWeekday },
  };
  // Legacy: Nicolás ya no empieza a las 14:15 los martes
  if (barber === "Nicolas" && merged.minTimeByWeekday[2] === "14:15") {
    const { 2: _removed, ...rest } = merged.minTimeByWeekday;
    merged.minTimeByWeekday = rest;
  }
  return merged;
}

export function allBarbersWithDefaults(): BarberName[] {
  return [...BARBERS];
}
