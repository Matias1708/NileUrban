import type { BarberName } from "@/lib/constants";
import type { BarberScheduleConfig, SalonScheduleConfig } from "@/lib/types/schedule";
import { CANONICAL_SLOT_GRID } from "@/lib/scheduling/barber-config";
import { getStaffDaySlots } from "@/lib/scheduling/slots";
import type { Booking } from "@/lib/types/booking";

export function compareTime(a: string, b: string): number {
  const [ah, am] = a.split(":").map(Number);
  const [bh, bm] = b.split(":").map(Number);
  return ah - bh || am - bm;
}

export function isoToDMY(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function dmyToIso(dmy: string): string | null {
  const parts = dmy.split("/");
  if (parts.length !== 3) return null;
  const [d, m, y] = parts;
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

export function shiftDateDMY(dmy: string, days: number): string {
  const parts = dmy.split("/").map(Number);
  if (parts.length !== 3) return dmy;
  const [day, month, year] = parts;
  const d = new Date(year, month - 1, day);
  d.setDate(d.getDate() + days);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

export function todayDMY(): string {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

/** Lunes a domingo de la semana que contiene `dmy`. */
export function getWeekDaysDMY(dmy: string): string[] {
  const parts = dmy.split("/").map(Number);
  if (parts.length !== 3) return [];
  const [day, month, year] = parts;
  const anchor = new Date(year, month - 1, day);
  const dow = anchor.getDay();
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(anchor);
  monday.setDate(anchor.getDate() + mondayOffset);

  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(
      `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`
    );
  }
  return days;
}

export function dayNumberDMY(dmy: string): string {
  return dmy.split("/")[0] ?? dmy;
}

export type DayLoad = "closed" | "empty" | "light" | "busy";

export function dayLoadFromCount(count: number, closed: boolean): DayLoad {
  if (closed) return "closed";
  if (count === 0) return "empty";
  if (count >= 5) return "busy";
  return "light";
}

export interface BarberDayGrid {
  barber: BarberName;
  slots: string[];
  blockedReason?: string;
}

/** Mapea hora de turno a la fila de la grilla canónica del barbero */
export function resolveDisplaySlot(bookingTime: string, barberSlots: string[]): string {
  if (barberSlots.includes(bookingTime)) return bookingTime;

  const sorted = [...barberSlots].sort(compareTime);
  let match: string | null = null;
  for (const slot of sorted) {
    if (compareTime(slot, bookingTime) <= 0) match = slot;
  }
  return match ?? bookingTime;
}

function collectConfiguredSlots(barberGrids: BarberDayGrid[]): Set<string> {
  const configured = new Set<string>();
  for (const g of barberGrids) {
    if (!g.blockedReason) {
      g.slots.forEach((t) => configured.add(t));
    }
  }
  return configured;
}

export function buildDayGrid(
  date: string,
  barbers: BarberName[],
  schedules: Record<BarberName, BarberScheduleConfig>,
  salonSchedule: SalonScheduleConfig,
  dayBookings: Booking[]
): { times: string[]; barbers: BarberDayGrid[] } {
  const barberGrids: BarberDayGrid[] = barbers.map((barber) => {
    const { slots, blockedReason } = getStaffDaySlots({
      date,
      professional: barber,
      schedule: schedules[barber],
      salonSchedule,
    });
    return { barber, slots, blockedReason };
  });

  const configured = collectConfiguredSlots(barberGrids);

  // Filas = grilla canónica (10:00, 10:40…) donde al menos un barbero trabaja ese horario
  const times = CANONICAL_SLOT_GRID.filter((t) => configured.has(t));

  // Overrides por día (ej. lunes corto) que no están en la grilla canónica
  for (const t of configured) {
    if (!CANONICAL_SLOT_GRID.includes(t) && !times.includes(t)) {
      times.push(t);
    }
  }

  times.sort(compareTime);
  return { times, barbers: barberGrids };
}

export function bookingAt(
  bookings: Booking[],
  barber: string,
  time: string,
  grid?: BarberDayGrid
): Booking | undefined {
  return bookings.find((b) => {
    if (b.profesional !== barber || b.estado === "cancelled") return false;
    if (!grid?.slots.length) return b.hora === time;
    return resolveDisplaySlot(b.hora, grid.slots) === time;
  });
}

export function slotAvailableForBarber(grid: BarberDayGrid, time: string): boolean {
  if (grid.blockedReason) return false;
  return grid.slots.includes(time);
}
