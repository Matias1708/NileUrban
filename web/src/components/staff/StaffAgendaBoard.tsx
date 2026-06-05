"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  getAllBookings,
  deleteBooking,
  updateBookingSendStatus,
  completeBooking,
} from "@/lib/bookings";
import {
  staffAgendaBookings,
  groupByBarber,
  groupByDate,
  getDayName,
  sortByTime,
  buildReminderWhatsAppUrl,
} from "@/lib/agenda-utils";
import type { Booking, LoyaltyProfile, LoyaltyRewardId } from "@/lib/types/booking";
import { getLoyaltyProfilesForPhones, redeemLoyaltyReward, recordProductPurchase, getRewardLabel, formatPoints, LOYALTY_POINTS_PER_CUT, LOYALTY_POINTS_PER_PRODUCT } from "@/lib/loyalty";
import { buildLoyaltyWhatsAppUrl } from "@/lib/loyalty-logic";
import { lookupLoyaltyProfile, StaffLoyaltyBadge } from "@/components/staff/StaffLoyaltyBadge";
import { useStaffAuth } from "@/components/staff/StaffAuthProvider";
import { BARBERS, type BarberName } from "@/lib/constants";
import { loadBarberSchedules, loadSalonSchedule } from "@/lib/barber-schedules";
import { DEFAULT_SALON_SCHEDULE, getAllDefaultSchedules } from "@/lib/scheduling/barber-config";
import type { BarberScheduleConfig, SalonScheduleConfig } from "@/lib/types/schedule";
import { StaffAgendaCalendar } from "@/components/staff/StaffAgendaCalendar";
import { todayDMY } from "@/lib/agenda-calendar";
import {
  loadActiveFixedSlots,
  loadFixedSlotExceptions,
  completeFixedSlotVisit,
  recordFixedSlotProduct,
  addFixedSlotException,
} from "@/lib/fixed-slots";
import { mergeAgendaWithFixedSlots, isFixedSlotBookingId, parseFixedSlotSyntheticId } from "@/lib/fixed-slots-logic";

type ViewMode = "calendar" | "columns" | "filter";

