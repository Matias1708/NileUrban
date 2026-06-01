import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  deleteDoc,
  updateDoc,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { Booking, WaitlistEntry, Review, LoyaltyProfile } from "@/lib/types/booking";
import { recordCompletedVisit } from "@/lib/loyalty";

export interface CompleteBookingResult {
  nombre: string;
  contacto: string;
  loyalty: LoyaltyProfile | null;
}
import { phoneLookupVariants } from "@/lib/phone";
import type { BarberName } from "@/lib/constants";
import { loadBarberSchedules, loadSalonSchedule } from "@/lib/barber-schedules";
import { validateBooking } from "@/lib/scheduling/slots";

const BOOKINGS = "Reserva";

export async function getBookingsForDateAndProfessional(
  date: string,
  professional: string
): Promise<Booking[]> {
  const q = query(
    collection(db, BOOKINGS),
    where("fecha", "==", date),
    where("profesional", "==", professional)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Booking));
}

export async function getBookingsByPhone(phone: string): Promise<Booking[]> {
  const variants = phoneLookupVariants(phone);
  if (!variants.length) return [];

  const seen = new Set<string>();
  const results: Booking[] = [];

  for (const variant of variants) {
    const q = query(collection(db, BOOKINGS), where("contacto", "==", variant));
    const snap = await getDocs(q);
    for (const d of snap.docs) {
      if (seen.has(d.id)) continue;
      seen.add(d.id);
      results.push({ id: d.id, ...d.data() } as Booking);
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return results
    .filter((b) => {
      if (!b.fecha || b.estado === "cancelled") return false;
      const parts = b.fecha.split("/");
      if (parts.length !== 3) return false;
      const appDate = new Date(+parts[2], +parts[1] - 1, +parts[0]);
      return appDate >= today;
    })
    .sort((a, b) => {
      const da = a.fecha.split("/").reverse().join("");
      const db2 = b.fecha.split("/").reverse().join("");
      if (da !== db2) return da.localeCompare(db2);
      return a.hora.localeCompare(b.hora);
    });
}

export async function createBooking(data: Omit<Booking, "id">): Promise<string> {
  const [schedules, salonSchedule] = await Promise.all([
    loadBarberSchedules(true),
    loadSalonSchedule(true),
  ]);

  const professional = data.profesional as BarberName;
  const validationError = validateBooking({
    date: data.fecha,
    time: data.hora,
    professional,
    schedule: schedules[professional],
    salonSchedule,
  });
  if (validationError) {
    throw new Error(validationError);
  }

  const existing = await getBookingsForDateAndProfessional(data.fecha, data.profesional);
  if (existing.some((b) => b.hora === data.hora && b.estado !== "cancelled")) {
    throw new Error("Ese horario ya está reservado.");
  }

  const ref = await addDoc(collection(db, BOOKINGS), {
    ...data,
    enviar: "N",
    estado: data.estado ?? "confirmed",
    createdAt: new Date().toISOString(),
  });
  return ref.id;
}

export async function getBookingById(id: string): Promise<Booking | null> {
  const snap = await getDoc(doc(db, BOOKINGS, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Booking;
}

export async function cancelBooking(id: string): Promise<void> {
  await updateDoc(doc(db, BOOKINGS, id), { estado: "cancelled" });
}

export async function getAllBookings(): Promise<Booking[]> {
  const snap = await getDocs(collection(db, BOOKINGS));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Booking))
    .filter((b) => b.fecha);
}

export async function deleteBooking(id: string): Promise<void> {
  await deleteDoc(doc(db, BOOKINGS, id));
}

export async function updateBookingSendStatus(id: string, sent: boolean): Promise<void> {
  await updateDoc(doc(db, BOOKINGS, id), { enviar: sent ? "S" : "N" });
}

export async function completeBooking(id: string): Promise<CompleteBookingResult> {
  const booking = await getBookingById(id);
  if (!booking) throw new Error("Turno no encontrado.");
  if (booking.estado === "completed") {
    return {
      nombre: booking.nombre,
      contacto: booking.contacto ?? "",
      loyalty: null,
    };
  }

  await updateDoc(doc(db, BOOKINGS, id), {
    estado: "completed",
    completedAt: new Date().toISOString(),
  });

  let loyalty: LoyaltyProfile | null = null;
  if (booking.contacto?.trim()) {
    loyalty = await recordCompletedVisit(booking.contacto, booking.nombre, booking.fecha);
  }

  return {
    nombre: booking.nombre,
    contacto: booking.contacto ?? "",
    loyalty,
  };
}

export async function addToWaitlist(entry: Omit<WaitlistEntry, "id">): Promise<string> {
  const ref = await addDoc(collection(db, "waitlist"), {
    ...entry,
    createdAt: new Date().toISOString(),
  });
  return ref.id;
}

export async function submitReview(review: Omit<Review, "id">): Promise<string> {
  const ref = await addDoc(collection(db, "reviews"), {
    ...review,
    published: false,
    createdAt: new Date().toISOString(),
  });
  return ref.id;
}

export async function getPublishedReviews(): Promise<Review[]> {
  const snap = await getDocs(collection(db, "reviews"));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Review))
    .filter((r) => r.published !== false && r.rating >= 4)
    .slice(0, 12);
}

