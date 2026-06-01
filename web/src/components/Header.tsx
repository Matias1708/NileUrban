"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isStaff = pathname.startsWith("/staff");

  if (isStaff) return null;

  const links = [
    { href: "/", label: "Inicio" },
    { href: "/#nosotros", label: "Nosotros" },
    { href: "/#servicios", label: "Servicios" },
    { href: "/reservar", label: "Reservas" },
    { href: "/mis-turnos", label: "Mis turnos" },
    { href: "/fidelidad", label: "Fidelidad" },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-xl font-bold tracking-tight">
          <span className="text-gold">Nile</span>
          <span className="text-white"> Urban Lounge</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`text-sm transition hover:text-gold ${
                pathname === l.href ? "text-gold" : "text-white/80"
              }`}
            >
              {l.label}
            </Link>
          ))}
          <Link href="/reservar" className="btn-primary text-sm !py-2 !px-4">
            Reservar
          </Link>
        </nav>

        <button
          type="button"
          className="md:hidden text-gold text-2xl"
          onClick={() => setOpen(!open)}
          aria-label="Menú"
        >
          ☰
        </button>
      </div>

      {open && (
        <nav className="border-t border-white/10 px-4 py-4 md:hidden">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="block py-2 text-white/90 hover:text-gold"
              onClick={() => setOpen(false)}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
