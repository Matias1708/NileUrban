import { ReservarClient } from "./ReservarClient";

export const metadata = {
  title: "Reservar turno",
};

export default function ReservarPage() {
  return (
    <section className="reservar-page-bg min-h-[calc(100dvh-72px)] px-4 py-6 sm:py-10">
      <div className="mx-auto w-full max-w-lg">
        <ReservarClient />
      </div>
    </section>
  );
}
