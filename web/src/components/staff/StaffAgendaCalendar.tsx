"use client";

import { Fragment, useMemo } from "react";
import type { Booking, LoyaltyProfile } from "@/lib/types/booking";
import { lookupLoyaltyProfile, StaffLoyaltyBadge } from "@/components/staff/StaffLoyaltyBadge";
import type { BarberName } from "@/lib/constants";
import type { BarberScheduleConfig, SalonScheduleConfig } from "@/lib/types/schedule";
import {
  buildDayGrid,
  bookingAt,
  dayLoadFromCount,
  dayNumberDMY,
  getWeekDaysDMY,
  slotAvailableForBarber,
  shiftDateDMY,
  todayDMY,
  dmyToIso,
  isoToDMY,
  type DayLoad,
} from "@/lib/agenda-calendar";
import { buildReminderWhatsAppUrl, getDayName, getShortWeekday } from "@/lib/agenda-utils";
import {
  formatPoints,
  LOYALTY_POINTS_PER_CUT,
  LOYALTY_POINTS_PER_PRODUCT,
} from "@/lib/loyalty-logic";

interface StaffAgendaCalendarProps {
  selectedDate: string;
  onDateChange: (dmy: string) => void;
  barbers: BarberName[];
  bookings: Booking[];
  schedules: Record<BarberName, BarberScheduleConfig>;
  salonSchedule: SalonScheduleConfig;
  canDelete: boolean;
  onDelete: (id: string) => void;
  onToggleSent: (id: string, sent: boolean) => void;
  onComplete: (id: string) => void;
  onProductPurchase: (id: string) => void;
  loyaltyByPhone: Record<string, LoyaltyProfile>;
}

function dayBadgeLabel(load: DayLoad, count: number): string {
  if (load === "closed") return "Cerrado";
  if (load === "empty") return "Sin turnos";
  return `${count} turno${count !== 1 ? "s" : ""}`;
}

function CalendarCell({
  booking,
  isAvailable,
  barberOff,
  canDelete,
  onDelete,
  onToggleSent,
  onComplete,
  onProductPurchase,
  loyaltyByPhone,
}: {
  booking?: Booking;
  isAvailable: boolean;
  barberOff: boolean;
  canDelete: boolean;
  onDelete: (id: string) => void;
  onToggleSent: (id: string, sent: boolean) => void;
  onComplete: (id: string) => void;
  onProductPurchase: (id: string) => void;
  loyaltyByPhone: Record<string, LoyaltyProfile>;
}) {
  if (barberOff) {
    return (
      <div className="staff-calendar-cell staff-calendar-cell-off" aria-hidden>
        <span className="staff-calendar-off-mark">—</span>
      </div>
    );
  }

  if (booking) {
    const loyalty = lookupLoyaltyProfile(booking.contacto, loyaltyByPhone);
    const isCompleted = booking.estado === "completed";

    return (
      <div className={`staff-calendar-cell staff-calendar-cell-booked${isCompleted ? " is-completed" : ""}`}>
        <article className="staff-calendar-booking-card">
          <div className="staff-calendar-booking-body">
            <p className="staff-calendar-booking-name">{booking.nombre}</p>
            <span className="staff-calendar-booking-service">{booking.servicio}</span>
            {booking.contacto ? (
              <a
                href={buildReminderWhatsAppUrl(booking)}
                target="_blank"
                rel="noopener noreferrer"
                className="staff-calendar-booking-phone"
              >
                {booking.contacto}
              </a>
            ) : (
              <span className="staff-calendar-booking-phone-muted">Sin teléfono</span>
            )}
            {loyalty ? <StaffLoyaltyBadge profile={loyalty} compact /> : null}
          </div>
          <div className="staff-calendar-booking-footer">
            <label className="staff-calendar-check" title="Recordatorio enviado">
              <input
                type="checkbox"
                checked={booking.enviar === "S"}
                onChange={(e) => booking.id && onToggleSent(booking.id, e.target.checked)}
              />
              <span>Rec.</span>
            </label>
            {booking.id && booking.estado !== "completed" ? (
              <button
                type="button"
                className="staff-calendar-complete"
                title={`Marcar como atendido (+${formatPoints(LOYALTY_POINTS_PER_CUT)})`}
                onClick={() => onComplete(booking.id!)}
              >
                Atendido
              </button>
            ) : null}
            {booking.id && booking.contacto?.trim() ? (
              <button
                type="button"
                className="staff-calendar-product"
                title={`Registrar compra de producto (+${formatPoints(LOYALTY_POINTS_PER_PRODUCT)})`}
                onClick={() => onProductPurchase(booking.id!)}
              >
                Prod.
              </button>
            ) : null}
            {canDelete && booking.id ? (
              <button
                type="button"
                className="staff-calendar-delete"
                title="Eliminar turno"
                onClick={() => onDelete(booking.id!)}
              >
                Eliminar
              </button>
            ) : null}
          </div>
        </article>
      </div>
    );
  }

  if (isAvailable) {
    return (
      <div
        className="staff-calendar-cell staff-calendar-cell-free"
        title="Horario disponible"
        aria-label="Disponible"
      >
        <span className="staff-calendar-free-label">Libre</span>
      </div>
    );
  }

  return (
    <div className="staff-calendar-cell staff-calendar-cell-off" aria-hidden>
      <span className="staff-calendar-off-mark">·</span>
    </div>
  );
}

