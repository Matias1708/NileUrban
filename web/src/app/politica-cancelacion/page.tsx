export default function PoliticaCancelacionPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 prose prose-invert">
      <h1 className="text-3xl font-bold text-gold">Política de cancelación</h1>
      <div className="mt-8 space-y-6 text-white/85">
        <section>
          <h2 className="text-xl font-semibold text-white">Cancelaciones</h2>
          <p>
            Pedimos avisar con al menos <strong>2 horas de anticipación</strong> si necesitás cancelar o reprogramar tu turno.
            Podés hacerlo desde la sección{" "}
            <a href="/mis-turnos" className="text-gold hover:underline">Mis turnos</a> o por WhatsApp.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-white">No-show</h2>
          <p>
            Si no te presentás sin aviso, el turno puede considerarse consumido. En caso de reincidencia,
            podemos limitar futuras reservas online.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-white">Tolerancia</h2>
          <p>
            Te pedimos llegar 5 minutos antes. La tolerancia es de 10 minutos; después de ese tiempo
            el turno puede reprogramarse según disponibilidad del profesional.
          </p>
        </section>
      </div>
    </div>
  );
}
