import type { BarberName } from "@/lib/constants";
import { datePartsDMY, isPastSlot } from "./dates";
import type { BarberScheduleConfig, SalonScheduleConfig } from "@/lib/types/schedule";
import { WEEKDAY_LABELS } from "@/lib/types/schedule";
import {
  getDefaultBarberSchedule,
  DEFAULT_SALON_SCHEDULE,
  isCanonicalSlotTime,
} from "./barber-config";

export interface SlotOptions {
  date: string;
  professional: BarberName;
  reservedTimes?: string[];
  now?: Date;
  schedule?: BarberScheduleConfig;
  salonSchedule?: SalonScheduleConfig;
}

export interface SlotResult {
  slots: string[];
  blockedReason?: string;
}

function getDayOfWeek(dateString: string): number {
  const parts = datePartsDMY(dateString);
  if (!parts) return -1;
  return new Date(parts.year, parts.month - 1, parts.day).getDay();
}

function weekdayLabel(day: number): string {
  return WEEKDAY_LABELS[day] ?? "ese día";
}

function resolveTimesForDay(
  schedule: BarberScheduleConfig,
  dayOfWeek: number
): string[] {
  const base =
    schedule.weekdaySlots[dayOfWeek] ?? schedule.defaultSlots;
  let times = [...base];

  const minTime = schedule.minTimeByWeekday[dayOfWeek];
  if (minTime) {
    times = times.filter((t) => t >= minTime);
  }

  if (schedule.excludeTimesUnlessWeekday) {
    const { times: excluded, unlessWeekday } = schedule.excludeTimesUnlessWeekday;
    if (dayOfWeek !== unlessWeekday) {
      times = times.filter((t) => !excluded.includes(t));
    }
  }

  const blocked = schedule.blockedByWeekday[dayOfWeek] ?? [];
  times = times.filter((t) => !blocked.includes(t));

  if ((dayOfWeek === 5 || dayOfWeek === 6) && !times.includes("19:00")) {
    const canAdd19 = (schedule.defaultSlots.includes("19:00") ||
      schedule.weekdaySlots[dayOfWeek]?.includes("19:00")) &&
      !blocked.includes("19:00");
    if (canAdd19 && (!schedule.excludeTimesUnlessWeekday ||
        dayOfWeek === schedule.excludeTimesUnlessWeekday.unlessWeekday ||
        !schedule.excludeTimesUnlessWeekday.times.includes("19:00"))) {
      times.push("19:00");
      times.sort();
    }
  }

  return times.filter(isCanonicalSlotTime);
}

/** Validates booking before submit */
export function validateBooking(params: {
  date: string;
  time: string;
  professional: BarberName;
  schedule?: BarberScheduleConfig;
  salonSchedule?: SalonScheduleConfig;
}): string | null {
  const { date, time, professional, schedule, salonSchedule } = params;
  if (!isCanonicalSlotTime(time)) {
    return "La hora seleccionada no es un turno válido.";
  }

  const parts = datePartsDMY(date);
  if (!parts) return "Fecha inválida.";

  const salon = salonSchedule ?? DEFAULT_SALON_SCHEDULE;
  const barberSchedule = schedule ?? getDefaultBarberSchedule(professional);

  const selectedDate = new Date(parts.year, parts.month - 1, parts.day);
  const dayOfWeek = selectedDate.getDay();

  if (salon.closedWeekdays.includes(dayOfWeek)) {
    return "Domingos cerrados.";
  }

  if (barberSchedule.offWeekdays.includes(dayOfWeek)) {
    return `${professional} no atiende los ${weekdayLabel(dayOfWeek).toLowerCase()}.`;
  }

  const available = getAvailableSlots({
    date,
    professional,
    reservedTimes: [],
    schedule: barberSchedule,
    salonSchedule: salon,
  });

  if (available.blockedReason) return available.blockedReason;
  if (!available.slots.includes(time)) {
    return "La hora seleccionada no está disponible.";
  }

  return null;
}

/** Slot generation from Firestore config (with code defaults as fallback) */
export function getAvailableSlots(options: SlotOptions): SlotResult {
  const {
    date,
    professional,
    reservedTimes = [],
    now = new Date(),
    schedule = getDefaultBarberSchedule(professional),
    salonSchedule = DEFAULT_SALON_SCHEDULE,
  } = options;

  if (!date || !professional) {
    return { slots: [], blockedReason: "Seleccioná fecha y profesional." };
  }

  const parts = datePartsDMY(date);
  if (!parts) return { slots: [], blockedReason: "Fecha inválida." };

  const formattedDate = `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
  const dayOfWeek = getDayOfWeek(date);

  if (salonSchedule.closedWeekdays.includes(dayOfWeek)) {
    return { slots: [], blockedReason: "Domingos cerrados." };
  }

  if (schedule.offWeekdays.includes(dayOfWeek)) {
    return {
      slots: [],
      blockedReason: `${professional} no atiende los ${weekdayLabel(dayOfWeek).toLowerCase()}.`,
    };
  }

  const timesToIterate = resolveTimesForDay(schedule, dayOfWeek);
  const currentDateFormatted = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const slots: string[] = [];

  for (const optionValue of timesToIterate) {
    const optionDateTime = new Date(`${formattedDate}T${optionValue}:00`);
    const isPast =
      formattedDate === currentDateFormatted &&
      (now.getHours() > optionDateTime.getHours() ||
        (now.getHours() === optionDateTime.getHours() &&
          now.getMinutes() >= optionDateTime.getMinutes()));

    const isReserved = reservedTimes.includes(optionValue);

    if (!isPast && !isReserved && !isPastSlot(date, optionValue)) {
      slots.push(optionValue);
    }
  }

  if (slots.length === 0) {
    return { slots: [], blockedReason: "No hay turnos disponibles para la fecha seleccionada." };
  }

  return { slots };
}

/** Horarios del día para grid staff (sin filtrar pasado ni reservados) */
export function getStaffDaySlots(options: {
  date: string;
  professional: BarberName;
  schedule?: BarberScheduleConfig;
  salonSchedule?: SalonScheduleConfig;
}): { slots: string[]; blockedReason?: string } {
  const {
    date,
    professional,
    schedule = getDefaultBarberSchedule(professional),
    salonSchedule = DEFAULT_SALON_SCHEDULE,
  } = options;

  if (!date) return { slots: [], blockedReason: "Fecha inválida." };

  const dayOfWeek = getDayOfWeek(date);

  if (salonSchedule.closedWeekdays.includes(dayOfWeek)) {
    return { slots: [], blockedReason: "Domingos cerrados." };
  }

  if (schedule.offWeekdays.includes(dayOfWeek)) {
    return {
      slots: [],
      blockedReason: `${professional} no atiende los ${weekdayLabel(dayOfWeek).toLowerCase()}.`,
    };
  }

  return { slots: resolveTimesForDay(schedule, dayOfWeek) };
}

export function isDateDisabledForPicker(
  date: Date,
  salonSchedule: SalonScheduleConfig = DEFAULT_SALON_SCHEDULE
): boolean {
  return salonSchedule.closedWeekdays.includes(date.getDay());
}
