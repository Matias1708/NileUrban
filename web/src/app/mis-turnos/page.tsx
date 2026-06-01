"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { getBookingsByPhone, cancelBooking } from "@/lib/bookings";
import type { Booking } from "@/lib/types/booking";
import { getServicePrice, formatPriceARS } from "@/lib/scheduling/pricing";
import { loadPricingConfig } from "@/lib/pricing-store";
import type { ServiceName } from "@/lib/constants";
import type { PricingConfig } from "@/lib/types/pricing";
import { LoyaltyCard } from "@/components/LoyaltyCard";
import { normalizePhone } from "@/lib/phone";

function MisTurnosContent() {
  const searchParams = useSearchParams();
  const initialTel = searchParams.get("tel") ?? "";
  const [phone, setPhone] = useState(initialTel);
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [step, setStep] = useState<"phone" | "otp" | "bookings">(
    initialTel ? "bookings" : "phone"
  );
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [whatsappUrl, setWhatsappUrl] = useState("");
  const [pricing, setPricing] = useState<PricingConfig | null>(null);

  useEffect(() => {
    loadPricingConfig().then(setPricing).catch(() => setPricing(null));
  }, []);

  async function loadBookings(tel: string) {
    setLoading(true);
    setError("");
    try {
      const data = await getBookingsByPhone(tel);
      setBookings(data);
      setPhone(normalizePhone(tel) || tel);
      setStep("bookings");
    } catch {
      setError("No pudimos cargar tus turnos. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const tel = searchParams.get("tel");
    if (tel) {
      loadBookings(tel);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  async function sendOtp() {
    const normalized = normalizePhone(phone);
    if (normalized.length < 8) {
      setError("Ingresá un teléfono válido (sin 0 ni 15).");
      return;
    }

    setLoading(true);
    setError("");
    setDevCode(null);
    try {
      const res = await fetch("/api/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalized }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No pudimos enviar el código.");
        return;
      }
      setPhone(data.phone ?? normalized);
      setWhatsappUrl(data.whatsappUrl ?? "");
      if (data.code) setDevCode(String(data.code));
      setCode("");
      setStep("otp");
    } catch {
      setError("Error de conexión. Revisá tu internet e intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp() {
    const normalized = normalizePhone(phone);
    const trimmedCode = code.trim();

    if (trimmedCode.length !== 6) {
      setError("Ingresá el código de 6 dígitos.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/otp", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalized, code: trimmedCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Código incorrecto o expirado.");
        return;
      }
      await loadBookings(data.phone ?? normalized);
    } catch {
      setError("Error de conexión. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel(id: string) {
    if (!confirm("¿Cancelar este turno?")) return;
    await cancelBooking(id);
    await loadBookings(phone);
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <h1 className="text-3xl font-bold text-gold">Mis turnos</h1>
      <p className="mt-2 text-muted">Consultá, cancelá o reprogramá tus citas</p>

      {error && (
        <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {step === "phone" && (
        <div className="card mt-8 space-y-4">
          <label className="label" htmlFor="phone">Tu teléfono</label>
          <input
            id="phone"
            className="input"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="1164380904"
            inputMode="tel"
          />
          <button type="button" className="btn-primary w-full" onClick={sendOtp} disabled={loading}>
            {loading ? "Enviando..." : "Recibir código"}
          </button>
        </div>
      )}

      {step === "otp" && (
        <div className="card mt-8 space-y-4">
          <p className="text-sm text-white/80">
            Abrí WhatsApp para ver tu código de verificación.{" "}
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gold hover:underline"
              >
                Abrir WhatsApp
              </a>
            )}
          </p>

          {devCode && (
            <p className="rounded-lg border border-gold/30 bg-gold/10 px-3 py-2 text-center text-sm text-gold">
              Código de prueba (solo desarrollo): <strong className="text-lg tracking-widest">{devCode}</strong>
            </p>
          )}

          <label className="label" htmlFor="otp-code">Código de 6 dígitos</label>
          <input
            id="otp-code"
            className="input text-center text-2xl tracking-widest"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="123456"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
          />
          <button type="button" className="btn-primary w-full" onClick={verifyOtp} disabled={loading}>
            {loading ? "Verificando..." : "Verificar"}
          </button>
          <button
            type="button"
            className="w-full text-sm text-muted hover:text-white"
            onClick={() => {
              setStep("phone");
              setCode("");
              setError("");
              setDevCode(null);
            }}
          >
            ← Cambiar teléfono
          </button>
        </div>
      )}

      {step === "bookings" && (
        <div className="mt-8 space-y-4">
          <LoyaltyCard phone={phone} />
          {loading && <p className="text-muted">Cargando...</p>}
          {!loading && bookings.length === 0 && (
            <p className="card text-center text-muted">No tenés turnos próximos.</p>
          )}
          {bookings.map((b) => (
            <article key={b.id} className="card">
              <div className="flex justify-between">
                <h3 className="text-lg font-semibold text-gold">
                  {b.fecha} — {b.hora} hs
                </h3>
              </div>
              <p className="mt-2 text-sm">
                {b.profesional} · {b.servicio}
              </p>
              <p className="text-sm text-muted">
                {formatPriceARS(getServicePrice(b.servicio as ServiceName, b.fecha, pricing))}
              </p>
              <div className="mt-4 flex gap-3">
                <Link
                  href={`/reservar?profesional=${b.profesional}`}
                  className="btn-secondary text-sm !py-2"
                >
                  Reprogramar
                </Link>
                {b.id && (
                  <button
                    type="button"
                    className="text-sm text-red-400 hover:underline"
                    onClick={() => handleCancel(b.id!)}
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </article>
          ))}
          <Link href="/reservar" className="btn-primary mt-4 inline-flex">
            Nueva reserva
          </Link>
        </div>
      )}
    </div>
  );
}

export default function MisTurnosPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center">Cargando...</div>}>
      <MisTurnosContent />
    </Suspense>
  );
}
