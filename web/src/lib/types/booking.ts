import type { BarberName } from "@/lib/constants";

export type BookingStatus = "pending" | "confirmed" | "paid" | "cancelled" | "completed";

export interface Booking {
  id?: string;
  nombre: string;
  fecha: string;
  hora: string;
  profesional: string;
  servicio: string;
  contacto: string;
  email?: string;
  enviar?: "S" | "N";
  estado?: BookingStatus;
  depositPaid?: boolean;
  manageToken?: string;
  incluidoEnAbono?: boolean;
  completedAt?: string;
  createdAt?: unknown;
  /** Turno generado desde plantilla semanal */
  isFixedSlot?: boolean;
  fixedSlotId?: string;
}

/** Plantilla de turno fijo semanal (mismo día/hora/barbero) */
export interface FixedSlot {
  id?: string;
  nombre: string;
  contacto: string;
  profesional: BarberName;
  /** 1=lunes … 6=sábado */
  weekday: number;
  hora: string;
  servicio: string;
  activo: boolean;
  notas?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** Liberar un turno fijo solo en una fecha puntual */
export interface FixedSlotException {
  id?: string;
  fixedSlotId: string;
  fecha: string;
}

export interface Expense {
  id?: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  timestamp?: unknown;
}

export interface Subscription {
  id?: string;
  client: string;
  amount: number;
  month: number;
  year: number;
  paymentDate?: string;
}

export interface WaitlistEntry {
  id?: string;
  contacto: string;
  nombre: string;
  profesional: string;
  fecha: string;
  servicio: string;
  createdAt?: unknown;
}

export interface Review {
  id?: string;
  bookingId: string;
  rating: number;
  comment: string;
  clientName?: string;
  createdAt?: unknown;
  published?: boolean;
}

export type LoyaltyRewardId = "discount_20_product" | "discount_20_cut" | "free_cut";

export interface LoyaltyProfile {
  contacto: string;
  nombre: string;
  /** Puntos en el ciclo actual (0–7, se reinicia al llegar a 8). */
  points: number;
  /** Visitas completadas en total. */
  totalVisits: number;
  /** @deprecated Usar totalVisits */
  visits?: number;
  pendingRewards?: LoyaltyRewardId[];
  lastVisit?: string;
  /** Inicio del ciclo actual (ISO). Cada 45 días se reinician puntos y premios. */
  cycleStartedAt?: string;
}

export interface StaffUser {
  uid: string;
  email: string;
  name: string;
  role: "admin" | "barber";
  barberName?: string;
}
