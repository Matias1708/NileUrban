import { describe, expect, it } from "vitest";
import { getAvailableSlots } from "@/lib/scheduling/slots";
import { getDefaultBarberSchedule, mergeSchedule } from "@/lib/scheduling/barber-config";

describe("Nicolas martes", () => {
  const tuesday = "09/06/2026"; // martes
  const farFuture = new Date(2026, 5, 1, 8, 0, 0);

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
