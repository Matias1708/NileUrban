import Link from "next/link";
import { BARBERS, SALON } from "@/lib/constants";
import { Testimonials } from "@/components/Testimonials";
import { TeamCard } from "@/components/TeamCard";
import { ServicesPricingSection } from "@/components/ServicesPricingSection";

export default function HomePage() {
  return (
    <>
      <section className="relative flex min-h-[85vh] items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-40"
          style={{ backgroundImage: "url(/images/newequipo.jpg)" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-background" />
        <div className="relative z-10 mx-auto max-w-3xl px-4 text-center">
          <p className="mb-4 text-sm uppercase tracking-[0.3em] text-gold">Ramos Mejía</p>
          <h1 className="text-4xl font-bold leading-tight md:text-6xl">
            Estilo masculino,<br />
            <span className="text-gold">experiencia premium</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-white/80">
            Cortes precisos, barba y detalle. Reservá online en menos de un minuto con tu barbero favorito.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link href="/reservar" className="btn-primary text-lg">
              Reservar turno
            </Link>
            <Link href="/mis-turnos" className="btn-secondary text-lg">
              Ver mis turnos
            </Link>
          </div>
        </div>
      </section>

      <section id="nosotros" className="py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-3xl font-bold text-gold">Nosotros</h2>
          <p className="mt-4 max-w-2xl text-lg text-white/80">
            Somos un equipo de barberos enfocados en el estilo masculino: cortes precisos, barba y detalle.
            Cada turno es personal — te escuchamos y buscamos el resultado que mejor encaje con vos.
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {BARBERS.map((name) => (
              <TeamCard key={name} name={name} />
            ))}
          </div>
        </div>
      </section>

      <ServicesPricingSection />

      <Testimonials />

      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4 text-center">
          <h2 className="text-2xl font-bold">¿Listo para tu próximo corte?</h2>
          <Link href="/reservar" className="btn-primary mt-6 inline-flex">
            Reservar ahora
          </Link>
          <p className="mt-4 text-sm text-muted">{SALON.address}</p>
        </div>
      </section>
    </>
  );
}
