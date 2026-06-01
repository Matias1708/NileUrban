"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { collection, getDocs, addDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { getAllBookings } from "@/lib/bookings";
import { getPriceFromServiceString } from "@/lib/scheduling/pricing";
import { loadPricingConfig } from "@/lib/pricing-store";
import { useStaffAuth } from "@/components/staff/StaffAuthProvider";
import type { Booking, Expense, Subscription } from "@/lib/types/booking";
import type { PricingConfig } from "@/lib/types/pricing";
import { BARBERS, SERVICES } from "@/lib/constants";
import {
  MONTH_NAMES,
  EXPENSE_CATEGORIES,
  filterBookingsForFinance,
  filterExpensesForFinance,
  filterAbonosForFinance,
  computeBarberStats,
  sortBookingsByDate,
  formatMoney,
  isoToDMY,
  type FinanceFilters,
  type FinanceRange,
} from "@/lib/finance-utils";

function bookingPrice(b: Booking, pricing: PricingConfig | null): number {
  return getPriceFromServiceString(b.servicio, b.fecha, pricing);
}

export function StaffFinanzasClient() {
  const { staff } = useStaffAuth();
  const isAdmin = staff?.role === "admin";
  const staffBarber = staff?.role === "barber" ? staff.barberName ?? staff.name : null;

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [abonos, setAbonos] = useState<Subscription[]>([]);
  const [pricing, setPricing] = useState<PricingConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const [range, setRange] = useState<FinanceRange>("month");
  const [month, setMonth] = useState<number | "all">(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [barberFilter, setBarberFilter] = useState("all");
  const [clientSearch, setClientSearch] = useState("");

  const filters: FinanceFilters = useMemo(
    () => ({ range, month, year, barber: barberFilter, clientSearch }),
    [range, month, year, barberFilter, clientSearch]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [b, e, a, p] = await Promise.all([
        getAllBookings(),
        getDocs(collection(db, "Gastos")),
        getDocs(collection(db, "Abonos")),
        loadPricingConfig(),
      ]);
      setBookings(b);
      setExpenses(e.docs.map((d) => ({ id: d.id, ...d.data() } as Expense)));
      setAbonos(a.docs.map((d) => ({ id: d.id, ...d.data() } as Subscription)));
      setPricing(p);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredBookings = useMemo(
    () => filterBookingsForFinance(bookings, filters, staffBarber),
    [bookings, filters, staffBarber]
  );

  const filteredExpenses = useMemo(
    () => (isAdmin ? filterExpensesForFinance(expenses, filters) : []),
    [expenses, filters, isAdmin]
  );

  const filteredAbonos = useMemo(
    () => (isAdmin ? filterAbonosForFinance(abonos, filters) : []),
    [abonos, filters, isAdmin]
  );

  const reservationsIncome = filteredBookings
    .filter((b) => !b.incluidoEnAbono)
    .reduce((sum, b) => sum + bookingPrice(b, pricing), 0);

  const abonosIncome = filteredAbonos.reduce((sum, a) => sum + Number(a.amount || 0), 0);
  const totalIncome = reservationsIncome + abonosIncome;
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const balance = totalIncome - totalExpenses;

  const barberStats = useMemo(
    () => computeBarberStats(filteredBookings, (b) => bookingPrice(b, pricing)),
    [filteredBookings, pricing]
  );

  const sortedServices = useMemo(() => sortBookingsByDate(filteredBookings), [filteredBookings]);

  async function addManualReservation(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const isoDate = String(fd.get("date"));
    const professional =
      staffBarber ?? String(fd.get("profesional"));

    await addDoc(collection(db, "Reserva"), {
      nombre: fd.get("client"),
      servicio: fd.get("service"),
      fecha: isoToDMY(isoDate),
      hora: "00:00",
      profesional: professional,
      contacto: "",
      incluidoEnAbono: fd.get("incluidoEnAbono") === "on",
    });
    (e.target as HTMLFormElement).reset();
    await load();
    alert("Turno registrado correctamente");
  }

  async function addAbono(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await addDoc(collection(db, "Abonos"), {
      client: fd.get("client"),
      amount: Number(fd.get("amount")),
      month: Number(fd.get("month")),
      year: Number(fd.get("year")),
      paymentDate: fd.get("paymentDate"),
      timestamp: new Date().toISOString(),
    });
    (e.target as HTMLFormElement).reset();
    await load();
    alert("Abono registrado correctamente");
  }

  async function addExpense(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await addDoc(collection(db, "Gastos"), {
      description: fd.get("description"),
      amount: Number(fd.get("amount")),
      category: fd.get("category"),
      date: fd.get("date"),
      timestamp: new Date().toISOString(),
    });
    (e.target as HTMLFormElement).reset();
    await load();
    alert("Gasto agregado correctamente");
  }

  async function removeExpense(id: string) {
    if (!confirm("¿Eliminar este gasto?")) return;
    await deleteDoc(doc(db, "Gastos", id));
    await load();
  }

  async function removeAbono(id: string) {
    if (!confirm("¿Eliminar este abono?")) return;
    await deleteDoc(doc(db, "Abonos", id));
    await load();
  }

  if (staff?.role !== "admin" && staff?.role !== "barber") {
    return <p className="text-muted">Sin acceso.</p>;
  }

  const todayIso = new Date().toISOString().slice(0, 10);
  const years = Array.from({ length: new Date().getFullYear() - 2023 }, (_, i) => 2024 + i).reverse();

  return (
    <div className="finance-panel">
      <div className="finance-header">
        <h1 className="text-2xl font-bold text-gold">Panel de Finanzas</h1>
        <div className="finance-filters">
          <input
            type="text"
            className="input finance-filter-input"
            placeholder="Buscar cliente..."
            value={clientSearch}
            onChange={(e) => setClientSearch(e.target.value)}
          />
          <select
            className="input finance-filter-input"
            value={range}
            onChange={(e) => setRange(e.target.value as FinanceRange)}
          >
            <option value="month">Ver por mes</option>
            <option value="today">Hoy</option>
            <option value="3days">Últimos 3 días</option>
            <option value="week">Esta semana</option>
          </select>
          {isAdmin && (
            <select
              className="input finance-filter-input"
              value={barberFilter}
              onChange={(e) => setBarberFilter(e.target.value)}
            >
              <option value="all">Todos los barberos</option>
              {BARBERS.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          )}
          {range === "month" && (
            <>
              <select
                className="input finance-filter-input"
                value={month === "all" ? "all" : String(month)}
                onChange={(e) =>
                  setMonth(e.target.value === "all" ? "all" : Number(e.target.value))
                }
              >
                <option value="all">Todos los meses</option>
                {MONTH_NAMES.map((name, i) => (
                  <option key={name} value={i}>{name}</option>
                ))}
              </select>
              <select
                className="input finance-filter-input"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              >
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </>
          )}
        </div>
      </div>

      {loading && (
        <p className="py-8 text-center text-muted">Cargando datos...</p>
      )}

      {!loading && (
        <>
          <div className="finance-cards">
            <div className="finance-card finance-card-income">
              <h3>Ingresos totales</h3>
              <p className="finance-amount">{formatMoney(totalIncome)}</p>
              <p className="finance-card-sub">Reservas + abonos</p>
            </div>
            {isAdmin && (
              <>
                <div className="finance-card finance-card-expense">
                  <h3>Gastos totales</h3>
                  <p className="finance-amount">{formatMoney(totalExpenses)}</p>
                  <p className="finance-card-sub">Gastos registrados</p>
                </div>
                <div className="finance-card finance-card-balance">
                  <h3>Balance neto</h3>
                  <p
                    className="finance-amount"
                    style={{ color: balance >= 0 ? "#4caf50" : "#f44336" }}
                  >
                    {formatMoney(balance)}
                  </p>
                  <p className="finance-card-sub">Ingresos − gastos</p>
                </div>
              </>
            )}
          </div>

          <section className="finance-section">
            <h2 className="finance-section-title">Registrar turno manual</h2>
            <form onSubmit={addManualReservation} className="finance-form-grid">
              <div>
                <label className="label">Cliente</label>
                <input name="client" className="input" required placeholder="Nombre del cliente" />
              </div>
              <div>
                <label className="label">Servicio</label>
                <select name="service" className="input" defaultValue="Corte">
                  {SERVICES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Fecha</label>
                <input name="date" type="date" className="input" required defaultValue={todayIso} />
              </div>
              {isAdmin ? (
                <div>
                  <label className="label">Profesional</label>
                  <select name="profesional" className="input" defaultValue={BARBERS[0]}>
                    {BARBERS.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="label">Profesional</label>
                  <input className="input" readOnly value={staffBarber ?? ""} />
                </div>
              )}
              <label className="flex items-center gap-2 self-end pb-3 text-sm">
                <input type="checkbox" name="incluidoEnAbono" />
                Incluido en abono
              </label>
              <div className="flex items-end">
                <button type="submit" className="btn-primary w-full">Registrar turno</button>
              </div>
            </form>
          </section>

          {isAdmin && (
            <section className="finance-split">
              <div className="finance-section">
                <h2 className="finance-section-title">Registrar abono mensual</h2>
                <form onSubmit={addAbono} className="space-y-3">
                  <div>
                    <label className="label">Cliente</label>
                    <input name="client" className="input" required placeholder="Nombre del cliente" />
                  </div>
                  <div>
                    <label className="label">Monto ($)</label>
                    <input name="amount" type="number" className="input" required min={0} step="0.01" />
                  </div>
                  <div>
                    <label className="label">Mes</label>
                    <select name="month" className="input" defaultValue={new Date().getMonth()}>
                      {MONTH_NAMES.map((name, i) => (
                        <option key={name} value={i}>{name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Año</label>
                    <input
                      name="year"
                      type="number"
                      className="input"
                      required
                      min={2024}
                      defaultValue={new Date().getFullYear()}
                    />
                  </div>
                  <div>
                    <label className="label">Fecha de pago</label>
                    <input name="paymentDate" type="date" className="input" required defaultValue={todayIso} />
                  </div>
                  <button type="submit" className="btn-primary w-full">Registrar abono</button>
                </form>
              </div>

              <div className="finance-section">
                <h2 className="finance-section-title">Abonos registrados</h2>
                <div className="finance-table-wrap">
                  <table className="finance-table">
                    <thead>
                      <tr>
                        <th>Cliente</th>
                        <th>Mes/Año</th>
                        <th>Monto</th>
                        <th>Fecha pago</th>
                        <th>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAbonos.length === 0 && (
                        <tr>
                          <td colSpan={5} className="finance-empty">No hay abonos registrados</td>
                        </tr>
                      )}
                      {filteredAbonos.map((a) => (
                        <tr key={a.id}>
                          <td>{a.client}</td>
                          <td>{MONTH_NAMES[a.month] ?? "?"} {a.year}</td>
                          <td className="text-green-400">{formatMoney(Number(a.amount))}</td>
                          <td>{a.paymentDate ?? "—"}</td>
                          <td>
                            {a.id && (
                              <button
                                type="button"
                                className="finance-btn-danger"
                                onClick={() => removeAbono(a.id!)}
                              >
                                Eliminar
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          <section className="finance-section">
            <h2 className="finance-section-title">Desglose por barbero</h2>
            <div className="finance-table-wrap">
              <table className="finance-table">
                <thead>
                  <tr>
                    <th>Barbero</th>
                    <th>Cantidad de cortes</th>
                    <th>Total generado</th>
                  </tr>
                </thead>
                <tbody>
                  {barberStats.length === 0 && (
                    <tr>
                      <td colSpan={3} className="finance-empty">No hay datos para este período</td>
                    </tr>
                  )}
                  {barberStats.map((s) => (
                    <tr key={s.name}>
                      <td>{s.name}</td>
                      <td>{s.count}</td>
                      <td className="font-semibold text-green-400">{formatMoney(s.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="finance-section">
            <h2 className="finance-section-title">Detalle de servicios</h2>
            <div className="finance-table-wrap finance-table-scroll">
              <table className="finance-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Hora</th>
                    <th>Barbero</th>
                    <th>Cliente</th>
                    <th>Servicio</th>
                    <th>Precio</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedServices.length === 0 && (
                    <tr>
                      <td colSpan={6} className="finance-empty">No hay servicios registrados</td>
                    </tr>
                  )}
                  {sortedServices.map((b) => (
                    <tr key={b.id ?? `${b.fecha}-${b.hora}-${b.nombre}`}>
                      <td>{b.fecha}</td>
                      <td>{b.hora}</td>
                      <td>{b.profesional}</td>
                      <td>{b.nombre}</td>
                      <td>{b.servicio}</td>
                      <td className="text-green-400">{formatMoney(bookingPrice(b, pricing))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {isAdmin && (
            <section className="finance-split">
              <div className="finance-section">
                <h2 className="finance-section-title">Registrar nuevo gasto</h2>
                <form onSubmit={addExpense} className="space-y-3">
                  <div>
                    <label className="label">Descripción</label>
                    <input name="description" className="input" required placeholder="Ej. Compra de insumos" />
                  </div>
                  <div>
                    <label className="label">Monto ($)</label>
                    <input name="amount" type="number" className="input" required min={0} step="0.01" />
                  </div>
                  <div>
                    <label className="label">Categoría</label>
                    <select name="category" className="input" defaultValue={EXPENSE_CATEGORIES[0]}>
                      {EXPENSE_CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Fecha</label>
                    <input name="date" type="date" className="input" required defaultValue={todayIso} />
                  </div>
                  <button type="submit" className="btn-primary w-full">Agregar gasto</button>
                </form>
              </div>

              <div className="finance-section">
                <h2 className="finance-section-title">Últimos gastos</h2>
                <div className="finance-table-wrap">
                  <table className="finance-table">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Descripción</th>
                        <th>Categoría</th>
                        <th>Monto</th>
                        <th>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredExpenses.length === 0 && (
                        <tr>
                          <td colSpan={5} className="finance-empty">No hay gastos en este período</td>
                        </tr>
                      )}
                      {filteredExpenses.map((e) => (
                        <tr key={e.id}>
                          <td>{e.date}</td>
                          <td>{e.description}</td>
                          <td>
                            <span className="finance-tag">{e.category}</span>
                          </td>
                          <td className="text-red-400">{formatMoney(Number(e.amount))}</td>
                          <td>
                            {e.id && (
                              <button
                                type="button"
                                className="finance-btn-danger"
                                onClick={() => removeExpense(e.id!)}
                              >
                                Eliminar
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
