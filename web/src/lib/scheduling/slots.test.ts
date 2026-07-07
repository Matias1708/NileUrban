import { describe, expect, it } from "vitest";
import { getAvailableSlots } from "@/lib/scheduling/slots";
import { getDefaultBarberSchedule, mergeSchedule } from "@/lib/scheduling/barber-config";

describe("Lautaro horarios", () => {
  const tuesday = "14/07/2026";
  const farFuture = new Date(2026, 6, 7, 8, 0, 0);

  it("respeta la config guardada sin volver a aplicar exclusion legacy", () => {
    const schedule = mergeSchedule("Lautaro", {
      defaultSlots: getDefaultBarberSchedule("Lautaro").defaultSlots,
      offWeekdays: [1],
      minTimeByWeekday: { 2: "13:00" },
    });
    expect(schedule.excludeTimesUnlessWeekday).toBeUndefined();
  });

  it("ofrece 18:20 y 19:00 de martes a viernes", () => {
    const schedule = mergeSchedule("Lautaro", {
      defaultSlots: getDefaultBarberSchedule("Lautaro").defaultSlots,
      offWeekdays: [1],
      minTimeByWeekday: { 2: "13:00" },
    });

    for (const date of ["14/07/2026", "15/07/2026", "16/07/2026", "17/07/2026"]) {
      const result = getAvailableSlots({
        date,
        professional: "Lautaro",
        schedule,
        now: farFuture,
      });
      expect(result.slots).toContain("18:20");
      expect(result.slots).toContain("19:00");
    }
  });

  it("empieza a las 13:00 los martes", () => {
    const result = getAvailableSlots({
      date: tuesday,
      professional: "Lautaro",
      now: farFuture,
    });
    expect(result.slots).not.toContain("10:00");
    expect(result.slots[0]).toBe("13:00");
  });
});

describe("Nicolas martes", () => {
  const tuesday = "14/07/2026";
  const farFuture = new Date(2026, 6, 7, 8, 0, 0);

  it("ofrece turnos de la mañana sin restricción legacy", () => {
    const result = getAvailableSlots({
      date: tuesday,
      professional: "Nicolas",
      now: farFuture,
    });
    expect(result.slots).toContain("10:00");
    expect(result.slots).toContain("11:20");
    expect(result.slots[0]).toBe("10:00");
  });

  it("ignora hora mínima 14:15 guardada en Firestore (legacy)", () => {
    const schedule = mergeSchedule("Nicolas", {
      minTimeByWeekday: { 2: "14:15" },
    });
    const result = getAvailableSlots({
      date: tuesday,
      professional: "Nicolas",
      schedule,
      now: farFuture,
    });
    expect(result.slots).toContain("10:00");
  });
});
