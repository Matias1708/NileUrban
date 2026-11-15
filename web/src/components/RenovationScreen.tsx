import { NEW_BOOKING_URL, SALON } from "@/lib/constants";

export function RenovationScreen() {
  const displayUrl = NEW_BOOKING_URL.replace(/^https?:\/\//, "").replace(/\/$/, "");

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center bg-black px-6 text-center">
      <div className="flex max-w-md flex-col items-center">
        <p className="text-[0.7rem] font-medium uppercase tracking-[0.35em] text-gold/90 sm:text-xs">
          Nile Urban
        </p>

        <h1 className="mt-8 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Nos renovamos
        </h1>

        <p className="mt-4 text-sm leading-relaxed text-white/55 sm:text-base">
          Mejoramos la experiencia para que reserves más fácil.
        </p>

        <a
          href={NEW_BOOKING_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-10 inline-flex min-h-12 w-full max-w-xs items-center justify-center border border-gold px-8 py-3 text-sm font-medium tracking-wide text-gold transition hover:bg-gold hover:text-black active:bg-gold active:text-black"
        >
          Reservá acá
        </a>

        <p className="mt-6 max-w-full break-all px-2 text-[0.7rem] text-white/30 sm:text-xs">
          {displayUrl}
        </p>
      </div>

      <p className="absolute bottom-6 text-[0.65rem] text-white/20">{SALON.name}</p>
    </div>
  );
}
