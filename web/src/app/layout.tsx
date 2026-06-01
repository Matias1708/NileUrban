import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PWARegister } from "@/components/PWARegister";
import { LoyaltyPromoModal } from "@/components/LoyaltyPromoModal";
import { SALON } from "@/lib/constants";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nileurban.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${SALON.name} | Barbería en Ramos Mejía`,
    template: `%s | ${SALON.name}`,
  },
  description:
    "Barbería premium en Ramos Mejía. Cortes precisos, barba y estilo masculino. Reservá tu turno online con tu barbero favorito.",
  keywords: ["barbería", "peluquería masculina", "Ramos Mejía", "corte de pelo", "barba"],
  openGraph: {
    type: "website",
    locale: "es_AR",
    url: siteUrl,
    siteName: SALON.name,
    title: `${SALON.name} | Barbería en Ramos Mejía`,
    description: "Reservá tu turno online. Equipo de barberos profesionales.",
    images: [{ url: "/images/newequipo.jpg", width: 1200, height: 630, alt: SALON.name }],
  },
  twitter: {
    card: "summary_large_image",
    title: SALON.name,
    description: "Barbería premium en Ramos Mejía",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: SALON.name,
  },
};

export const viewport: Viewport = {
  themeColor: "#0d0d0d",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${poppins.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <PWARegister />
        <LoyaltyPromoModal />
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
