"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { StaffUser } from "@/lib/types/booking";
import {
  authenticateStaff,
  loadStaffSession,
  saveStaffSession,
  clearStaffSession,
} from "@/lib/staff-auth";

interface AuthContextValue {
  staff: StaffUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function StaffAuthProvider({ children }: { children: React.ReactNode }) {
  const [staff, setStaff] = useState<StaffUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setStaff(loadStaffSession());
    setLoading(false);
  }, []);

  async function login(email: string, password: string) {
    const user = authenticateStaff(email, password);
    if (!user) {
      throw new Error("Invalid credentials");
    }
    saveStaffSession(user);
    setStaff(user);
  }

  function logout() {
    clearStaffSession();
    setStaff(null);
  }

  return (
    <AuthContext.Provider value={{ staff, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useStaffAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useStaffAuth must be used within StaffAuthProvider");
  return ctx;
}
