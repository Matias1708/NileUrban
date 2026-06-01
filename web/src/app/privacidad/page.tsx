export default function PrivacidadPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-bold text-gold">Política de privacidad</h1>
      <div className="mt-8 space-y-6 text-white/85">
        <p>
          Nile Urban Lounge respeta tu privacidad. Esta política describe cómo tratamos tus datos al usar nuestro sitio y sistema de reservas.
        </p>
        <section>
          <h2 className="text-xl font-semibold text-white">Datos que recopilamos</h2>
          <ul className="mt-2 list-disc pl-6 space-y-1">
            <li>Nombre y teléfono para gestionar tu turno</li>
            <li>Email (opcional) para confirmaciones</li>
            <li>Datos de uso anónimos vía Firebase Analytics</li>
          </ul>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-white">Uso de los datos</h2>
          <p>
            Usamos tus datos únicamente para confirmar turnos, enviar recordatorios, gestionar cancelaciones
            y mejorar nuestro servicio. No vendemos ni compartimos tus datos con terceros con fines comerciales.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-white">Cookies</h2>
          <p>
            Utilizamos cookies técnicas y de analytics para el funcionamiento del sitio. Podés configurar
            tu navegador para rechazarlas, aunque algunas funciones pueden verse limitadas.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-white">Contacto</h2>
          <p>
            Para ejercer derechos sobre tus datos, escribinos a{" "}
            <a href="mailto:Nileurbanlounge@gmail.com" className="text-gold hover:underline">
              Nileurbanlounge@gmail.com
            </a>.
          </p>
        </section>
      </div>
    </div>
  );
}
