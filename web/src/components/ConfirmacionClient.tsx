"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { getBookingById } from "@/lib/bookings";
import { SALON, type ServiceName } from "@/lib/constants";
import { getServicePrice } from "@/lib/scheduling/pricing";
import { loadPricingConfig } from "@/lib/pricing-store";
import type { Booking } from "@/lib/types/booking";

export function ConfirmacionClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const bookingId = searchParams.get("booking");

  const [booking, setBooking] = useState<Booking | null>(null);
  const [price, setPrice] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bookingId) {
      setLoading(false);
      return;
    }
    Promise.all([getBookingById(bookingId), loadPricingConfig()])
      .then(([b, pricing]) => {
        setBooking(b);
        if (b) {
          setPrice(getServicePrice(b.servicio as ServiceName, b.fecha, pricing));
        }
      })
      .finally(() => setLoading(false));
  }, [bookingId]);

  if (loading) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-muted">
        Cargando confirmación...
      </div>
    );
  }

  if (booking) {
    return (
      <ConfirmationModal
        open
        onClose={() => router.push("/")}
        onViewTurnos={() => {
          const tel = booking.contacto ? `?tel=${encodeURIComponent(booking.contacto)}` : "";
          router.push(`/mis-turnos${tel}`);
        }}
        booking={{
          fecha: booking.fecha,
          hora: booking.hora,
          profesional: booking.profesional,
          servicio: booking.servicio,
          price,
        }}
        calendarEvent={{
          title: `${booking.servicio} — ${SALON.name}`,
          date: booking.fecha,
          time: booking.hora,
          location: SALON.address,
          details: `Barbero: ${booking.profesional}`,
        }}
      />
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <div className="card">
        <h1 className="text-2xl font-bold text-gold">Reserva no encontrada</h1>
        <p className="mt-4 text-white/80">
          No pudimos cargar los datos de tu turno. Revisá en Mis turnos o contactanos por WhatsApp.
        </p>
        <Link href="/mis-turnos" className="btn-primary mt-8 inline-flex">
          Ver mis turnos
        </Link>
      </div>
    </div>
  );
}
