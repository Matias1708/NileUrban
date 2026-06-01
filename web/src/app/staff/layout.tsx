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
      <header className="border-b border-white/10 bg-surface px-4 py-4">
        <div className="mx-auto flex w-full max-w-none items-center justify-between px-2">
          <Link href="/staff" className="font-bold text-gold">Panel Staff — Nile</Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/staff" className="hover:text-gold">Agenda</Link>
            {staff?.role === "admin" && (
              <>
                <Link href="/staff/horarios" className="hover:text-gold">Horarios</Link>
                <Link href="/staff/precios" className="hover:text-gold">Precios</Link>
              </>
            )}
            {(staff?.role === "admin" || staff?.role === "barber") && (
              <>
                <Link href="/staff/fidelidad" className="hover:text-gold">Fidelidad</Link>
                <Link href="/staff/finanzas" className="hover:text-gold">Finanzas</Link>
              </>
            )}
            <span className="text-muted">{staff?.name}</span>
            <button type="button" onClick={() => logout()} className="text-red-400 hover:underline">
              Salir
            </button>
          </nav>
        </div>
      </header>
      <div className="w-full max-w-none px-4 py-8">{children}</div>
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
