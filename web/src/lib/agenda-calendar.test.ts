import { describe, it, expect } from "vitest";
import { buildDayGrid, bookingAt, resolveDisplaySlot } from "@/lib/agenda-calendar";
import { getAllDefaultSchedules, DEFAULT_SALON_SCHEDULE } from "@/lib/scheduling/barber-config";
import type { Booking } from "@/lib/types/booking";

describe("agenda-calendar", () => {
  const schedules = getAllDefaultSchedules();

  it("uses canonical 40-min grid on Friday without orphan 10:15 rows", () => {
    const bookings: Booking[] = [
      {
        id: "1",
        nombre: "Sebastián Sotera",
        servicio: "Corte",
        fecha: "30/05/2026",
        hora: "10:15",
        profesional: "Lautaro",
        contacto: "1130396470",
        estado: "confirmed",
        enviar: "N",
      },
    ];

    const { times } = buildDayGrid(
      "30/05/2026",
      ["Pablo", "Nicolas", "Lautaro", "Matias"],
      schedules,
      DEFAULT_SALON_SCHEDULE,
      bookings
    );

    expect(times).toContain("10:00");
    expect(times).toContain("10:40");
    expect(times).not.toContain("10:15");
    expect(times.indexOf("10:40")).toBe(times.indexOf("10:00") + 1);
  });

  it("maps legacy 10:15 booking to 10:00 row for Lautaro", () => {
    const bookings: Booking[] = [
      {
        id: "1",
        nombre: "Sebastián Sotera",
        servicio: "Corte",
        fecha: "30/05/2026",
        hora: "10:15",
        profesional: "Lautaro",
        contacto: "1130396470",
        estado: "confirmed",
        enviar: "N",
      },
    ];

    const { barbers } = buildDayGrid(
      "30/05/2026",
      ["Lautaro"],
      schedules,
      DEFAULT_SALON_SCHEDULE,
      bookings
    );

    const lautaro = barbers[0]!;
    expect(bookingAt(bookings, "Lautaro", "10:00", lautaro)?.nombre).toBe("Sebastián Sotera");
    expect(bookingAt(bookings, "Lautaro", "10:15", lautaro)).toBeUndefined();
  });

  it("resolveDisplaySlot snaps off-grid times to prior canonical slot", () => {
    const slots = ["10:00", "10:40", "11:20"];
    expect(resolveDisplaySlot("10:15", slots)).toBe("10:00");
    expect(resolveDisplaySlot("10:40", slots)).toBe("10:40");
  });
});
