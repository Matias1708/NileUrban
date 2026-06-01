import Link from "next/link";
import type { BarberName } from "@/lib/constants";

const IMAGE_MAP: Record<BarberName, string> = {
  Pablo: "pablo.jpg",
  Nicolas: "nico (2).jpg",
  Lautaro: "lauti (2).jpg",
  Matias: "mati.jpg",
};

export function TeamCard({ name }: { name: BarberName }) {
  return (
    <article className="card group overflow-hidden p-0">
      <div className="aspect-[3/4] bg-surface overflow-hidden flex items-center justify-center">
        <img
          src={`/images/${IMAGE_MAP[name]}`}
          alt={`${name}, barbero`}
          className="h-full w-full object-cover transition group-hover:scale-105"
        />
      </div>
      <div className="p-4">
        <h3 className="text-xl font-semibold">{name}</h3>
        <p className="text-sm text-muted">Barbero</p>
        <Link
          href={`/reservar?profesional=${name}`}
          className="mt-3 inline-block text-sm font-medium text-gold hover:underline"
        >
          Reservar con {name} →
        </Link>
      </div>
    </article>
  );
}
