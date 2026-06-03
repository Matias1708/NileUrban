import Link from "next/link";
import { SALON } from "@/lib/constants";

const ABONOS_WHATSAPP_MSG = encodeURIComponent(
  "Hola! Quiero más información sobre el Club de Abonos de Nile Urban Lounge."
);

export default function AbonosPage() {
  const abonosWaUrl = `https://api.whatsapp.com/send?phone=${SALON.whatsapp}&text=${ABONOS_WHATSAPP_MSG}`;

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <p className="text-sm text-muted">
        <Link href="/fidelidad" className="text-gold hover:underline">
          ← Programa de fidelidad
        </Link>
      </p>

      <h1 className="mt-4 text-3xl font-bold text-gold">
        Club de Abonos: Tu Estilo Siempre Impecable
      </h1>
      <p className="mt-4 text-lg text-white/85">
        Mantener tu corte perfecto nunca fue tan simple ni tan inteligente. Con nuestro sistema de
        abonos, asegurás tus turnos del mes, congelás el precio y accedés a beneficios exclusivos.
      </p>

      <h2 className="mt-10 text-xl font-semibold text-gold">¿Cómo funciona?</h2>

      <div className="mt-6 space-y-4">
        <div className="card">
          <h3 className="font-semibold text-white">Ahorro Asegurado</h3>
          <p className="mt-2 text-sm text-white/80">
            Comprando un pack de 4 cortes o más, obtenés un 20% de descuento off en el total.
          </p>
        </div>
        <div className="card">
          <h3 className="font-semibold text-white">Flexibilidad Total</h3>
          <p className="mt-2 text-sm text-white/80">
            Los usás cuando querés. Podés reservar día a día desde la web o dejar tus turnos fijos
            coordinando directamente con recepción.
          </p>
        </div>
        <div className="card">
          <h3 className="font-semibold text-white">Premio a tu Fidelidad</h3>
          <p className="mt-2 text-sm text-white/80">
            Cada mes que renovás tu abono, obtenés un 15% de descuento en nuestra línea de productos
            premium.
          </p>
        </div>
      </div>

      <a
        href={abonosWaUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-primary mt-10 inline-flex"
      >
        Quiero más información
      </a>
    </div>
  );
}
