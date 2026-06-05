"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BARBERS, type BarberName } from "@/lib/constants";
import { ALL_SLOT_OPTIONS, WEEKDAY_LABELS } from "@/lib/types/schedule";
import type { FixedSlot } from "@/lib/types/booking";
import {
  loadAllFixedSlots,
  saveFixedSlot,
  deactivateFixedSlot,
} from "@/lib/fixed-slots";

const WORK_DAYS = [1, 2, 3, 4, 5, 6] as const;
const SERVICES = ["Corte", "Corte + Barba", "Barba"] as const;

const emptyForm = (): FixedSlot => ({
  nombre: "",
  contacto: "",
  profesional: "Matias",
  weekday: 2,
  hora: "10:00",
  servicio: "Corte",
  activo: true,
  notas: "",
});

export function StaffTurnosFijosClient() {
  const [slots, setSlots] = useState<FixedSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FixedSlot>(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setSlots(await loadAllFixedSlots(true));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function startCreate() {
    setForm(emptyForm());
    setEditingId(null);
    setShowForm(true);
  }

  function startEdit(slot: FixedSlot) {
    setForm({ ...slot });
    setEditingId(slot.id ?? null);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await saveFixedSlot({ ...form, id: editingId ?? undefined });
      setShowForm(false);
      setForm(emptyForm());
      setEditingId(null);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(id: string, nombre: string) {
    if (!confirm(`¿Desactivar el turno fijo de ${nombre}?`)) return;
    await deactivateFixedSlot(id);
    await load();
  }

  const active = slots.filter((s) => s.activo !== false);
  const inactive = slots.filter((s) => s.activo === false);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gold">Turnos fijos</h1>
          <p className="mt-1 text-sm text-muted">
            Clientes con el mismo día y hora cada semana. Aparecen en la agenda y bloquean reservas online.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/staff"
            className="rounded-lg border-2 border-[#555] bg-[#333] px-4 py-2 text-sm font-bold uppercase tracking-wide text-white no-underline transition hover:bg-[#555]"
          >
            ← Agenda
          </Link>
          <button type="button" className="btn-primary text-sm" onClick={startCreate}>
            + Nuevo turno fijo
          </button>
        </div>
      </div>

      {showForm ? (
        <form onSubmit={handleSubmit} className="card mb-8 space-y-4">
          <h2 className="text-lg font-semibold text-gold">
            {editingId ? "Editar turno fijo" : "Nuevo turno fijo"}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-muted">Cliente</label>
              <input
                className="input"
                required
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted">Teléfono</label>
              <input
                className="input"
                type="tel"
                required
                value={form.contacto}
                onChange={(e) => setForm({ ...form, contacto: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted">Barbero</label>
              <select
                className="input"
                value={form.profesional}
                onChange={(e) => setForm({ ...form, profesional: e.target.value as BarberName })}
              >
                {BARBERS.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted">Día de la semana</label>
              <select
                className="input"
                value={form.weekday}
                onChange={(e) => setForm({ ...form, weekday: Number(e.target.value) })}
              >
                {WORK_DAYS.map((d) => (
                  <option key={d} value={d}>{WEEKDAY_LABELS[d]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted">Hora</label>
              <select
                className="input"
                value={form.hora}
                onChange={(e) => setForm({ ...form, hora: e.target.value })}
              >
                {ALL_SLOT_OPTIONS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted">Servicio</label>
              <select
                className="input"
                value={form.servicio}
                onChange={(e) => setForm({ ...form, servicio: e.target.value })}
              >
                {SERVICES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted">Notas (opcional)</label>
            <input
              className="input"
              value={form.notas ?? ""}
              onChange={(e) => setForm({ ...form, notas: e.target.value })}
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Guardando..." : "Guardar"}
            </button>
            <button
              type="button"
              className="rounded-lg border border-white/20 px-4 py-2 text-sm text-white/80"
              onClick={() => setShowForm(false)}
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : null}

      {loading ? (
        <p className="text-muted">Cargando...</p>
      ) : active.length === 0 ? (
        <div className="card text-center text-muted">
          <p>No hay turnos fijos cargados.</p>
          <p className="mt-2 text-sm">Agregá los clientes que vienen siempre el mismo día y hora.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-white/10 bg-black/30 text-muted">
              <tr>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Teléfono</th>
                <th className="px-4 py-3">Barbero</th>
                <th className="px-4 py-3">Día</th>
                <th className="px-4 py-3">Hora</th>
                <th className="px-4 py-3">Servicio</th>
                <th className="px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {active.map((slot) => (
                <tr key={slot.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="px-4 py-3 font-medium text-white">{slot.nombre}</td>
                  <td className="px-4 py-3 text-green-400">{slot.contacto}</td>
                  <td className="px-4 py-3">{slot.profesional}</td>
                  <td className="px-4 py-3">{WEEKDAY_LABELS[slot.weekday]}</td>
                  <td className="px-4 py-3">{slot.hora}</td>
                  <td className="px-4 py-3">{slot.servicio}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="text-gold hover:underline"
                        onClick={() => startEdit(slot)}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="text-red-400 hover:underline"
                        onClick={() => slot.id && handleDeactivate(slot.id, slot.nombre)}
                      >
                        Desactivar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {inactive.length > 0 ? (
        <div className="mt-8">
          <h2 className="mb-3 text-sm font-semibold text-muted">Desactivados</h2>
          <ul className="space-y-1 text-sm text-white/50">
            {inactive.map((s) => (
              <li key={s.id}>
                {s.nombre} — {WEEKDAY_LABELS[s.weekday]} {s.hora} con {s.profesional}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
