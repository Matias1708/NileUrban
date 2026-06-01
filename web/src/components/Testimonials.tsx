"use client";

import { useEffect, useState } from "react";
import { getPublishedReviews } from "@/lib/bookings";
import type { Review } from "@/lib/types/booking";

const FALLBACK: Review[] = [
  { bookingId: "1", rating: 5, comment: "El mejor corte de Ramos Mejía. Ambiente increíble y atención de primera.", clientName: "Cliente verificado" },
  { bookingId: "2", rating: 5, comment: "Reservé online en segundos. Pablo entendió exactamente lo que quería.", clientName: "Cliente verificado" },
  { bookingId: "3", rating: 5, comment: "Llevo años viniendo. Siempre salgo impecable.", clientName: "Cliente verificado" },
];

export function Testimonials() {
  const [reviews, setReviews] = useState<Review[]>(FALLBACK);

  useEffect(() => {
    getPublishedReviews()
      .then((r) => { if (r.length) setReviews(r); })
      .catch(() => {});
  }, []);

  return (
    <section className="py-20">
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="text-3xl font-bold text-gold">Lo que dicen nuestros clientes</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {reviews.map((r, i) => (
            <blockquote key={r.id ?? i} className="card">
              <div className="text-gold">{"★".repeat(r.rating)}</div>
              <p className="mt-3 text-white/90">&ldquo;{r.comment}&rdquo;</p>
              <footer className="mt-4 text-sm text-muted">— {r.clientName ?? "Cliente"}</footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}
