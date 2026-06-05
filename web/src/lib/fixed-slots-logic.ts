import { parseDateDMY, formatDateDMY } from "@/lib/scheduling/dates";
import type { Booking, FixedSlot, FixedSlotException } from "@/lib/types/booking";

export function getWeekdayFromDMY(fecha: string): number {
  const d = parseDateDMY(fecha);
  return d ? d.getDay() : -1;
}

export function fixedSlotSyntheticId(fixedSlotId: string, fecha: string): string {
  const safeDate = fecha.replace(/\//g, "-");
  return `fixed-${fixedSlotId}-${safeDate}`;
}

export function parseFixedSlotSyntheticId(
  id: string
): { fixedSlotId: string; fecha: string } | null {
  const match = id.match(/^fixed-(.+)-(\d{2}-\d{2}-\d{4})$/);
  if (!match) return null;
  const [, fixedSlotId, datePart] = match;
  const fecha = datePart.replace(/-/g, "/");
  return { fixedSlotId, fecha };
}

export function isFixedSlotBookingId(id: string): boolean {
  return id.startsWith("fixed-");
}

function occupiesSlot(booking: Booking, fecha: string, profesional: string, hora: string): boolean {
  return (
    booking.fecha === fecha &&
    booking.profesional === profesional &&
    booking.hora === hora &&
    booking.estado !== "cancelled"
  );
}

function fixedSlotCompletedOnDate(
  allBookings: Booking[],
  fixedSlotId: string,
  fecha: string
): boolean {
  return allBookings.some(
    (b) =>
      b.fecha === fecha &&
      b.fixedSlotId === fixedSlotId &&
      b.estado === "completed"
  );
}

function hasException(
  exceptions: FixedSlotException[],
  fixedSlotId: string,
  fecha: string
): boolean {
  return exceptions.some((e) => e.fixedSlotId === fixedSlotId && e.fecha === fecha);
}

export function expandFixedSlotsForDate(
  fecha: string,
  fixedSlots: FixedSlot[],
  exceptions: FixedSlotException[],
  allBookings: Booking[]
): Booking[] {
  const weekday = getWeekdayFromDMY(fecha);
  if (weekday < 0) return [];

  const result: Booking[] = [];

  for (const slot of fixedSlots) {
    if (!slot.activo || !slot.id || slot.weekday !== weekday) continue;
    if (hasException(exceptions, slot.id, fecha)) continue;
    if (fixedSlotCompletedOnDate(allBookings, slot.id, fecha)) continue;

    const realAtSlot = allBookings.find((b) =>
      occupiesSlot(b, fecha, slot.profesional, slot.hora)
    );
    if (realAtSlot) continue;

    result.push({
      id: fixedSlotSyntheticId(slot.id, fecha),
      nombre: slot.nombre,
      fecha,
      hora: slot.hora,
      profesional: slot.profesional,
      servicio: slot.servicio,
      contacto: slot.contacto,
      enviar: "N",
      estado: "confirmed",
      isFixedSlot: true,
      fixedSlotId: slot.id,
    });
  }

  return result;
}

export function getFixedReservedTimes(
  fecha: string,
  profesional: string,
  fixedSlots: FixedSlot[],
  exceptions: FixedSlotException[],
  allBookings: Booking[]
): string[] {
  const expanded = expandFixedSlotsForDate(fecha, fixedSlots, exceptions, allBookings);
  return expanded
    .filter((b) => b.profesional === profesional)
    .map((b) => b.hora);
}

/** Fechas desde hoy hasta N semanas para expandir turnos fijos en agenda */
export function datesForWeeksAhead(weeks: number, fromDate = new Date()): string[] {
  const start = new Date(fromDate);
  start.setHours(0, 0, 0, 0);
  const dates: string[] = [];
  const totalDays = weeks * 7;
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    if (d.getDay() !== 0) {
      dates.push(formatDateDMY(d));
    }
  }
  return dates;
}

export function mergeAgendaWithFixedSlots(
  agendaBookings: Booking[],
  allBookings: Booking[],
  fixedSlots: FixedSlot[],
  exceptions: FixedSlotException[],
  options?: { barberFilter?: string; weeksAhead?: number }
): Booking[] {
  const weeks = options?.weeksAhead ?? 8;
  const dates = datesForWeeksAhead(weeks);
  const fixedVirtual: Booking[] = [];

  for (const fecha of dates) {
    const expanded = expandFixedSlotsForDate(fecha, fixedSlots, exceptions, allBookings);
    for (const b of expanded) {
      if (options?.barberFilter && b.profesional !== options.barberFilter) continue;
      fixedVirtual.push(b);
    }
  }

  const byKey = new Map<string, Booking>();
  for (const b of agendaBookings) {
    const key = `${b.fecha}|${b.profesional}|${b.hora}|${b.id ?? b.nombre}`;
    byKey.set(key, b);
  }
  for (const b of fixedVirtual) {
    const key = `${b.fecha}|${b.profesional}|${b.hora}|fixed-${b.fixedSlotId}`;
    if (!byKey.has(key)) {
      byKey.set(key, b);
    }
  }

  return [...byKey.values()].sort((a, b) => {
    const da = a.fecha.split("/").reverse().join("");
    const db = b.fecha.split("/").reverse().join("");
    if (da !== db) return da.localeCompare(db);
    return a.hora.localeCompare(b.hora);
  });
}
