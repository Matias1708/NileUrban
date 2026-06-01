# Nile Urban Lounge — Resumen de cambios del sistema

**Documento para el dueño del salón**  
**Fecha:** junio 2026  
**Sitio nuevo:** app web Next.js (reemplazo progresivo de `principal.html` y `finance.html`)

---

## 1. En pocas palabras

Se armó una **web moderna** para Nile Urban Lounge donde el cliente puede reservar, ver sus turnos y sumar puntos de fidelidad, y el equipo puede manejar **agenda, finanzas, horarios, precios y fidelidad** desde un panel staff unificado.

La base de datos sigue siendo **Firebase (Firestore)** — los turnos viven en la misma colección `Reserva` que el sistema viejo, así que **no se pierden reservas existentes**. Lo nuevo convive con el HTML viejo durante la transición.

---

## 2. Sistema viejo vs sistema nuevo

| Tema | Sistema viejo (`principal.html` / `finance.html`) | Sistema nuevo (web) |
|------|---------------------------------------------------|---------------------|
| **Reservas online** | Formulario en HTML con Flatpickr | `/reservar` — formulario moderno, misma base Firestore |
| **Horarios** | Código fijo en el HTML | Configurables desde `/staff/horarios` |
| **Precios** | Hardcodeados en el HTML | Editables desde `/staff/precios` |
| **Agenda del staff** | Lista embebida en `principal.html` | `/staff` — vista calendario, columnas y filtros |
| **Finanzas** | `finance.html` | `/staff/finanzas` |
| **Seña Mercado Pago** | Existía en el flujo viejo | **Eliminada** — reserva directa confirmada |
| **Mis turnos del cliente** | Limitado / inexistente | `/mis-turnos` con verificación por teléfono |
| **Fidelidad** | No existía | Programa completo de puntos y premios |
| **Validación de horarios** | Con bugs conocidos (ej. horarios “stale”) | Solo slots oficiales de 40 min (10:00, 10:40, 11:20…) |
| **Seguridad Firestore** | Reglas básicas | Reglas estrictas + Cloud Functions (pendiente deploy final) |

---

## 3. Lo que ve y puede hacer el CLIENTE

### Reservar turno — `/reservar`
- Elige barbero, servicio, fecha y horario disponible.
- Deja nombre y teléfono.
- La reserva queda **confirmada al instante** (sin seña).
- Al final puede ver un resumen y agregar el turno a Google Calendar.

### Mis turnos — `/mis-turnos`
- Ingresa su **teléfono** (el mismo que usó al reservar).
- Pide un **código de verificación** → se abre WhatsApp con el código.
- Ingresa el código y ve sus **turnos futuros**.
- Puede **cancelar** o ir a reprogramar.
- **Atajo:** si viene desde el modal post-reserva, entra directo sin código.

### Programa de fidelidad — `/fidelidad`
- Explica cómo sumar puntos y los premios.
- El progreso personal se ve en **Mis turnos** (después de verificar el teléfono).

### Banner promocional
- Al entrar a la web aparece una **barra abajo** con info corta de fidelidad y botón **“Ver programa”**.
- Se muestra **una vez por visita** (sesión), se cierra sola a los 8 segundos.

---

## 4. Programa de fidelidad (detalle)

### Reglas acordadas
| Puntos en el ciclo | Premio |
|--------------------|--------|
| **5** | 20% de descuento |
| **8** | Servicio premium (lavado / perfilado barba) |
| **10** | Corte gratis → el contador vuelve a **0** |

- **1 visita atendida = 1 punto** (no se suma al reservar, solo cuando el staff marca **Atendido**).
- **Ciclo de 45 días:** si el cliente no usa sus puntos/premios, el ciclo se **reinicia solo** (puntos y premios pendientes se borran; las visitas totales quedan registradas).
- Los premios quedan **pendientes** hasta que el staff los marca como **Canjeado** al aplicarlos en el salón.

### WhatsApp post-corte
Cuando el barbero toca **Atendido**:
1. Suma el punto.
2. Se abre **WhatsApp al cliente** con un mensaje armado (solo texto, sin links), por ejemplo:  
   *“Sumaste 1 punto. Tenés 4/10. Te falta 1 visita para 20% de descuento.”*
3. El barbero solo tiene que tocar **Enviar** en WhatsApp.

> **Nota:** hoy el mensaje no sale solo; el staff confirma el envío con un tap (sin costo de API). Más adelante se puede automatizar con WhatsApp Business.

### Dónde ve el staff la fidelidad
1. **En la agenda** (`/staff`): badge en cada turno con puntos y premios pendientes.
2. **Panel Fidelidad** (`/staff/fidelidad`): listado de todos los clientes, buscador por nombre/teléfono, filtros, botón **Canjeado**.

---

## 5. Panel Staff — `/staff`

### Acceso
- URL: **`/staff/login`**
- Mismas credenciales que el sistema viejo (admin y barberos por contraseña).

