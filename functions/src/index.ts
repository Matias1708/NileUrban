import * as admin from "firebase-admin";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onRequest } from "firebase-functions/v2/https";
import { defineString } from "firebase-functions/params";
import { validateBookingRequest } from "./booking-validation";

admin.initializeApp();

const resendApiKey = defineString("RESEND_API_KEY", { default: "" });
const siteUrl = defineString("SITE_URL", { default: "https://nileurban.com" });

const db = admin.firestore();

interface BookingData {
  nombre: string;
  fecha: string;
  hora: string;
  profesional: string;
  servicio: string;
  contacto: string;
  enviar?: string;
  estado?: string;
}

function parseDateDMY(dateStr: string): Date | null {
  const parts = dateStr.split("/");
  if (parts.length !== 3) return null;
  const [d, m, y] = parts.map(Number);
  const date = new Date(y, m - 1, d);
  return isNaN(date.getTime()) ? null : date;
}

function formatTomorrow(): string {
  const t = new Date();
  t.setDate(t.getDate() + 1);
  const dd = String(t.getDate()).padStart(2, "0");
  const mm = String(t.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${t.getFullYear()}`;
}

async function sendBookingEmail(to: string, booking: BookingData, manageUrl: string) {
  const key = resendApiKey.value();
  if (!key) {
    console.log("RESEND_API_KEY not set, skipping email");
    return;
  }

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Nile Urban Lounge <reservas@nileurban.com>",
      to: [to],
      subject: `Turno confirmado — ${booking.fecha} ${booking.hora}hs`,
      html: `
        <h2>¡Hola ${booking.nombre}!</h2>
        <p>Tu turno en Nile Urban Lounge quedó confirmado:</p>
        <ul>
          <li><strong>Fecha:</strong> ${booking.fecha}</li>
          <li><strong>Hora:</strong> ${booking.hora}</li>
          <li><strong>Profesional:</strong> ${booking.profesional}</li>
          <li><strong>Servicio:</strong> ${booking.servicio}</li>
        </ul>
        <p><a href="${manageUrl}">Ver o cancelar tu turno</a></p>
        <p>Av. De Mayo 702, Ramos Mejía</p>
      `,
    }),
  });
}

function buildWhatsAppReminder(booking: BookingData): string {
  return `¡Hola ${booking.nombre}! 👋

Queremos recordarte tu turno en Nile el día ${booking.fecha} a las ${booking.hora} con ${booking.profesional} para tu servicio de ${booking.servicio}. 💈

Para brindarte la mejor atención, te pedimos llegar 5 minutos antes de tu horario.

En caso de cancelación o cambio, avisá con al menos 2 horas de anticipación.

¡Te esperamos!
Nile Urban Lounge`;
}

/** Triggered when a new booking is created in legacy Reserva collection */
export const onBookingCreated = onDocumentCreated(
  "Reserva/{bookingId}",
  async (event) => {
    const booking = event.data?.data() as BookingData | undefined;
    if (!booking?.fecha || !booking?.contacto) return;

    const bookingId = event.params.bookingId;
    const manageUrl = `${siteUrl.value()}/mis-turnos?tel=${encodeURIComponent(booking.contacto)}`;

    await event.data?.ref.update({
      estado: booking.estado ?? "confirmed",
      manageToken: bookingId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const email = (booking as BookingData & { email?: string }).email;
    if (email?.includes("@")) {
      await sendBookingEmail(email, booking, manageUrl);
    }

    console.log(`Booking ${bookingId} confirmed for ${booking.nombre}`);
  }
);

/** Daily reminder for tomorrow's appointments */
export const sendDailyReminders = onSchedule(
  { schedule: "0 12 * * *", timeZone: "America/Argentina/Buenos_Aires" },
  async () => {
    const tomorrow = formatTomorrow();
    const snap = await db
      .collection("Reserva")
      .where("fecha", "==", tomorrow)
      .get();

    for (const doc of snap.docs) {
      const booking = doc.data() as BookingData;
      if (booking.enviar === "S") continue;

      const phone = `549${booking.contacto}`;
      const message = buildWhatsAppReminder(booking);
      const waUrl = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;

      console.log(`Reminder ready for ${booking.nombre}: ${waUrl}`);

      await doc.ref.update({ enviar: "S", reminderSentAt: admin.firestore.FieldValue.serverTimestamp() });
    }
  }
);

/** Validate and create booking server-side (callable via HTTP) */
export const createBooking = onRequest({ cors: true }, async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { nombre, fecha, hora, profesional, servicio, contacto, email } = req.body ?? {};

  if (!nombre || !fecha || !hora || !profesional || !servicio || !contacto) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const validationError = await validateBookingRequest(db, { fecha, hora, profesional });
  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }

  const existing = await db
    .collection("Reserva")
    .where("fecha", "==", fecha)
    .where("profesional", "==", profesional)
    .where("hora", "==", hora)
    .get();

  if (!existing.empty) {
    res.status(409).json({ error: "Slot already booked" });
    return;
  }

  const ref = await db.collection("Reserva").add({
    nombre,
    fecha,
    hora,
    profesional,
    servicio,
    contacto,
    email: email ?? "",
    enviar: "N",
    estado: "confirmed",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  res.status(201).json({ id: ref.id, success: true });
});

/** Mercado Pago webhook — mark booking as paid */
export const mercadoPagoWebhook = onRequest(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).send("Method not allowed");
    return;
  }

  const { type, data } = req.body ?? {};
  if (type === "payment" && data?.id) {
    console.log(`MP payment notification: ${data.id}`);
    const bookingId = req.query.bookingId as string | undefined;
    if (bookingId) {
      await db.collection("Reserva").doc(bookingId).update({
        depositPaid: true,
        estado: "paid",
        mpPaymentId: String(data.id),
        paidAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  }

  res.status(200).send("OK");
});

/** Post-appointment review request (runs daily for yesterday's completed bookings) */
export const sendReviewRequests = onSchedule(
  { schedule: "0 18 * * *", timeZone: "America/Argentina/Buenos_Aires" },
  async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dd = String(yesterday.getDate()).padStart(2, "0");
    const mm = String(yesterday.getMonth() + 1).padStart(2, "0");
    const fecha = `${dd}/${mm}/${yesterday.getFullYear()}`;

    const snap = await db.collection("Reserva").where("fecha", "==", fecha).get();
    for (const doc of snap.docs) {
      const booking = doc.data() as BookingData;
      if (booking.estado === "cancelled") continue;
      const reviewUrl = `${siteUrl.value()}/resenas?booking=${doc.id}`;
      console.log(`Review request for ${booking.nombre}: ${reviewUrl}`);
    }
  }
);

export { parseDateDMY };
