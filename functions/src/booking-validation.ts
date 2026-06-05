import type { Firestore } from "firebase-admin/firestore";

const CANONICAL_SLOTS = new Set([
  "10:00", "10:40", "11:20", "12:00", "13:00", "13:40", "14:20",
  "15:00", "15:40", "16:20", "17:00", "17:40", "18:20", "19:00",
]);

const BARBERS = ["Pablo", "Nicolas", "Lautaro", "Matias"] as const;
const WEEKDAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

interface BarberScheduleConfig {
  offWeekdays?: number[];
  defaultSlots?: string[];
  weekdaySlots?: Record<number, string[]>;
  blockedByWeekday?: Record<number, string[]>;
  minTimeByWeekday?: Record<number, string>;
  excludeTimesUnlessWeekday?: { times: string[]; unlessWeekday: number };
}

const DEFAULT_SCHEDULES: Record<string, BarberScheduleConfig> = {
  Pablo: {
    defaultSlots: [...CANONICAL_SLOTS],
    weekdaySlots: { 1: ["13:00", "13:40", "14:20", "15:00", "15:40", "16:20", "17:00", "17:40", "18:20"] },
    blockedByWeekday: { 5: ["19:00"] },
  },
  Nicolas: {
    offWeekdays: [3],
    defaultSlots: [...CANONICAL_SLOTS],
    weekdaySlots: { 1: ["13:00", "13:40", "14:20", "15:00", "15:40", "16:20", "17:00", "17:40", "18:20"] },
    blockedByWeekday: { 1: ["10:00"], 2: ["18:00"], 4: ["10:00", "14:20", "17:00"] },
  },
  Lautaro: {
    offWeekdays: [1],
    defaultSlots: [...CANONICAL_SLOTS],
    excludeTimesUnlessWeekday: { times: ["18:20", "19:00"], unlessWeekday: 6 },
  },
  Matias: {
    offWeekdays: [2],
    defaultSlots: [...CANONICAL_SLOTS],
    minTimeByWeekday: { 0: "13:00", 1: "13:00", 2: "13:00", 3: "13:00", 4: "13:00", 5: "13:00" },
  },
};

function mergeSchedule(
  barber: string,
  fromDb: BarberScheduleConfig | undefined
): BarberScheduleConfig {
  const defaults = DEFAULT_SCHEDULES[barber] ?? { defaultSlots: [...CANONICAL_SLOTS] };
  if (!fromDb) return defaults;
  const merged = {
    ...defaults,
    ...fromDb,
    weekdaySlots: { ...defaults.weekdaySlots, ...fromDb.weekdaySlots },
    blockedByWeekday: { ...defaults.blockedByWeekday, ...fromDb.blockedByWeekday },
    minTimeByWeekday: { ...defaults.minTimeByWeekday, ...fromDb.minTimeByWeekday },
  };
  if (barber === "Nicolas" && merged.minTimeByWeekday?.[2] === "14:15") {
    const { 2: _removed, ...rest } = merged.minTimeByWeekday;
    merged.minTimeByWeekday = rest;
  }
  return merged;
}

function parseDateDMY(dateStr: string): Date | null {
  const parts = dateStr.split("/");
  if (parts.length !== 3) return null;
  const [d, m, y] = parts.map(Number);
  const date = new Date(y, m - 1, d);
  return isNaN(date.getTime()) ? null : date;
}

function resolveTimesForDay(schedule: BarberScheduleConfig, dayOfWeek: number): string[] {
  const base = schedule.weekdaySlots?.[dayOfWeek] ?? schedule.defaultSlots ?? [];
  let times = [...base];

  const minTime = schedule.minTimeByWeekday?.[dayOfWeek];
  if (minTime) times = times.filter((t) => t >= minTime);

  const excluded = schedule.excludeTimesUnlessWeekday;
  if (excluded && dayOfWeek !== excluded.unlessWeekday) {
    times = times.filter((t) => !excluded.times.includes(t));
  }

  const blocked = schedule.blockedByWeekday?.[dayOfWeek] ?? [];
  times = times.filter((t) => !blocked.includes(t));

  if ((dayOfWeek === 5 || dayOfWeek === 6) && !times.includes("19:00")) {
    const canAdd19 =
      (schedule.defaultSlots?.includes("19:00") ||
        schedule.weekdaySlots?.[dayOfWeek]?.includes("19:00")) &&
      !blocked.includes("19:00");
    if (
      canAdd19 &&
      (!excluded ||
        dayOfWeek === excluded.unlessWeekday ||
        !excluded.times.includes("19:00"))
    ) {
      times.push("19:00");
      times.sort();
    }
  }

  return times.filter((t) => CANONICAL_SLOTS.has(t));
}

export async function validateBookingRequest(
  db: Firestore,
  params: {
    fecha: string;
    hora: string;
    profesional: string;
  }
): Promise<string | null> {
  const { fecha, hora, profesional } = params;

  if (!CANONICAL_SLOTS.has(hora)) {
    return "La hora seleccionada no es un turno válido.";
  }

  if (!BARBERS.includes(profesional as (typeof BARBERS)[number])) {
    return "Profesional inválido.";
  }

  const date = parseDateDMY(fecha);
  if (!date) return "Fecha inválida.";

  const dayOfWeek = date.getDay();
  if (dayOfWeek === 0) return "Domingos cerrados.";

  const salonSnap = await db.collection("salon_config").doc("nile-urban-ramos-mejia").get();
  const closedWeekdays: number[] = salonSnap.exists
    ? (salonSnap.data()?.closedWeekdays as number[] | undefined) ?? [0]
    : [0];
  if (closedWeekdays.includes(dayOfWeek)) return "Domingos cerrados.";

  const scheduleSnap = await db.collection("barber_schedules").doc(profesional).get();
  const schedule = mergeSchedule(
    profesional,
    scheduleSnap.exists ? (scheduleSnap.data() as BarberScheduleConfig) : undefined
  );

  if (schedule.offWeekdays?.includes(dayOfWeek)) {
    return `${profesional} no atiende los ${WEEKDAYS[dayOfWeek]?.toLowerCase() ?? "ese día"}.`;
  }

  const slots = resolveTimesForDay(schedule, dayOfWeek);
  if (!slots.includes(hora)) {
    return "La hora seleccionada no está disponible.";
  }

  return null;
}
