import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  images: {
    remotePatterns: [],
    unoptimized: true,
  },
  async redirects() {
    return [
      { source: "/index.html", destination: "/", permanent: true },
      { source: "/principal.html", destination: "/reservar", permanent: true },
      { source: "/principal", destination: "/reservar", permanent: true },
      { source: "/finance.html", destination: "/staff/finanzas", permanent: true },
      { source: "/finance", destination: "/staff/finanzas", permanent: true },
      { source: "/reservar.html", destination: "/reservar", permanent: true },
      { source: "/reservas", destination: "/reservar", permanent: true },
      { source: "/reserva", destination: "/reservar", permanent: true },
      { source: "/turnos", destination: "/mis-turnos", permanent: true },
      { source: "/mis-turnos.html", destination: "/mis-turnos", permanent: true },
      { source: "/fidelidad/abonos", destination: "/abonos", permanent: true },
    ];
  },
};

export default nextConfig;
