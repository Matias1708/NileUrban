import { parseDateDMY } from "@/lib/scheduling/dates";
import type { Booking, Expense, Subscription } from "@/lib/types/booking";

export type FinanceRange = "month" | "today" | "3days" | "week";

export const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export const EXPENSE_CATEGORIES = [
  "Insumos",
  "Servicios (Luz, Agua, etc.)",
  "Sueldos/Comisiones",
  "Mantenimiento",
  "Otros",
] as const;

export interface FinanceFilters {
  range: FinanceRange;
  month: number | "all";
  year: number;
  barber: string;
  clientSearch: string;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

/** Semana laboral anterior: martes a sábado (legacy finance.html) */
export function getPreviousWorkWeekRange(today: Date): { start: Date; end: Date } {
  const t = startOfDay(today);
  const dayOfWeek = t.getDay();
  let daysToLastSaturday: number;

  if (dayOfWeek === 0) daysToLastSaturday = 1;
  else if (dayOfWeek === 6) daysToLastSaturday = 7;
  else daysToLastSaturday = dayOfWeek + 1;

  const lastSaturday = endOfDay(new Date(t));
  lastSaturday.setDate(t.getDate() - daysToLastSaturday);

  const lastTuesday = startOfDay(new Date(lastSaturday));
  lastTuesday.setDate(lastSaturday.getDate() - 4);

  return { start: lastTuesday, end: lastSaturday };
}

function matchBookingDate(date: Date, filters: FinanceFilters, today: Date): boolean {
  const { range, month, year } = filters;

  if (range === "month") {
    const matchYear = date.getFullYear() === year;
    const matchMonth = month === "all" || date.getMonth() === month;
    return matchYear && matchMonth;
  }
  if (range === "today") {
    return date.getTime() === startOfDay(today).getTime();
  }
  if (range === "3days") {
    const from = startOfDay(today);
    from.setDate(today.getDate() - 3);
    return date >= from && date <= endOfDay(today);
  }
  if (range === "week") {
    const { start, end } = getPreviousWorkWeekRange(today);
    return date >= start && date <= end;
  }
  return false;
}

function matchExpenseDate(date: Date, filters: FinanceFilters, today: Date): boolean {
  return matchBookingDate(date, filters, today);
}

function matchAbonoDate(
  sub: Subscription,
  filters: FinanceFilters,
  today: Date
): boolean {
  const { range, month, year } = filters;
  const monthDate = new Date(sub.year, sub.month, 1);
  const paymentDate = sub.paymentDate
    ? new Date(`${sub.paymentDate}T00:00:00`)
    : monthDate;

  if (range === "month") {
    const matchYear = sub.year === year;
    const matchMonth = month === "all" || sub.month === month;
    return matchYear && matchMonth;
  }
  if (range === "today") {
    return paymentDate.getTime() === startOfDay(today).getTime();
  }
  if (range === "3days") {
    const from = startOfDay(today);
    from.setDate(today.getDate() - 3);
    return paymentDate >= from && paymentDate <= endOfDay(today);
  }
  if (range === "week") {
    const { start, end } = getPreviousWorkWeekRange(today);
    return paymentDate >= start && paymentDate <= end;
  }
  return false;
}

export function filterBookingsForFinance(
  bookings: Booking[],
  filters: FinanceFilters,
  staffBarber: string | null
): Booking[] {
  const today = startOfDay(new Date());

  return bookings.filter((b) => {
    if (!b.fecha || !b.servicio) return false;
    const dateObj = parseDateDMY(b.fecha);
    if (!dateObj) return false;

    if (!matchBookingDate(dateObj, filters, today)) return false;

    const matchBarber = staffBarber
      ? b.profesional === staffBarber
      : filters.barber === "all" || b.profesional === filters.barber;

    const matchClient =
      !filters.clientSearch ||
      (b.nombre?.toLowerCase().includes(filters.clientSearch.toLowerCase()) ?? false);

    const isPast =
      filters.range === "week" ? true : dateObj <= endOfDay(today);

    return matchBarber && matchClient && isPast;
  });
}

export function filterExpensesForFinance(
  expenses: Expense[],
  filters: FinanceFilters
): Expense[] {
  const today = startOfDay(new Date());

  return expenses.filter((e) => {
    const dateObj = new Date(`${e.date}T00:00:00`);
    if (isNaN(dateObj.getTime())) return false;
    return matchExpenseDate(dateObj, filters, today);
  });
}

export function filterAbonosForFinance(
  abonos: Subscription[],
  filters: FinanceFilters
): Subscription[] {
  const today = startOfDay(new Date());
  return abonos.filter((a) => matchAbonoDate(a, filters, today));
}

export interface BarberFinanceStats {
  name: string;
  count: number;
  total: number;
}

export function computeBarberStats(
  bookings: Booking[],
  getPrice: (b: Booking) => number
): BarberFinanceStats[] {
  const stats = new Map<string, { count: number; total: number }>();

  for (const b of bookings) {
    const name = b.profesional || "Desconocido";
    const cur = stats.get(name) ?? { count: 0, total: 0 };
    cur.count += 1;
    cur.total += getPrice(b);
    stats.set(name, cur);
  }

  return Array.from(stats.entries())
    .map(([name, { count, total }]) => ({ name, count, total }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function sortBookingsByDate(bookings: Booking[]): Booking[] {
  return [...bookings].sort((a, b) => {
    const da = parseDateDMY(a.fecha)?.getTime() ?? 0;
    const db = parseDateDMY(b.fecha)?.getTime() ?? 0;
    if (da !== db) return da - db;
    return (a.hora ?? "").localeCompare(b.hora ?? "");
  });
}

export function formatMoney(amount: number): string {
  return `$${amount.toLocaleString("es-AR")}`;
}

export function isoToDMY(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
