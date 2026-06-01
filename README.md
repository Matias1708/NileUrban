# Nile Urban Lounge — Plataforma de reservas

Sitio y panel staff para **Nile Urban Lounge** (barbería, Ramos Mejía).

## Estructura

```
NileUrban/
├── web/                 # Next.js 16 + TypeScript + Tailwind (app principal)
├── functions/           # Firebase Cloud Functions (bookings, reminders, MP)
├── firestore.rules      # Reglas de seguridad Firestore
├── index.html           # Legacy landing (redirige a web/)
├── principal.html       # Legacy reservas
└── finance.html         # Legacy finanzas
```

## Inicio rápido

### 1. Variables de entorno

Copiá `.env.example` a `web/.env.local` y completá las claves de Firebase.

**Importante:** rotá las API keys expuestas en los HTML legacy desde [Firebase Console](https://console.firebase.google.com).

### 2. App web

```bash
cd web
npm install
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000)

### 3. Cloud Functions

```bash
cd functions
npm install
npm run build
firebase deploy --only functions,firestore:rules
```

### 4. Staff (Firebase Auth)

1. Creá usuarios en Firebase Auth (email/password) para cada barbero/admin.
2. Asigná custom claims (`admin`, `staff`, `barberName`) con Admin SDK o la consola.
3. Accedé en `/staff/login`.

## Rutas principales

| Ruta | Descripción |
|------|-------------|
| `/` | Landing premium |
| `/reservar` | Reserva online + seña MP |
| `/mis-turnos` | Consulta/cancelación con OTP |
| `/staff` | Agenda staff |
| `/staff/finanzas` | Panel financiero |
| `/politica-cancelacion` | Política legal |
| `/resenas` | Reseñas post-turno |

## Tests y CI

```bash
cd web
npm run test
npm run lint
npm run build
```

GitHub Actions ejecuta lint, tests y build en cada PR.

## Despliegue

- **Frontend:** Vercel (`web/` como root) o `next build && firebase deploy --only hosting`
- **Backend:** Firebase Functions + Firestore Rules
- **Pagos:** Mercado Pago (`MERCADOPAGO_ACCESS_TOKEN`)
- **Emails:** Resend (`RESEND_API_KEY`) para confirmaciones

## Migración desde legacy

Los HTML en la raíz siguen funcionando durante la transición. La app Next.js es el objetivo principal:

1. Desplegá `web/` en producción
2. Configurá redirects de `index.html` → `/`
3. Apagá panel admin embebido en `principal.html` cuando `/staff` esté validado

## Camino de escalado

Arquitectura preparada para **Camino A** (local premium) con hooks para multi-sede (`salonId` en constants). Ver plan de producto en `.cursor/plans/`.
