"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  BARBERS,
  BARBER_ALIASES,
  SALON,
  type BarberName,
  type ServiceName,
} from "@/lib/constants";
import { getAvailableSlots, validateBooking } from "@/lib/scheduling/slots";
import { getServiceOptions, getServicePrice, formatPriceARS } from "@/lib/scheduling/pricing";
import { loadBarberSchedules, loadSalonSchedule } from "@/lib/barber-schedules";
import { loadPricingConfig } from "@/lib/pricing-store";
import type { BarberScheduleConfig, SalonScheduleConfig } from "@/lib/types/schedule";
import type { PricingConfig } from "@/lib/types/pricing";
import {
  createBooking,
  getBookingsForDateAndProfessional,
  addToWaitlist,
} from "@/lib/bookings";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { BookingDatePicker } from "@/components/BookingDatePicker";

export function BookingForm() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [nombre, setNombre] = useState("");
  const [contacto, setContacto] = useState("");
  const [profesional, setProfesional] = useState<BarberName>("Matias");
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  const [servicio, setServicio] = useState<ServiceName>("Corte");
  const [slots, setSlots] = useState<string[]>([]);
  const [slotMessage, setSlotMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<{
    id: string;
    fecha: string;
    hora: string;
    profesional: string;
    servicio: string;
    price: number;
  } | null>(null);
  const [waitlistMode, setWaitlistMode] = useState(false);
  const [schedules, setSchedules] = useState<Record<string, BarberScheduleConfig> | null>(null);
  const [salonSchedule, setSalonSchedule] = useState<SalonScheduleConfig | null>(null);
  const [pricing, setPricing] = useState<PricingConfig | null>(null);

  useEffect(() => {
    Promise.all([loadBarberSchedules(), loadSalonSchedule(), loadPricingConfig()])
      .then(([barbers, salon, prices]) => {
        setSchedules(barbers);
        setSalonSchedule(salon);
        setPricing(prices);
      })
      .catch(() => {
        setSchedules(null);
        setSalonSchedule(null);
        setPricing(null);
      });
  }, []);

  useEffect(() => {
    const raw = searchParams.get("profesional") ?? searchParams.get("barber") ?? "";
    const norm = raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const mapped = BARBER_ALIASES[norm];
    if (mapped) setProfesional(mapped);
  }, [searchParams]);

  const loadSlots = useCallback(async () => {
    if (!fecha || !profesional) {
      setSlots([]);
      return;
    }
    try {
      const reserved = await getBookingsForDateAndProfessional(fecha, profesional);
      const reservedTimes = reserved
        .filter((r) => r.estado !== "cancelled")
        .map((r) => r.hora);
      const result = getAvailableSlots({
        date: fecha,
        professional: profesional,
        reservedTimes,
        schedule: schedules?.[profesional],
        salonSchedule: salonSchedule ?? undefined,
      });
      setSlots(result.slots);
      setSlotMessage(result.blockedReason ?? "");
      if (result.slots.length && !result.slots.includes(hora)) {
        setHora(result.slots[0]);
      }
      setWaitlistMode(result.slots.length === 0 && !result.blockedReason?.includes("atiende"));
    } catch {
      setSlotMessage("Error al cargar horarios.");
    }
  }, [fecha, profesional, hora, schedules, salonSchedule]);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  const serviceOptions = getServiceOptions(fecha, pricing);
  const price = getServicePrice(servicio, fecha, pricing);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    const err = validateBooking({
      date: fecha,
      time: hora,
      professional: profesional,
      schedule: schedules?.[profesional],
      salonSchedule: salonSchedule ?? undefined,
    });
    if (err) {
      alert(err);
      return;
    }

    setLoading(true);
    try {
      if (waitlistMode) {
        await addToWaitlist({ nombre, contacto, profesional, fecha, servicio });
        alert("Te agregamos a la lista de espera. Te avisamos si se libera un turno.");
        return;
      }

      const reserved = await getBookingsForDateAndProfessional(fecha, profesional);
      if (reserved.some((r) => r.hora === hora && r.estado !== "cancelled")) {
        alert("Ese horario acaba de reservarse. Elegí otro.");
        await loadSlots();
        return;
      }

      const id = await createBooking({
        nombre,
        contacto,
        fecha,
        hora,
        profesional,
        servicio,
        estado: "confirmed",
      });

      setConfirmedBooking({ id, fecha, hora, profesional, servicio, price });
      setShowConfirm(true);
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : "No pudimos completar la reserva. Intentá de nuevo.";
      alert(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="card w-full space-y-5">
        <h1 className="text-2xl font-bold text-gold">Reservá tu turno</h1>

        <div>
          <label className="label" htmlFor="nombre">Nombre completo</label>
          <input id="nombre" className="input" required value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </div>

        <div>
          <label className="label" htmlFor="contacto">Teléfono (sin 0 ni 15)</label>
          <input id="contacto" className="input" type="tel" required placeholder="Ej: 1164380904" value={contacto} onChange={(e) => setContacto(e.target.value)} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="profesional">Profesional</label>
            <select id="profesional" className="input" value={profesional} onChange={(e) => setProfesional(e.target.value as BarberName)}>
              {BARBERS.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="fecha">Fecha</label>
            <BookingDatePicker
              value={fecha}
              onChange={(dateStr) => {
                setFecha(dateStr);
                setHora("");
              }}
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="hora">Hora</label>
          <select id="hora" className="input" required value={hora} onChange={(e) => setHora(e.target.value)} disabled={!slots.length}>
            {!slots.length && <option value="">{slotMessage || "Seleccioná fecha y profesional"}</option>}
            {slots.map((s) => (
              <option key={s} value={s}>{s} hs</option>
            ))}
          </select>
          {slotMessage && <p className="mt-2 text-sm text-amber-400">{slotMessage}</p>}
        </div>

        <div>
          <label className="label" htmlFor="servicio">Servicio</label>
          <select id="servicio" className="input" value={servicio} onChange={(e) => setServicio(e.target.value as ServiceName)}>
            {serviceOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {fecha && <p className="mt-1 text-sm text-muted">Total estimado: {formatPriceARS(price)}</p>}
        </div>

        <button type="submit" className="btn-primary w-full" disabled={loading || (!waitlistMode && !slots.length)}>
          {loading ? "Reservando..." : waitlistMode ? "Unirme a lista de espera" : "Confirmar reserva"}
        </button>

        <p className="text-center text-xs text-muted">
          Al reservar aceptás nuestra{" "}
          <a href="/politica-cancelacion" className="text-gold hover:underline">política de cancelación</a>.
        </p>
      </form>

      {confirmedBooking && (
        <ConfirmationModal
          open={showConfirm}
          onClose={() => setShowConfirm(false)}
          onViewTurnos={() => {
            setShowConfirm(false);
            router.push("/mis-turnos?tel=" + encodeURIComponent(contacto));
          }}
          booking={confirmedBooking}
          calendarEvent={{
            title: `${confirmedBooking.servicio} — ${SALON.name}`,
            date: confirmedBooking.fecha,
            time: confirmedBooking.hora,
            location: SALON.address,
            details: `Barbero: ${confirmedBooking.profesional}`,
          }}
        />
      )}
    </>
  );
}
