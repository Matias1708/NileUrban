"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SALON } from "@/lib/constants";

export function Footer() {
  const pathname = usePathname();
  if (pathname.startsWith("/staff")) return null;
  return (
    <footer className="border-t border-white/10 bg-surface mt-auto">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <h3 className="text-lg font-semibold text-gold">{SALON.name}</h3>
            <p className="mt-2 text-sm text-muted">{SALON.address}</p>
            <p className="mt-1 text-sm text-muted">{SALON.hours}</p>
          </div>
          <div>
            <h4 className="font-medium text-white">Enlaces</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted">
              <li><Link href="/reservar" className="hover:text-gold">Reservar turno</Link></li>
              <li><Link href="/mis-turnos" className="hover:text-gold">Mis turnos</Link></li>
              <li><Link href="/politica-cancelacion" className="hover:text-gold">Política de cancelación</Link></li>
              <li><Link href="/privacidad" className="hover:text-gold">Privacidad</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-white">Contacto</h4>
            <p className="mt-3 text-sm">
              <a href={`tel:${SALON.phone}`} className="text-gold hover:underline">{SALON.phone}</a>
            </p>
            <p className="mt-1 text-sm">
              <a href={`mailto:${SALON.email}`} className="text-muted hover:text-gold">{SALON.email}</a>
            </p>
            <a
              href={SALON.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block text-sm text-gold hover:underline"
            >
              Instagram
            </a>
          </div>
        </div>
        <p className="mt-10 border-t border-white/10 pt-6 text-center text-xs text-muted">
          © {new Date().getFullYear()} {SALON.name}. Todos los derechos reservados.
          {" · "}
          <Link href="/staff/login" className="text-white/25 hover:text-gold/70 transition">
            Personal
          </Link>
        </p>
      </div>
    </footer>
  );
}
