/** Parse DD/MM/YYYY to Date (local timezone) */
export function parseDateDMY(dateString: string): Date | null {
  if (!dateString || typeof dateString !== "string") return null;
  const parts = dateString.split("/");
  if (parts.length !== 3) return null;
  const [day, month, year] = parts.map(Number);
  const date = new Date(year, month - 1, day);
  return isNaN(date.getTime()) ? null : date;
}

/** Format Date to DD/MM/YYYY */
export function formatDateDMY(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/** ISO date parts for slot logic */
export function datePartsDMY(dateString: string): { day: number; month: number; year: number } | null {
  const parts = dateString.split("/");
  if (parts.length !== 3) return null;
  return {
    day: parseInt(parts[0], 10),
    month: parseInt(parts[1], 10),
    year: parseInt(parts[2], 10),
  };
}

export function isSunday(dateString: string): boolean {
  const d = parseDateDMY(dateString);
  return d ? d.getDay() === 0 : false;
}

export function isPastSlot(dateString: string, time: string): boolean {
  const parts = datePartsDMY(dateString);
  if (!parts) return true;
  const now = new Date();
  const slotDate = new Date(parts.year, parts.month - 1, parts.day);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (slotDate < today) return true;
  if (slotDate > today) return false;
  const [h, m] = time.split(":").map(Number);
  const slotTime = new Date();
  slotTime.setHours(h, m, 0, 0);
  return now >= slotTime;
}

export interface CalendarEventParams {
  title: string;
  date: string;
  time: string;
  durationMinutes?: number;
  location?: string;
  details?: string;
}

function getEventDateRange(params: CalendarEventParams): { start: Date; end: Date } | null {
  const parts = datePartsDMY(params.date);
  if (!parts) return null;
  const [h, m] = params.time.split(":").map(Number);
  const start = new Date(parts.year, parts.month - 1, parts.day, h, m);
  const end = new Date(start.getTime() + (params.durationMinutes ?? 40) * 60 * 1000);
  return { start, end };
}

export function buildGoogleCalendarUrl(params: CalendarEventParams): string {
  const range = getEventDateRange(params);
  if (!range) return "#";

  const fmt = (d: Date) =>
    d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  const qs = new URLSearchParams({
    action: "TEMPLATE",
    text: params.title,
    dates: `${fmt(range.start)}/${fmt(range.end)}`,
    location: params.location ?? "",
    details: params.details ?? "",
  });
  return `https://calendar.google.com/calendar/render?${qs.toString()}`;
}
