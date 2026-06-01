import { describe, it, expect } from "vitest";
import { getServicePrice, formatPriceARS } from "@/lib/scheduling/pricing";
import { getAvailableSlots, validateBooking } from "@/lib/scheduling/slots";
import { parseDateDMY, formatDateDMY } from "@/lib/scheduling/dates";

describe("pricing", () => {
  it("applies weekday discount Mon-Wed", () => {
    // Monday 2026-06-01
    expect(getServicePrice("Corte", "01/06/2026")).toBe(22000);
    expect(getServicePrice("Corte", "05/06/2026")).toBe(24000);
  });

  it("formats ARS", () => {
    expect(formatPriceARS(24000)).toContain("24");
  });
});

describe("dates", () => {
  it("parses and formats DMY", () => {
    const d = parseDateDMY("15/06/2026");
    expect(d).not.toBeNull();
    expect(formatDateDMY(d!)).toBe("15/06/2026");
  });
});

describe("slots", () => {
  it("blocks Sunday", () => {
    const result = validateBooking({
      date: "07/06/2026",
      time: "10:00",
      professional: "Pablo",
    });
    expect(result).toBe("Domingos cerrados.");
  });

  it("returns slots for a weekday", () => {
    const { slots } = getAvailableSlots({
      date: "02/06/2026",
      professional: "Pablo",
      reservedTimes: [],
      now: new Date(2026, 5, 1, 8, 0),
    });
    expect(slots.length).toBeGreaterThan(0);
    expect(slots).not.toContain("10:15");
  });

  it("rejects non-canonical times like 10:15", () => {
    const result = validateBooking({
      date: "29/05/2026",
      time: "10:15",
      professional: "Lautaro",
    });
    expect(result).toBe("La hora seleccionada no es un turno válido.");
  });
});
