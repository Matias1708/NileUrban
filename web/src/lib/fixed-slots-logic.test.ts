import { describe, expect, it } from "vitest";
import {
  expandFixedSlotsForDate,
  getFixedReservedTimes,
  fixedSlotSyntheticId,
  parseFixedSlotSyntheticId,
  mergeAgendaWithFixedSlots,
} from "@/lib/fixed-slots-logic";
import type { Booking, FixedSlot, FixedSlotException } from "@/lib/types/booking";

const template: FixedSlot = {
  id: "abc123",
  nombre: "Juan Pérez",
  contacto: "1164380904",
  profesional: "Nicolas",
  weekday: 2,
  hora: "10:00",
  servicio: "Corte",
  activo: true,
};

const tuesday = "09/06/2026";

describe("expandFixedSlotsForDate", () => {
  it("genera turno virtual los martes", () => {
    const result = expandFixedSlotsForDate(tuesday, [template], [], []);
    expect(result).toHaveLength(1);
    expect(result[0].nombre).toBe("Juan Pérez");
    expect(result[0].isFixedSlot).toBe(true);
    expect(result[0].id).toBe(fixedSlotSyntheticId("abc123", tuesday));
  });

  it("no muestra si hay excepción ese día", () => {
    const exceptions: FixedSlotException[] = [{ fixedSlotId: "abc123", fecha: tuesday }];
    const result = expandFixedSlotsForDate(tuesday, [template], exceptions, []);
    expect(result).toHaveLength(0);
  });

  it("no muestra si ya hay reserva real en el horario", () => {
    const bookings: Booking[] = [
      {
        id: "real1",
        nombre: "Otro",
        fecha: tuesday,
        hora: "10:00",
        profesional: "Nicolas",
        servicio: "Corte",
        contacto: "1111111111",
        estado: "confirmed",
      },
    ];
    const result = expandFixedSlotsForDate(tuesday, [template], [], bookings);
    expect(result).toHaveLength(0);
  });

  it("no muestra si ya fue atendido ese día", () => {
    const bookings: Booking[] = [
      {
        id: "done1",
        nombre: "Juan Pérez",
        fecha: tuesday,
        hora: "10:00",
        profesional: "Nicolas",
        servicio: "Corte",
        contacto: "1164380904",
        estado: "completed",
        fixedSlotId: "abc123",
      },
    ];
    const result = expandFixedSlotsForDate(tuesday, [template], [], bookings);
    expect(result).toHaveLength(0);
  });
});

describe("getFixedReservedTimes", () => {
  it("bloquea hora del turno fijo para reservas online", () => {
    const times = getFixedReservedTimes(tuesday, "Nicolas", [template], [], []);
    expect(times).toContain("10:00");
  });
});

describe("synthetic id", () => {
  it("roundtrips parse", () => {
    const id = fixedSlotSyntheticId("abc123", "09/06/2026");
    expect(parseFixedSlotSyntheticId(id)).toEqual({
      fixedSlotId: "abc123",
      fecha: "09/06/2026",
    });
  });
});

describe("mergeAgendaWithFixedSlots", () => {
  it("agrega fijos sin duplicar reservas existentes", () => {
    const agenda: Booking[] = [];
    const merged = mergeAgendaWithFixedSlots(agenda, [], [template], [], {
      weeksAhead: 2,
    });
    const tuesdaySlots = merged.filter((b) => b.fecha === tuesday);
    expect(tuesdaySlots.length).toBeGreaterThanOrEqual(1);
    expect(tuesdaySlots[0].isFixedSlot).toBe(true);
  });
});
