import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { FixedSlot, FixedSlotException } from "@/lib/types/booking";
import type { BarberName } from "@/lib/constants";
import { isCanonicalSlotTime } from "@/lib/scheduling/barber-config";
import { recordCompletedVisit, recordProductPurchase } from "@/lib/loyalty";
import type { CompleteBookingResult } from "@/lib/bookings";
import type { LoyaltyProfile } from "@/lib/types/booking";

const FIXED_SLOTS = "turnos_fijos";
const FIXED_EXCEPTIONS = "turnos_fijos_excepciones";

let cachedActiveSlots: FixedSlot[] | null = null;
let cachedAllSlots: FixedSlot[] | null = null;
let cachedExceptions: FixedSlotException[] | null = null;
let cacheTime = 0;
const CACHE_MS = 60_000;

export function invalidateFixedSlotsCache(): void {
  cachedActiveSlots = null;
  cachedAllSlots = null;
  cachedExceptions = null;
  cacheTime = 0;
}

export function validateFixedSlot(slot: Partial<FixedSlot>): string | null {
  if (!slot.nombre?.trim() || slot.nombre.length < 2) return "Nombre requerido.";
  if (!slot.contacto?.trim() || slot.contacto.length < 8) return "Teléfono requerido (mín. 8 dígitos).";
  if (!slot.profesional) return "Seleccioná un barbero.";
  if (!slot.weekday || slot.weekday < 1 || slot.weekday > 6) return "Día inválido (lunes a sábado).";
  if (!slot.hora || !isCanonicalSlotTime(slot.hora)) return "Horario inválido.";
  if (!slot.servicio?.trim()) return "Servicio requerido.";
  return null;
}

async function fetchAllFixedSlotsFromDb(): Promise<FixedSlot[]> {
  const snap = await getDocs(collection(db, FIXED_SLOTS));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as FixedSlot));
}

export async function loadActiveFixedSlots(force = false): Promise<FixedSlot[]> {
  if (!force && cachedActiveSlots && Date.now() - cacheTime < CACHE_MS) {
    return cachedActiveSlots;
  }
  try {
    const all = await fetchAllFixedSlotsFromDb();
    cachedAllSlots = all;
    cachedActiveSlots = all.filter((s) => s.activo !== false);
    cacheTime = Date.now();
    return cachedActiveSlots;
  } catch {
    return [];
  }
}

export async function loadAllFixedSlots(force = false): Promise<FixedSlot[]> {
  if (!force && cachedAllSlots && Date.now() - cacheTime < CACHE_MS) {
    return cachedAllSlots;
  }
  try {
    cachedAllSlots = await fetchAllFixedSlotsFromDb();
    cachedActiveSlots = cachedAllSlots.filter((s) => s.activo !== false);
    cacheTime = Date.now();
    return cachedAllSlots;
  } catch {
    return [];
  }
}

export async function loadFixedSlotExceptions(force = false): Promise<FixedSlotException[]> {
  if (!force && cachedExceptions && Date.now() - cacheTime < CACHE_MS) {
    return cachedExceptions;
  }
  try {
    const snap = await getDocs(collection(db, FIXED_EXCEPTIONS));
    cachedExceptions = snap.docs.map((d) => ({ id: d.id, ...d.data() } as FixedSlotException));
    cacheTime = Date.now();
    return cachedExceptions;
  } catch {
    return [];
  }
}

export async function getFixedSlotById(id: string): Promise<FixedSlot | null> {
  const snap = await getDoc(doc(db, FIXED_SLOTS, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as FixedSlot;
}

export async function saveFixedSlot(slot: FixedSlot): Promise<string> {
  const err = validateFixedSlot(slot);
  if (err) throw new Error(err);

  const now = new Date().toISOString();
  const data = {
    nombre: slot.nombre.trim(),
    contacto: slot.contacto.trim(),
    profesional: slot.profesional,
    weekday: slot.weekday,
    hora: slot.hora,
    servicio: slot.servicio,
    activo: slot.activo !== false,
    notas: slot.notas?.trim() ?? "",
    updatedAt: now,
  };

  if (slot.id) {
    await updateDoc(doc(db, FIXED_SLOTS, slot.id), data);
    invalidateFixedSlotsCache();
    return slot.id;
  }

  const ref = await addDoc(collection(db, FIXED_SLOTS), {
    ...data,
    createdAt: now,
  });
  invalidateFixedSlotsCache();
  return ref.id;
}

export async function deactivateFixedSlot(id: string): Promise<void> {
  await updateDoc(doc(db, FIXED_SLOTS, id), {
    activo: false,
    updatedAt: new Date().toISOString(),
  });
  invalidateFixedSlotsCache();
}

export async function addFixedSlotException(
  fixedSlotId: string,
  fecha: string
): Promise<string> {
  const existing = await getDocs(
    query(
      collection(db, FIXED_EXCEPTIONS),
      where("fixedSlotId", "==", fixedSlotId),
      where("fecha", "==", fecha)
    )
  );
  if (!existing.empty) return existing.docs[0].id;

  const ref = await addDoc(collection(db, FIXED_EXCEPTIONS), { fixedSlotId, fecha });
  invalidateFixedSlotsCache();
  return ref.id;
}

export async function removeFixedSlotException(id: string): Promise<void> {
  await deleteDoc(doc(db, FIXED_EXCEPTIONS, id));
  invalidateFixedSlotsCache();
}

export async function completeFixedSlotVisit(
  fixedSlotId: string,
  fecha: string
): Promise<CompleteBookingResult> {
  const slot = await getFixedSlotById(fixedSlotId);
  if (!slot) throw new Error("Turno fijo no encontrado.");

  const existingSnap = await getDocs(
    query(
      collection(db, "Reserva"),
      where("fecha", "==", fecha),
      where("profesional", "==", slot.profesional),
      where("hora", "==", slot.hora)
    )
  );
  const existing = existingSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const alreadyDone = existing.some(
    (b) =>
      (b as { fixedSlotId?: string; estado?: string }).fixedSlotId === fixedSlotId &&
      (b as { estado?: string }).estado === "completed"
  );
  if (alreadyDone) {
    throw new Error("Este turno fijo ya fue marcado como atendido.");
  }

  const activeConflict = existing.find(
    (b) => (b as { estado?: string }).estado !== "cancelled"
  );
  if (activeConflict) {
    throw new Error("Ya hay un turno registrado en ese horario.");
  }

  const now = new Date().toISOString();
  await addDoc(collection(db, "Reserva"), {
    nombre: slot.nombre,
    fecha,
    hora: slot.hora,
    profesional: slot.profesional,
    servicio: slot.servicio,
    contacto: slot.contacto,
    enviar: "N",
    estado: "completed",
    isFixedSlot: true,
    fixedSlotId,
    completedAt: now,
    createdAt: now,
  });

  let loyalty: LoyaltyProfile | null = null;
  if (slot.contacto?.trim()) {
    loyalty = await recordCompletedVisit(slot.contacto, slot.nombre, fecha);
  }

  return {
    nombre: slot.nombre,
    contacto: slot.contacto ?? "",
    loyalty,
  };
}

export async function recordFixedSlotProduct(
  fixedSlotId: string,
  fecha: string
): Promise<LoyaltyProfile> {
  const slot = await getFixedSlotById(fixedSlotId);
  if (!slot?.contacto?.trim()) {
    throw new Error("El turno fijo no tiene teléfono.");
  }
  return recordProductPurchase(slot.contacto, slot.nombre);
}

export type { BarberName };
