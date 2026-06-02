"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { StaffAuthProvider, useStaffAuth } from "@/components/staff/StaffAuthProvider";

function StaffShell({ children }: { children: React.ReactNode }) {
  const { staff, loading, logout } = useStaffAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isLogin = pathname === "/staff/login";

  useEffect(() => {
    if (!loading && !staff && !isLogin) {
      router.replace("/staff/login");
    }
  }, [staff, loading, isLogin, router]);

  if (isLogin) return <>{children}</>;

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-muted">Cargando...</div>;
  }

  if (!staff) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-white/10 bg-surface px-3 py-3 sm:px-4 sm:py-4">
        <div className="mx-auto w-full max-w-none">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center justify-between gap-3">
              <Link href="/staff" className="text-sm font-bold text-gold sm:text-base">
                Panel Staff — Nile
              </Link>
              <div className="flex items-center gap-3 text-xs sm:text-sm">
                <span className="max-w-[9rem] truncate text-muted sm:max-w-none">{staff?.name}</span>
                <button type="button" onClick={() => logout()} className="text-red-400 hover:underline">
                  Salir
                </button>
              </div>
            </div>

            <nav className="staff-top-nav pb-1 md:pb-0">
              <Link href="/staff" className="staff-top-nav-link">Agenda</Link>
              {staff?.role === "admin" && (
                <>
                  <Link href="/staff/horarios" className="staff-top-nav-link">Horarios</Link>
                  <Link href="/staff/precios" className="staff-top-nav-link">Precios</Link>
                </>
              )}
              {(staff?.role === "admin" || staff?.role === "barber") && (
                <>
                  <Link href="/staff/fidelidad" className="staff-top-nav-link">Fidelidad</Link>
                  <Link href="/staff/finanzas" className="staff-top-nav-link">Finanzas</Link>
                </>
              )}
            </nav>
          </div>
        </div>
      </header>
      <div className="w-full max-w-none px-3 py-6 sm:px-4 sm:py-8">{children}</div>
    </div>
  );
}

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <StaffAuthProvider>
      <StaffShell>{children}</StaffShell>
    </StaffAuthProvider>
  );
}
