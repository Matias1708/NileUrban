"use client";

import { formatPriceARS } from "@/lib/scheduling/pricing";
import { buildGoogleCalendarUrl, type CalendarEventParams } from "@/lib/scheduling/dates";

export interface ConfirmationBooking {
  fecha: string;
  hora: string;
  profesional: string;
  servicio: string;
  price: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onViewTurnos?: () => void;
  booking: ConfirmationBooking;
  calendarEvent: CalendarEventParams;
  title?: string;
  subtitle?: string;
}

export function ConfirmationModal({
  open,
  onClose,
  onViewTurnos,
  booking,
  calendarEvent,
  title = "¡Turno confirmado!",
  subtitle = "Te esperamos en Nile Urban Lounge",
}: Props) {
  if (!open) return null;

  const calendarUrl = buildGoogleCalendarUrl(calendarEvent);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmation-title"
      onClick={onClose}
    >
      <div
        className="card relative max-w-md w-full text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-lg text-xl text-muted transition hover:bg-white/10 hover:text-white"
          aria-label="Cerrar"
        >
          ×
        </button>

        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20 text-3xl text-green-400">
          ✓
        </div>
        <h2 id="confirmation-title" className="text-2xl font-bold text-gold">
          {title}
        </h2>
        <p className="mt-2 text-white/80">{subtitle}</p>

        <dl className="mt-6 space-y-2 text-left text-sm">
          <div className="flex justify-between border-b border-white/10 pb-2">
            <dt className="text-muted">Fecha</dt>
            <dd className="font-medium">{booking.fecha}</dd>
          </div>
          <div className="flex justify-between border-b border-white/10 pb-2">
            <dt className="text-muted">Hora</dt>
            <dd className="font-medium">{booking.hora} hs</dd>
          </div>
          <div className="flex justify-between border-b border-white/10 pb-2">
            <dt className="text-muted">Profesional</dt>
            <dd className="font-medium">{booking.profesional}</dd>
          </div>
          <div className="flex justify-between border-b border-white/10 pb-2">
            <dt className="text-muted">Servicio</dt>
            <dd className="font-medium">{booking.servicio}</dd>
          </div>
          <div className="flex justify-between pb-2">
            <dt className="text-muted">Precio estimado</dt>
            <dd className="font-bold text-gold">{formatPriceARS(booking.price)}</dd>
          </div>
        </dl>

        <div className="mt-6 text-left">
          <p className="text-sm font-medium text-white/90">Recordatorio personal (opcional)</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Guardalo en tu celular para no olvidarte. No avisa al salón — tu turno ya quedó registrado.
          </p>
          <a
            href={calendarUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary mt-3 w-full text-sm"
          >
            Agregar a Google Calendar
          </a>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          {onViewTurnos && (
            <button type="button" onClick={onViewTurnos} className="btn-primary w-full">
              Ver mis turnos
            </button>
          )}
          <button type="button" onClick={onClose} className="text-sm text-muted hover:text-white">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
