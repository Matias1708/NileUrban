import type { BarberName } from "@/lib/constants";

/** 0=Domingo … 6=Sábado (Date.getDay()) */
export interface BarberScheduleConfig {
  barber: BarberName;
  /** Días que no atiende (ej. [2] = martes) */
  offWeekdays: number[];
  /** Horarios base cuando no hay override por día */
  defaultSlots: string[];
  /** Horarios distintos por día de la semana (override completo) */
  weekdaySlots: Partial<Record<number, string[]>>;
  /** Horarios bloqueados en ciertos días (se restan de default/weekday) */
  blockedByWeekday: Partial<Record<number, string[]>>;
  /** Solo mostrar slots >= esta hora (por día) */
  minTimeByWeekday: Partial<Record<number, string>>;
  /** Quitar estos horarios excepto el día indicado */
  excludeTimesUnlessWeekday?: { times: string[]; unlessWeekday: number };
  updatedAt?: string;
}

export interface SalonScheduleConfig {
  closedWeekdays: number[];
}

export const WEEKDAY_LABELS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
] as const;

export { CANONICAL_SLOT_GRID as ALL_SLOT_OPTIONS } from "@/lib/scheduling/barber-config";
