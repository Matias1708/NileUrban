"use client";

import dynamic from "next/dynamic";

const BookingForm = dynamic(
  () => import("@/components/BookingForm").then((m) => m.BookingForm),
  {
    ssr: false,
    loading: () => (
      <div className="card w-full animate-pulse space-y-4">
        <div className="h-8 w-40 rounded bg-white/10" />
        <div className="h-12 rounded bg-white/10" />
        <div className="h-12 rounded bg-white/10" />
        <div className="h-12 rounded bg-white/10" />
        <div className="h-12 rounded bg-white/10" />
        <div className="h-12 rounded bg-gold/20" />
      </div>
    ),
  }
);

export function ReservarClient() {
  return <BookingForm />;
}
