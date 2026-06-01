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
import { getLoyaltyProfilesForPhones, redeemLoyaltyReward, LOYALTY_REWARD_LABELS } from "@/lib/loyalty";
import { buildLoyaltyWhatsAppUrl } from "@/lib/loyalty-logic";
import { lookupLoyaltyProfile, StaffLoyaltyBadge } from "@/components/staff/StaffLoyaltyBadge";
import { useStaffAuth } from "@/components/staff/StaffAuthProvider";
import { BARBERS, type BarberName } from "@/lib/constants";
import { loadBarberSchedules, loadSalonSchedule } from "@/lib/barber-schedules";
import { DEFAULT_SALON_SCHEDULE, getAllDefaultSchedules } from "@/lib/scheduling/barber-config";
import type { BarberScheduleConfig, SalonScheduleConfig } from "@/lib/types/schedule";
import { StaffAgendaCalendar } from "@/components/staff/StaffAgendaCalendar";
import { todayDMY } from "@/lib/agenda-calendar";

type ViewMode = "calendar" | "columns" | "filter";

function AppointmentRow({
  booking,
  showBarber,
  canDelete,
  onDelete,
  onToggleSent,
  onComplete,
  loyaltyByPhone,
  onRedeem,
}: {
  booking: Booking;
  showBarber?: boolean;
  canDelete: boolean;
  onDelete: (id: string) => void;
  onToggleSent: (id: string, sent: boolean) => void;
  onComplete: (id: string) => void;
  loyaltyByPhone: Record<string, LoyaltyProfile>;
  onRedeem: (contacto: string, reward: LoyaltyRewardId) => void;
}) {
  const loyalty = lookupLoyaltyProfile(booking.contacto, loyaltyByPhone);

  return (
    <li className="group flex items-start gap-2 rounded-xl border border-white/10 bg-gradient-to-br from-[#2a2a2a] to-[#1a1a1a] p-4 text-sm shadow-md transition hover:border-gold/50 hover:translate-x-1">
      <input
        type="checkbox"
        className="mt-1 shrink-0 accent-[#c8a97e]"
        checked={booking.enviar === "S"}
        title="Marcar recordatorio enviado"
        onChange={(e) => booking.id && onToggleSent(booking.id, e.target.checked)}
      />
      <div className="min-w-0 flex-1 leading-relaxed">
        {showBarber && (
          <span className="font-semibold text-gold">{booking.profesional}: </span>
        )}
        <span>{booking.nombre}</span>
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
          title="Marcar como atendido"
          onClick={() => onComplete(booking.id!)}
        >
          Atendido
        </button>
      ) : null}
      {canDelete && booking.id && (
        <button
          type="button"
          className="shrink-0 text-red-400 opacity-70 hover:opacity-100"
          title="Eliminar turno"
          onClick={() => onDelete(booking.id!)}
        >
          🗑
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
  loyaltyByPhone,
  onRedeem,
}: {
  barber: string;
  bookings: Booking[];
  canDelete: boolean;
  onDelete: (id: string) => void;
  onToggleSent: (id: string, sent: boolean) => void;
  onComplete: (id: string) => void;
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
      const [all, barberSchedules, salon] = await Promise.all([
        getAllBookings(),
        loadBarberSchedules(),
        loadSalonSchedule(),
      ]);
      let data = staffAgendaBookings(all);
      if (staff?.role === "barber" && staff.barberName) {
        data = data.filter((b) => b.profesional === staff.barberName);
      }
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

  async function handleComplete(id: string) {
    const booking = bookings.find((b) => b.id === id);
    const hasPhone = Boolean(booking?.contacto?.trim());
    const confirmMsg = hasPhone
      ? "¿Marcar como atendido? Se sumará 1 punto y se abrirá WhatsApp para avisar al cliente."
      : "¿Marcar este turno como atendido? Se sumará 1 punto de fidelidad.";
    if (!confirm(confirmMsg)) return;

    const result = await completeBooking(id);
    await load();

    if (hasPhone && result.loyalty && result.contacto) {
      const url = buildLoyaltyWhatsAppUrl(result.contacto, result.nombre, result.loyalty);
      if (url) window.open(url, "_blank", "noopener,noreferrer");
    }
  }

  async function handleRedeem(contacto: string, reward: LoyaltyRewardId) {
    if (!confirm(`¿Marcar "${LOYALTY_REWARD_LABELS[reward]}" como canjeado?`)) return;
    await redeemLoyaltyReward(contacto, reward);
    const phones = [...new Set(bookings.map((b) => b.contacto).filter(Boolean))];
    const updated = await getLoyaltyProfilesForPhones(phones);
    setLoyaltyByPhone(updated);
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
