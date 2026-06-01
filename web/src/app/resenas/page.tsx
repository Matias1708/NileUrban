"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { submitReview } from "@/lib/bookings";

function ReviewForm() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("booking") ?? "";
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!bookingId) return alert("Link inválido");
    await submitReview({ bookingId, rating, comment });
    setSent(true);
  }

  if (sent) {
    return (
      <div className="card text-center">
        <h2 className="text-xl font-bold text-gold">¡Gracias por tu reseña!</h2>
        <p className="mt-2 text-muted">Tu opinión nos ayuda a mejorar.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      <div>
        <label className="label">Calificación</label>
        <div className="flex gap-2 text-2xl">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              className={n <= rating ? "text-gold" : "text-muted"}
              onClick={() => setRating(n)}
            >
              ★
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="label" htmlFor="comment">Comentario</label>
        <textarea id="comment" className="input min-h-[120px]" required value={comment} onChange={(e) => setComment(e.target.value)} />
      </div>
      <button type="submit" className="btn-primary w-full">Enviar reseña</button>
    </form>
  );
}

export default function ResenasPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <h1 className="text-3xl font-bold text-gold">Tu opinión</h1>
      <p className="mt-2 text-muted">¿Cómo fue tu experiencia en Nile?</p>
      <Suspense fallback={<p className="mt-8">Cargando...</p>}>
        <div className="mt-8">
          <ReviewForm />
        </div>
      </Suspense>
    </div>
  );
}