function AppointmentRow({
  booking,
  showBarber,
  canDelete,
  onDelete,
  onToggleSent,
  onComplete,
  onProductPurchase,
  loyaltyByPhone,
  onRedeem,
}: {
  booking: Booking;
  showBarber?: boolean;
  canDelete: boolean;
  onDelete: (id: string) => void;
  onToggleSent: (id: string, sent: boolean) => void;
  onComplete: (id: string) => void;
  onProductPurchase: (id: string) => void;
  loyaltyByPhone: Record<string, LoyaltyProfile>;
  onRedeem: (contacto: string, reward: LoyaltyRewardId) => void;
}) {
  const loyalty = lookupLoyaltyProfile(booking.contacto, loyaltyByPhone);

  return (
    <li
      className={`group flex items-start gap-2 rounded-xl border p-4 text-sm shadow-md transition hover:translate-x-1 ${
        booking.isFixedSlot
          ? "staff-appointment-row--fixed border-sky-500/30 bg-gradient-to-br from-sky-950/35 to-[#1a1a1a] hover:border-sky-400/45"
          : "staff-appointment-row--daily border-amber-500/35 bg-gradient-to-br from-amber-950/35 to-[#1a1a1a] hover:border-amber-400/50"
      }`}
    >
      {!booking.isFixedSlot ? (
        <input
          type="checkbox"
          className="mt-1 shrink-0 accent-[#c8a97e]"
          checked={booking.enviar === "S"}
          title="Marcar recordatorio enviado"
          onChange={(e) => booking.id && onToggleSent(booking.id, e.target.checked)}
        />
      ) : (
        <span className="mt-1 w-4 shrink-0" aria-hidden />
      )}
      <div className="min-w-0 flex-1 leading-relaxed">
        {showBarber && (
          <span className="font-semibold text-gold">{booking.profesional}: </span>
        )}
        <span>{booking.nombre}</span>
        {booking.isFixedSlot ? (
          <span className="staff-appointment-badge staff-appointment-badge--fixed">Fijo</span>
        ) : (
          <span className="staff-appointment-badge staff-appointment-badge--daily">Web</span>
        )}
        <span className="text-white/60"> — {booking.hora}hs — {booking.servicio} — </span>
        {booking.contacto ? (
          <a
            href={buildReminderWhatsAppUrl(booking)}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-[#00e676] hover:text-[#00ff88] hover:underline"
          >
            {booking.contacto}
          </a>
        ) : (
          <span className="text-muted">sin teléfono</span>
        )}
        {loyalty ? (
          <StaffLoyaltyBadge
            profile={loyalty}
            onRedeem={
              booking.contacto
                ? (reward) => onRedeem(booking.contacto, reward)
                : undefined
            }
          />
        ) : null}
      </div>
      {booking.estado !== "completed" && booking.id ? (
        <button
          type="button"
          className="shrink-0 rounded-lg border border-green-500/40 px-2 py-1 text-xs font-semibold text-green-400 hover:bg-green-500/10"
          title={`Marcar como atendido (+${formatPoints(LOYALTY_POINTS_PER_CUT)})`}
          onClick={() => onComplete(booking.id!)}
        >
          Atendido
        </button>
      ) : null}
      {booking.contacto?.trim() && booking.id ? (
        <button
          type="button"
          className="shrink-0 rounded-lg border border-gold/40 px-2 py-1 text-xs font-semibold text-gold hover:bg-gold/10"
          title={`Registrar compra de producto (+${formatPoints(LOYALTY_POINTS_PER_PRODUCT)})`}
          onClick={() => onProductPurchase(booking.id!)}
        >
          Producto
        </button>
      ) : null}
      {canDelete && booking.id && !booking.isFixedSlot && (
        <button
          type="button"
          className="shrink-0 text-red-400 opacity-70 hover:opacity-100"
          title="Eliminar turno"
          onClick={() => onDelete(booking.id!)}
        >
          🗑
        </button>
      )}
      {booking.isFixedSlot && booking.id && (
        <button
          type="button"
          className="shrink-0 text-xs text-amber-400 opacity-80 hover:opacity-100"
          title="Liberar solo hoy"
          onClick={() => onDelete(booking.id!)}
        >
          Liberar hoy
        </button>
      )}
    </li>
  );
}

function BarberColumn({
  barber,
  bookings,
  canDelete,
  onDelete,
  onToggleSent,
  onComplete,
  onProductPurchase,
  loyaltyByPhone,
  onRedeem,
}: {
  barber: string;
  bookings: Booking[];
  canDelete: boolean;
  onDelete: (id: string) => void;
  onToggleSent: (id: string, sent: boolean) => void;
  onComplete: (id: string) => void;
  onProductPurchase: (id: string) => void;
  loyaltyByPhone: Record<string, LoyaltyProfile>;
  onRedeem: (contacto: string, reward: LoyaltyRewardId) => void;
}) {
  const byDate = groupByDate(bookings);
  const dates = Object.keys(byDate).sort((a, b) => {
    const pa = a.split("/").reverse().join("");
    const pb = b.split("/").reverse().join("");
    return pa.localeCompare(pb);
  });

  return (
    <div className="staff-barber-column relative min-h-[320px] overflow-hidden rounded-2xl border-2 border-[#333] bg-gradient-to-br from-[#1e1e1e] to-[#2d2d2d] p-5 shadow-xl">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-gold via-[#d4b896] to-gold" />
      <h3 className="mb-6 border-b-2 border-gold pb-3 text-center text-xl font-bold uppercase tracking-widest text-gold">
        {barber}
      </h3>
      {dates.length === 0 ? (
        <p className="text-center text-sm italic text-muted">Sin turnos</p>
      ) : (
        dates.map((date) => (
          <div key={date} className="mb-5">
            <h4 className="mb-3 rounded-lg border-l-4 border-gold bg-gold/10 px-4 py-2 text-sm font-bold uppercase tracking-wide text-white">
              {getDayName(date)} {date}
            </h4>
            <ul className="space-y-3">
              {[...byDate[date]].sort(sortByTime).map((b) => (
                <AppointmentRow
                  key={b.id ?? `${b.fecha}-${b.hora}-${b.nombre}`}
                  booking={b}
                  canDelete={canDelete}
                  onDelete={onDelete}
                  onToggleSent={onToggleSent}
                  onComplete={onComplete}
                  onProductPurchase={onProductPurchase}
                  loyaltyByPhone={loyaltyByPhone}
                  onRedeem={onRedeem}
                />
              ))}
            </ul>
          </div>
        ))
      )}
    </div>
  );
}

export function StaffAgendaBoard() {
  const { staff } = useStaffAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>("calendar");
  const [filterBarber, setFilterBarber] = useState("");
  const [selectedDate, setSelectedDate] = useState(todayDMY());
  const [schedules, setSchedules] = useState<Record<BarberName, BarberScheduleConfig>>(
    getAllDefaultSchedules()
  );
  const [salonSchedule, setSalonSchedule] = useState<SalonScheduleConfig>(DEFAULT_SALON_SCHEDULE);
  const [loyaltyByPhone, setLoyaltyByPhone] = useState<Record<string, LoyaltyProfile>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [all, barberSchedules, salon, fixedSlots, exceptions] = await Promise.all([
        getAllBookings(),
        loadBarberSchedules(),
        loadSalonSchedule(),
        loadActiveFixedSlots(),
        loadFixedSlotExceptions(),
      ]);
      let data = staffAgendaBookings(all);
      const barberFilter =
        staff?.role === "barber" && staff.barberName ? staff.barberName : undefined;
      data = mergeAgendaWithFixedSlots(data, all, fixedSlots, exceptions, {
        barberFilter,
      });
      setBookings(data);
      setSchedules(barberSchedules);
      setSalonSchedule(salon);
    } finally {
      setLoading(false);
    }
  }, [staff]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const phones = [...new Set(bookings.map((b) => b.contacto).filter(Boolean))];
    if (!phones.length) {
      setLoyaltyByPhone({});
      return;
    }
    getLoyaltyProfilesForPhones(phones)
      .then(setLoyaltyByPhone)
      .catch(() => setLoyaltyByPhone({}));
  }, [bookings]);

  async function handleDelete(id: string) {
    if (isFixedSlotBookingId(id)) {
      const parsed = parseFixedSlotSyntheticId(id);
      if (!parsed) return;
      if (!confirm("¿Liberar este turno fijo solo para hoy? El horario quedará disponible en la web.")) {
        return;
      }
      await addFixedSlotException(parsed.fixedSlotId, parsed.fecha);
      await load();
      return;
    }
    if (!confirm("¿Eliminar este turno?")) return;
    await deleteBooking(id);
    await load();
  }

  async function handleToggleSent(id: string, sent: boolean) {
    await updateBookingSendStatus(id, sent);
    setBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, enviar: sent ? "S" : "N" } : b))
    );
  }

  async function refreshLoyalty() {
    const phones = [...new Set(bookings.map((b) => b.contacto).filter(Boolean))];
    const updated = await getLoyaltyProfilesForPhones(phones);
    setLoyaltyByPhone(updated);
  }

  async function handleComplete(id: string) {
    const booking = bookings.find((b) => b.id === id);
    const hasPhone = Boolean(booking?.contacto?.trim());
    const confirmMsg = hasPhone
      ? "¿Marcar como atendido? Se sumarán 2 puntos y se abrirá WhatsApp para avisar al cliente."
      : "¿Marcar este turno como atendido? Se sumarán 2 puntos de fidelidad.";
    if (!confirm(confirmMsg)) return;

    let result;
    if (isFixedSlotBookingId(id)) {
      const parsed = parseFixedSlotSyntheticId(id);
      if (!parsed) return;
      result = await completeFixedSlotVisit(parsed.fixedSlotId, parsed.fecha);
    } else {
      result = await completeBooking(id);
    }
    await load();

    if (hasPhone && result.loyalty && result.contacto) {
      const url = buildLoyaltyWhatsAppUrl(result.contacto, result.nombre, result.loyalty);
      if (url) window.open(url, "_blank", "noopener,noreferrer");
    }
  }

  async function handleProductPurchase(id: string) {
    const booking = bookings.find((b) => b.id === id);
    if (!booking?.contacto?.trim()) {
      alert("Este turno no tiene teléfono — no se pueden sumar puntos.");
      return;
    }
    if (!confirm(`¿Sumar 1 punto por producto a ${booking.nombre}?`)) return;

    if (isFixedSlotBookingId(id)) {
      const parsed = parseFixedSlotSyntheticId(id);
      if (!parsed) return;
      await recordFixedSlotProduct(parsed.fixedSlotId, parsed.fecha);
    } else {
      await recordProductPurchase(booking.contacto, booking.nombre);
    }
    await refreshLoyalty();
  }

  async function handleRedeem(contacto: string, reward: LoyaltyRewardId) {
    if (!confirm(`¿Marcar "${getRewardLabel(reward)}" como canjeado?`)) return;
    await redeemLoyaltyReward(contacto, reward);
    await refreshLoyalty();
  }

  const barbersToShow: BarberName[] =
    staff?.role === "barber" && staff.barberName
      ? [staff.barberName as BarberName]
      : [...BARBERS];

  const byBarber = groupByBarber(bookings);
  const filterViewBookings = filterBarber
    ? bookings.filter((b) => b.profesional === filterBarber)
    : bookings;
  const filterByDate = groupByDate(filterViewBookings);
  const filterDates = Object.keys(filterByDate).sort((a, b) =>
    a.split("/").reverse().join("").localeCompare(b.split("/").reverse().join(""))
  );

  const canDelete = staff?.role === "admin";

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gold">Turnos reservados</h1>
        <p className="text-sm text-muted">Solo turnos futuros</p>
      </div>

      <div className="mb-6 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          className={`rounded-lg border-2 px-5 py-2.5 text-sm font-bold uppercase tracking-wide transition ${
            view === "calendar"
              ? "border-gold bg-gold text-black shadow-lg shadow-gold/20"
              : "border-[#555] bg-[#333] text-white hover:bg-[#555]"
          }`}
          onClick={() => setView("calendar")}
        >
          Calendario
        </button>
        <button
          type="button"
          className={`rounded-lg border-2 px-5 py-2.5 text-sm font-bold uppercase tracking-wide transition ${
            view === "columns"
              ? "border-gold bg-gold text-black shadow-lg shadow-gold/20"
              : "border-[#555] bg-[#333] text-white hover:bg-[#555]"
          }`}
          onClick={() => setView("columns")}
        >
          Vista por columnas
        </button>
        <button
          type="button"
          className={`rounded-lg border-2 px-5 py-2.5 text-sm font-bold uppercase tracking-wide transition ${
            view === "filter"
              ? "border-gold bg-gold text-black shadow-lg shadow-gold/20"
              : "border-[#555] bg-[#333] text-white hover:bg-[#555]"
          }`}
          onClick={() => setView("filter")}
        >
          Vista con filtro
        </button>
        <Link
          href="/staff/turnos-fijos"
          className="rounded-lg border-2 border-[#555] bg-[#333] px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-white no-underline transition hover:bg-[#555]"
        >
          Turnos fijos
        </Link>
        <Link
          href="/staff/fidelidad"
          className="rounded-lg border-2 border-[#555] bg-[#333] px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-white no-underline transition hover:bg-[#555]"
        >
          Fidelidad
        </Link>
        <Link
          href="/staff/finanzas"
          className="rounded-lg border-2 border-[#555] bg-[#333] px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-white no-underline transition hover:bg-[#555]"
        >
          Ir a finanzas
        </Link>
      </div>

      <div className="staff-agenda-legend mb-4 flex flex-wrap items-center justify-center gap-4 text-xs text-muted">
        <span className="inline-flex items-center gap-2">
          <span className="staff-agenda-legend-swatch staff-agenda-legend-swatch--daily" aria-hidden />
          Reserva web
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="staff-agenda-legend-swatch staff-agenda-legend-swatch--fixed" aria-hidden />
          Turno fijo
        </span>
      </div>

      {loading ? (
        <p className="text-center text-muted">Cargando turnos...</p>
      ) : view === "calendar" ? (
        <StaffAgendaCalendar
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          barbers={barbersToShow}
          bookings={bookings}
          schedules={schedules}
          salonSchedule={salonSchedule}
          canDelete={canDelete}
          onDelete={handleDelete}
          onToggleSent={handleToggleSent}
          onComplete={handleComplete}
          onProductPurchase={handleProductPurchase}
          onReleaseFixed={handleDelete}
          loyaltyByPhone={loyaltyByPhone}
        />
      ) : view === "columns" ? (
        <div className="staff-barber-columns">
          {barbersToShow.map((barber) => (
            <BarberColumn
              key={barber}
              barber={barber}
              bookings={byBarber[barber] ?? []}
              canDelete={canDelete}
              onDelete={handleDelete}
              onToggleSent={handleToggleSent}
              onComplete={handleComplete}
              onProductPurchase={handleProductPurchase}
              loyaltyByPhone={loyaltyByPhone}
              onRedeem={handleRedeem}
            />
          ))}
        </div>
      ) : (
        <div>
          <div className="mb-6 rounded-xl border border-white/10 bg-black/40 p-4 text-center">
            <label htmlFor="barber-filter" className="mr-3 text-sm text-white">
              Filtrar por barbero:
            </label>
            <select
              id="barber-filter"
              className="input inline-block w-auto min-w-[180px]"
              value={filterBarber}
              onChange={(e) => setFilterBarber(e.target.value)}
            >
              <option value="">Todos los barberos</option>
              {BARBERS.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
          {filterDates.length === 0 ? (
            <p className="text-center text-muted">No hay turnos futuros.</p>
          ) : (
            filterDates.map((date) => (
              <div key={date} className="mb-8">
                <h3 className="mb-4 border-l-4 border-gold bg-gold/10 px-4 py-2 text-lg font-bold uppercase text-gold">
                  {getDayName(date)} {date}
                </h3>
                <ul className="space-y-3">
                  {[...filterByDate[date]].sort(sortByTime).map((b) => (
                    <AppointmentRow
                      key={b.id ?? `${b.fecha}-${b.hora}-${b.nombre}`}
                      booking={b}
                      showBarber
                      canDelete={canDelete}
                      onDelete={handleDelete}
                      onToggleSent={handleToggleSent}
                      onComplete={handleComplete}
                      onProductPurchase={handleProductPurchase}
                      loyaltyByPhone={loyaltyByPhone}
                      onRedeem={handleRedeem}
                    />
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
