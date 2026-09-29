import type { StaffUser } from "@/lib/types/booking";

const SESSION_KEY = "nile-staff-session";

/** Mismas credenciales que principal.html y finance.html */
export const STAFF_ADMIN = {
  email: "admin@example.com",
  password: "admin123",
};

export const STAFF_BY_PASSWORD: Record<string, Omit<StaffUser, "uid" | "email">> = {
  roquefort: { name: "Nicolas", role: "admin", barberName: "Nicolas" },
  lautaro123: { name: "Lautaro", role: "barber", barberName: "Lautaro" },
  pablo123: { name: "Pablo", role: "barber", barberName: "Pablo" },
  matias123: { name: "Matias", role: "barber", barberName: "Matias" },
};

export function authenticateStaff(email: string, password: string): StaffUser | null {
  const pass = password.trim();
  const mail = email.trim().toLowerCase();

  if (mail === STAFF_ADMIN.email && pass === STAFF_ADMIN.password) {
    return {
      uid: "admin",
      email: STAFF_ADMIN.email,
      name: "Admin",
      role: "admin",
    };
  }

  const byPass = STAFF_BY_PASSWORD[pass];
  if (byPass) {
    return {
      uid: byPass.name.toLowerCase(),
      email: mail || `${byPass.name.toLowerCase()}@nile.local`,
      ...byPass,
    };
  }

  return null;
}

/** Quién ve el acceso a Finanzas (el contenido puede requerir clave de Nicolás) */
export function canViewFinance(staff: StaffUser | null): boolean {
  return staff?.role === "admin";
}

export function isFinanceOwner(staff: StaffUser | null): boolean {
  return staff?.barberName === "Nicolas";
}

export function verifyFinancePassword(password: string): boolean {
  return STAFF_BY_PASSWORD[password.trim()]?.barberName === "Nicolas";
}

export function loadStaffSession(): StaffUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as StaffUser) : null;
  } catch {
    return null;
  }
}

export function saveStaffSession(staff: StaffUser): void {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(staff));
}

export function clearStaffSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem("nile-finance-unlocked");
}
