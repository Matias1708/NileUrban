"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SERVICES, type ServiceName } from "@/lib/constants";
import { useStaffAuth } from "@/components/staff/StaffAuthProvider";
import { loadPricingConfig, savePricingConfig, seedDefaultPricingIfMissing } from "@/lib/pricing-store";
import { formatPriceARS, getServicePrice } from "@/lib/scheduling/pricing";
import type { PricingConfig } from "@/lib/types/pricing";
import { PRICING_WEEKDAYS, validatePricingConfig } from "@/lib/types/pricing";
import { WEEKDAY_LABELS } from "@/lib/types/schedule";

function formatPriceInput(value: number): string {
  return value.toLocaleString("es-AR");
}

function parsePriceInput(raw: string): number {
  const n = parseInt(raw.replace(/\D/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
}

function PriceInput({
  id,
  value,
  onChange,
  className = "",
}: {
  id: string;
  value: number;
  onChange: (value: number) => void;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center rounded-lg border border-white/15 bg-[var(--surface)] focus-within:border-[var(--gold)] ${className}`}
    >
      <span className="shrink-0 select-none pl-4 text-muted">$</span>
      <input
        id={id}
        className="min-w-0 flex-1 bg-transparent py-3 pr-4 pl-2 text-white outline-none"
        inputMode="numeric"
        value={formatPriceInput(value)}
        onChange={(e) => onChange(parsePriceInput(e.target.value))}
      />
    </div>
  );
}

export function StaffPreciosClient() {
  const { staff } = useStaffAuth();
  const router = useRouter();
  const [config, setConfig] = useState<PricingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const isAdmin = staff?.role === "admin";

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      await seedDefaultPricingIfMissing();
      setConfig(await loadPricingConfig(true));
    } catch {
      setError("No se pudieron cargar los precios.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (staff && !isAdmin) {
      router.replace("/staff");
      return;
    }
    if (isAdmin) load();
  }, [staff, isAdmin, load, router]);

  function setBasePrice(service: ServiceName, value: number) {
    if (!config) return;
    setConfig({
      ...config,
      basePrices: { ...config.basePrices, [service]: value },
    });
  }

  function toggleDiscountDay(day: number) {
    if (!config) return;
    const days = config.weekdayDiscountDays.includes(day)
      ? config.weekdayDiscountDays.filter((d) => d !== day)
      : [...config.weekdayDiscountDays, day].sort();
    setConfig({ ...config, weekdayDiscountDays: days });
  }

  async function handleSave() {
    if (!config) return;
    const err = validatePricingConfig(config);
    if (err) {
      setError(err);
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await savePricingConfig(config);
      setMessage("Precios guardados. Se actualizan en la web y reservas al instante.");
    } catch {
      setError("Error al guardar. Verificá permisos de Firestore.");
    } finally {
      setSaving(false);
    }
  }

  if (!isAdmin) return null;
  if (loading) return <p className="text-muted">Cargando precios...</p>;
  if (!config) return <p className="text-red-400">{error || "Sin datos."}</p>;

  const previewDays = [1, 2, 3, 4, 5, 6] as const;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gold">Precios y servicios</h1>
        <p className="mt-2 text-sm text-muted">
          Configurá los precios base y descuentos por día. Los clientes ven los valores actualizados al reservar.
        </p>
      </div>

      {message && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300">
          {message}
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="card space-y-5">
        <h2 className="font-semibold text-gold">Precios base (jueves a sábado)</h2>
        <p className="text-xs text-muted">Estos son los precios sin descuento. El descuento semanal se aplica aparte.</p>
        <div className="grid gap-4 sm:grid-cols-3">
          {SERVICES.map((service) => (
            <div key={service}>
              <label className="label" htmlFor={`price-${service}`}>{service}</label>
              <PriceInput
                id={`price-${service}`}
                value={config.basePrices[service]}
                onChange={(value) => setBasePrice(service, value)}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="card space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold text-gold">Descuento por día</h2>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={config.weekdayDiscountEnabled}
              onChange={(e) => setConfig({ ...config, weekdayDiscountEnabled: e.target.checked })}
            />
            Activo
          </label>
        </div>

        {config.weekdayDiscountEnabled && (
          <>
            <div>
              <p className="label mb-2">Días con descuento</p>
              <div className="flex flex-wrap gap-3">
                {PRICING_WEEKDAYS.map((day) => (
                  <label key={day} className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={config.weekdayDiscountDays.includes(day)}
                      onChange={() => toggleDiscountDay(day)}
                    />
                    {WEEKDAY_LABELS[day]}
                  </label>
                ))}
              </div>
            </div>
            <div className="max-w-xs">
              <label className="label" htmlFor="discount-amount">Monto del descuento</label>
              <PriceInput
                id="discount-amount"
                value={config.weekdayDiscountAmount}
                onChange={(value) => setConfig({ ...config, weekdayDiscountAmount: value })}
              />
            </div>
          </>
        )}
      </div>

      <div className="card space-y-4">
        <h2 className="font-semibold text-gold">Vista previa</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-muted">
                <th className="py-2 pr-4">Día</th>
                {SERVICES.map((s) => (
                  <th key={s} className="py-2 pr-4">{s}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewDays.map((day) => (
                <tr key={day} className="border-b border-white/5">
                  <td className="py-2 pr-4">{WEEKDAY_LABELS[day]}</td>
                  {SERVICES.map((service) => {
                    const fakeDate = `${String(day).padStart(2, "0")}/06/2026`;
                    return (
                      <td key={service} className="py-2 pr-4 text-gold">
                        {formatPriceARS(getServicePrice(service, fakeDate, config))}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <button type="button" className="btn-primary w-full sm:w-auto" disabled={saving} onClick={handleSave}>
        {saving ? "Guardando..." : "Guardar precios"}
      </button>
    </div>
  );
}
