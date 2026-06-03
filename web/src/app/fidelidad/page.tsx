import Link from "next/link";
import {
  LOYALTY_MILESTONES,
  LOYALTY_REWARD_LABELS,
  LOYALTY_CYCLE_DAYS,
  LOYALTY_POINTS_PER_CUT,
  LOYALTY_POINTS_PER_PRODUCT,
  LOYALTY_BENEFIT_NOTE,
  formatPoints,
} from "@/lib/loyalty-logic";

export default function FidelidadPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-3xl font-bold text-gold">Programa de fidelidad</h1>

      <section className="mt-8 card">
        <h2 className="text-xl font-semibold text-gold">¿Cómo sumás puntos?</h2>

        <div className="mt-4 space-y-4 text-white/85">
          <p>
            <strong className="text-white">Cliente Regular:</strong> Cada corte individual suma{" "}
            {LOYALTY_POINTS_PER_CUT} puntos. Al llegar a 8, ¡tu próximo corte es gratis!
          </p>
          <p>
            <strong className="text-white">Cliente Comunidad Abono:</strong> Tu abono mensual ya cuenta
            con una tarifa preferencial exclusiva. Por eso, cada mes que renovás tu suscripción, te
            acreditamos 2 puntos de regalo en tu cuenta.
          </p>
          <p className="rounded-lg border border-gold/25 bg-gold/5 px-4 py-3 text-sm">
            <strong>Nota:</strong> Los puntos acumulados por renovación de abono son canjeables
            exclusivamente por nuestra línea de productos de barbería/peluquería (sujeto a stock
            disponible).
          </p>
        </div>

        <p className="mt-4 text-sm text-muted">
          1 corte = {formatPoints(LOYALTY_POINTS_PER_CUT)} · 1 producto ={" "}
          {formatPoints(LOYALTY_POINTS_PER_PRODUCT)} · Los puntos suman desde tu primer corte.
        </p>
      </section>

      <section className="mt-6 card">
        <h2 className="text-lg font-semibold text-gold">Premios del ciclo</h2>
        <ul className="mt-4 space-y-2">
          {LOYALTY_MILESTONES.map((m) => (
            <li key={m.at} className="flex gap-3 text-white/90">
              <span className="font-bold text-gold">{formatPoints(m.at)}</span>
              <span>{LOYALTY_REWARD_LABELS[m.reward]}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-muted">{LOYALTY_BENEFIT_NOTE}</p>
        <p className="mt-2 text-sm text-muted">
          Cada {LOYALTY_CYCLE_DAYS} días el ciclo se renueva: puntos y premios no usados se
          reinician.
        </p>
      </section>

      <ul className="mt-6 space-y-3 card text-sm text-white/85">
        <li className="flex gap-3">
          <span className="text-gold">1.</span> Reservá online normalmente
        </li>
        <li className="flex gap-3">
          <span className="text-gold">2.</span> Cuando te atienden, sumás puntos automáticamente
        </li>
        <li className="flex gap-3">
          <span className="text-gold">3.</span> Consultá tu progreso en{" "}
          <Link href="/mis-turnos" className="text-gold hover:underline">
            Mis turnos
          </Link>
        </li>
        <li className="flex gap-3">
          <span className="text-gold">4.</span> Avisá al barbero al pagar para canjear tu premio
        </li>
      </ul>

      <div className="mt-10 rounded-xl border border-gold/25 bg-gold/5 p-6 text-center">
        <p className="text-white/85">¿Querés asegurar tus cortes del mes con precio congelado?</p>
        <Link href="/abonos" className="btn-primary mt-4 inline-flex">
          Conocé el Club de Abonos
        </Link>
      </div>
    </div>
  );
}