export function StaffAgendaCalendar({
  selectedDate,
  onDateChange,
  barbers,
  bookings,
  schedules,
  salonSchedule,
  canDelete,
  onDelete,
  onToggleSent,
  onComplete,
  onProductPurchase,
  loyaltyByPhone,
}: StaffAgendaCalendarProps) {
  const dayBookings = bookings.filter((b) => b.fecha === selectedDate);
  const { times, barbers: barberGrids } = buildDayGrid(
    selectedDate,
    barbers,
    schedules,
    salonSchedule,
    dayBookings
  );

  const bookingCountByDate = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const b of bookings) {
      counts[b.fecha] = (counts[b.fecha] ?? 0) + 1;
    }
    return counts;
  }, [bookings]);

  const weekDays = useMemo(() => getWeekDaysDMY(selectedDate), [selectedDate]);

  const iso = dmyToIso(selectedDate) ?? "";
  const isToday = selectedDate === todayDMY();
  const dayLabel = getDayName(selectedDate);

  const salonClosed = barberGrids.every((g) => g.blockedReason?.includes("cerrad"));
  const allOff = barberGrids.every((g) => g.blockedReason && !g.slots.length);
  const dayClosed = salonClosed || (allOff && times.length === 0);
  const dayLoad = dayLoadFromCount(dayBookings.length, dayClosed);

  return (
    <div className="staff-calendar">
      <div className={`staff-calendar-toolbar staff-calendar-toolbar--${dayLoad}`}>
        <div className="staff-calendar-toolbar-nav">
          <button
            type="button"
            className="staff-calendar-nav-btn"
            onClick={() => onDateChange(shiftDateDMY(selectedDate, -1))}
            aria-label="Día anterior"
          >
            ←
          </button>
          <div className="staff-calendar-toolbar-date">
            <p className="staff-calendar-toolbar-title">
              <span className="capitalize">{dayLabel}</span> {selectedDate}
            </p>
            <div className="staff-calendar-toolbar-meta">
              {isToday && <span className="staff-calendar-today-tag">Hoy</span>}
              <span className={`staff-calendar-day-badge staff-calendar-day-badge--${dayLoad}`}>
                {dayBadgeLabel(dayLoad, dayBookings.length)}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="staff-calendar-nav-btn"
            onClick={() => onDateChange(shiftDateDMY(selectedDate, 1))}
            aria-label="Día siguiente"
          >
            →
          </button>
        </div>
        <div className="staff-calendar-toolbar-actions">
          <input
            type="date"
            className="input staff-calendar-date-input"
            value={iso}
            onChange={(e) => e.target.value && onDateChange(isoToDMY(e.target.value))}
          />
          {!isToday && (
            <button
              type="button"
              className="staff-calendar-nav-btn text-xs"
              onClick={() => onDateChange(todayDMY())}
            >
              Hoy
            </button>
          )}
        </div>
      </div>

      <div className="staff-calendar-week" role="group" aria-label="Semana">
        {weekDays.map((day) => {
          const count = bookingCountByDate[day] ?? 0;
          const selected = day === selectedDate;
          const today = day === todayDMY();
          const load = dayLoadFromCount(count, false);

          return (
            <button
              key={day}
              type="button"
              className={[
                "staff-calendar-week-day",
                selected && "is-selected",
                today && "is-today",
                count > 0 ? `has-bookings--${load}` : "is-empty",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => onDateChange(day)}
              aria-current={selected ? "date" : undefined}
              aria-label={`${getDayName(day)} ${day}, ${count} turnos`}
            >
              <span className="staff-calendar-week-label">{getShortWeekday(day)}</span>
              <span className="staff-calendar-week-num">{dayNumberDMY(day)}</span>
              {count > 0 ? (
                <span className="staff-calendar-week-dot" aria-hidden />
              ) : (
                <span className="staff-calendar-week-dot staff-calendar-week-dot--empty" aria-hidden />
              )}
            </button>
          );
        })}
      </div>

      {salonClosed || (allOff && times.length === 0) ? (
        <div className="staff-calendar-empty-state">
          {salonClosed
            ? "Domingo — salón cerrado"
            : "Ningún barbero trabaja este día"}
        </div>
      ) : times.length === 0 ? (
        <div className="staff-calendar-empty-state">
          Sin horarios configurados para este día
        </div>
      ) : (
        <div className="staff-calendar-scroll">
          <div
            className="staff-calendar-grid"
            style={{ gridTemplateColumns: `4.5rem repeat(${barbers.length}, minmax(140px, 1fr))` }}
          >
            <div className="staff-calendar-corner" />
            {barbers.map((b) => (
              <div key={b} className="staff-calendar-barber-header">
                {b}
              </div>
            ))}

            {times.map((time) => (
              <Fragment key={time}>
                <div className="staff-calendar-time">{time}</div>
                {barberGrids.map((grid) => {
                  const b = bookingAt(dayBookings, grid.barber, time, grid);
                  const available = slotAvailableForBarber(grid, time);
                  const barberOff = Boolean(grid.blockedReason);
                  return (
                    <CalendarCell
                      key={`${grid.barber}-${time}`}
                      booking={b}
                      isAvailable={available && !b}
                      barberOff={barberOff && !b}
                      canDelete={canDelete}
                      onDelete={onDelete}
                      onToggleSent={onToggleSent}
                      onComplete={onComplete}
                      onProductPurchase={onProductPurchase}
                      loyaltyByPhone={loyaltyByPhone}
                    />
                  );
                })}
              </Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
