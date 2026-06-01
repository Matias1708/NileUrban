import Link from "next/link";
import { LOYALTY_MILESTONES, LOYALTY_REWARD_LABELS, LOYALTY_CYCLE_DAYS } from "@/lib/loyalty-logic";

export default function FidelidadPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-3xl font-bold text-gold">Programa de fidelidad</h1>
      <p className="mt-4 text-lg text-white/85">
        Cada visita <strong>atendida</strong> suma 1 punto. Los premios se desbloquean en el camino
        hacia los 10 puntos. Cada <strong>{LOYALTY_CYCLE_DAYS} días</strong> el ciclo se renueva: los
        puntos y premios no usados se reinician.
      </p>
      <ul className="mt-6 space-y-3 card">
        {LOYALTY_MILESTONES.map((m) => (
          <li key={m.at} className="flex gap-3 text-white/90">
            <span className="font-bold text-gold">{m.at} pts</span>
            <span>{LOYALTY_REWARD_LABELS[m.reward]}</span>
          </li>
        ))}
      </ul>
      <ul className="mt-8 space-y-4 card">
        <li className="flex gap-3">
          <span className="text-gold">1.</span> Reservá online normalmente
        </li>
        <li className="flex gap-3">
          <span className="text-gold">2.</span> Cuando te atienden en el salón, sumás el punto
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
    </div>
  );
}