### Agenda — `/staff`
- Vista **calendario** (día × barberos), **columnas** o **filtro**.
- Solo turnos futuros + últimos 7 días sin marcar (para no perder puntos).
- Por cada turno:
  - Link WhatsApp recordatorio al cliente.
  - Checkbox **Rec.** (recordatorio enviado).
  - Botón **Atendido** (suma fidelidad + abre WhatsApp de puntos).
  - Badge de fidelidad del cliente.
  - Eliminar turno (solo admin).

### Fidelidad — `/staff/fidelidad`
- Tabla de clientes con puntos, visitas totales, días hasta renovación del ciclo y premios pendientes.

### Finanzas — `/staff/finanzas`
- Equivalente moderno de `finance.html`: ingresos, gastos, abonos, filtros por fecha y barbero.

### Horarios — `/staff/horarios` (admin)
- Configurar días y franjas de cada barbero sin tocar código.

### Precios — `/staff/precios` (admin)
- Editar precios de servicios y reglas especiales desde la web.

---

## 6. Cambios técnicos importantes (sin jerga)

### Horarios de reserva
- Los turnos online solo se pueden tomar en horarios **oficiales de 40 minutos**:  
  `10:00 · 10:40 · 11:20 · 12:00 · 13:00 · 13:40 …` hasta `19:00`.
- Esto evita el bug del sistema viejo donde a veces aparecían horarios raros (ej. 10:15 un viernes).
- Turnos viejos con hora `10:15` en la base de datos se **muestran bien en la agenda nueva** (mapeados a la fila correcta).

### Reserva confirmada directa
- Se quitó la **seña de Mercado Pago** del flujo del cliente.
- Menos fricción para reservar; el cliente confirma y listo.

### Seguridad (pendiente deploy final)
- Reglas de Firestore para que no se puedan crear reservas con horarios inválidos.
- Cloud Function que valida reservas del lado del servidor.
- Comando cuando estén listos:  
  `firebase deploy --only firestore:rules,functions`

---

## 7. Qué sigue activo del sistema viejo

| Archivo | Estado |
|---------|--------|
| `principal.html` | Sigue funcionando; puede seguir usándose en paralelo |
| `finance.html` | Sigue funcionando; el panel nuevo lo reemplaza |
| `index.html` | Landing legacy / redirección |

**Recomendación:** cuando el equipo esté cómodo con `/staff`, dejar de usar el panel embebido en `principal.html` y unificar todo en la web nueva.

---

## 8. Guía rápida para el equipo del salón

### Cuando llega un cliente con reserva web
1. Ver turno en **Staff → Calendario**.
2. Enviar recordatorio WhatsApp si hace falta (link en la card).
3. Atenderlo.
4. Tocar **Atendido** → se suma el punto → enviar WhatsApp de fidelidad.
5. Si tiene premio pendiente (🎁), aplicarlo al cobrar y marcar **Canjeado** en Fidelidad.

### Si un cliente pregunta por sus puntos
> “Entrá a la web → **Mis turnos**, poné tu celular, pedí el código por WhatsApp y ahí ves todo.”

### Si pregunta por el programa
> “Cada visita suma 1 punto. A los 5 tenés 20% off, a los 8 un servicio premium y a los 10 un corte gratis. Cada 45 días arranca de nuevo si no lo usás.”

---

## 9. Próximos pasos sugeridos (aún no hechos)

| Prioridad | Idea |
|-----------|------|
| Alta | Deploy final Firebase (reglas + functions) |
| Media | Opt-in WhatsApp marketing en la 3ª visita (charlado, no implementado) |
| Media | Apagar panel viejo de `principal.html` |
| Baja | WhatsApp 100% automático (API Meta / Twilio) |
| Baja | Referidos, lista de espera inteligente, dashboard de métricas |

---

## 10. URLs de referencia

| Página | URL |
|--------|-----|
| Web pública | `/` |
| Reservar | `/reservar` |
| Mis turnos | `/mis-turnos` |
| Fidelidad (info) | `/fidelidad` |
| Staff login | `/staff/login` |
| Agenda | `/staff` |
| Fidelidad staff | `/staff/fidelidad` |
| Finanzas | `/staff/finanzas` |
| Horarios | `/staff/horarios` |
| Precios | `/staff/precios` |

*(En producción, anteponer el dominio del sitio, ej. `https://nileurban.com/reservar`)*

---

## 11. Variables de entorno importantes (para quien hace el deploy)

| Variable | Para qué |
|----------|----------|
| `NEXT_PUBLIC_FIREBASE_*` | Conexión a la base de datos |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Número del salón para códigos de Mis turnos |

---

*Documento preparado para compartir con el equipo de Nile Urban Lounge. Ante dudas operativas del día a día, la referencia principal es el panel **Staff → Agenda** y **Staff → Fidelidad**.*
