import { NextRequest, NextResponse } from "next/server";
import { validateBooking } from "@/lib/scheduling/slots";
import { loadBarberSchedules, loadSalonSchedule } from "@/lib/barber-schedules";
import type { BarberName } from "@/lib/constants";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { nombre, fecha, hora, profesional, servicio, contacto, email } = body;

  if (!nombre || !fecha || !hora || !profesional || !servicio || !contacto) {
    return NextResponse.json({ error: "Faltan campos obligatorios." }, { status: 400 });
  }

  const [schedules, salonSchedule] = await Promise.all([
    loadBarberSchedules(true),
    loadSalonSchedule(true),
  ]);

  const validationError = validateBooking({
    date: fecha,
    time: hora,
    professional: profesional as BarberName,
    schedule: schedules[profesional as BarberName],
    salonSchedule,
  });
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const functionsUrl = process.env.FIREBASE_FUNCTIONS_URL;
  if (functionsUrl) {
    const res = await fetch(`${functionsUrl}/createBooking`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, fecha, hora, profesional, servicio, contacto, email }),
    });
    const data = await res.json();
    if (!res.ok) return NextResponse.json(data, { status: res.status });
    return NextResponse.json(data);
  }

  return NextResponse.json({
    success: true,
    clientSide: true,
    message: "Use client Firestore create when Functions URL is not configured",
  });
}
