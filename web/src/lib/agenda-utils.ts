import { parseDateDMY } from "@/lib/scheduling/dates";
import type { Booking } from "@/lib/types/booking";

export function isPastDate(dateString: string): boolean {
  const d = parseDateDMY(dateString);
  if (!d) return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
}

export function getDayName(dateString: string): string {
  const d = parseDateDMY(dateString);
  if (!d) return "";
  return new Intl.DateTimeFormat("es-ES", { weekday: "long" }).format(d);
}

export function getShortWeekday(dateString: string): string {
  const d = parseDateDMY(dateString);
  if (!d) return "";
  return new Intl.DateTimeFormat("es-ES", { weekday: "short" }).format(d).replace(".", "");
}

export function sortByTime(a: Booking, b: Booking): number {
  const [aH, aM] = a.hora.split(":").map(Number);
  const [bH, bM] = b.hora.split(":").map(Number);
  return aH - bH || aM - bM;
}

export function sortByDate(a: Booking, b: Booking): number {
  const da = a.fecha.split("/").reverse().join("");
  const db = b.fecha.split("/").reverse().join("");
  return da.localeCompare(db) || sortByTime(a, b);
}

export function groupByBarber(bookings: Booking[]): Record<string, Booking[]> {
  return bookings.reduce<Record<string, Booking[]>>((acc, b) => {
    if (!acc[b.profesional]) acc[b.profesional] = [];
    acc[b.profesional].push(b);
    return acc;
  }, {});
}

export function groupByDate(bookings: Booking[]): Record<string, Booking[]> {
  return bookings.reduce<Record<string, Booking[]>>((acc, b) => {
    if (!acc[b.fecha]) acc[b.fecha] = [];
    acc[b.fecha].push(b);
    return acc;
  }, {});
}

export function isRecentPastDate(dateString: string, windowDays = 7): boolean {
  const d = parseDateDMY(dateString);
  if (!d) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - windowDays);
  return d >= cutoff && d < today;
}

export function futureBookings(bookings: Booking[]): Booking[] {
  return bookings
    .filter((b) => b.fecha && !isPastDate(b.fecha) && b.estado !== "cancelled")
    .sort(sortByDate);
}

/** Turnos visibles en agenda staff: futuros + recientes sin marcar atendidos. */
export function staffAgendaBookings(bookings: Booking[]): Booking[] {
  return bookings
    .filter((b) => {
      if (!b.fecha || b.estado === "cancelled" || b.estado === "completed") return false;
      return !isPastDate(b.fecha) || isRecentPastDate(b.fecha);
    })
    .sort(sortByDate);
}

export function buildReminderWhatsAppUrl(booking: Booking): string {
  const phone = booking.contacto.startsWith("549")
    ? booking.contacto
    : `549${booking.contacto}`;
  const message = `¡Hola ${booking.nombre}! 👋

Queremos recordarte tu turno en Nile el día ${booking.fecha} a las ${booking.hora} con ${booking.profesional} para tu servicio de ${booking.servicio}. 💈

Para brindarte la mejor atención, te pedimos llegar 5 minutos antes de tu horario. La tolerancia es de 10 minutos.

En caso de cancelación o cambio, te solicitamos avisar con al menos 2 horas de anticipación; de lo contrario, se deberá abonar el servicio reservado.

¡Te esperamos para tu próximo corte!
Muchas gracias por elegirnos.
Nile`;
  return `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;
}
