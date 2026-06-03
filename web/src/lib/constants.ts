export type BarberName = "Pablo" | "Nicolas" | "Lautaro" | "Matias";

export type ServiceName = "Corte" | "Corte + Barba" | "Barba";

export const BARBERS: BarberName[] = ["Pablo", "Nicolas", "Lautaro", "Matias"];

export const BARBER_ALIASES: Record<string, BarberName> = {
  pablo: "Pablo",
  nicolas: "Nicolas",
  nico: "Nicolas",
  lautaro: "Lautaro",
  matias: "Matias",
  mati: "Matias",
};

export const SERVICES: ServiceName[] = ["Corte", "Corte + Barba", "Barba"];

export const BASE_PRICES: Record<ServiceName, number> = {
  Corte: 24000,
  "Corte + Barba": 26000,
  Barba: 16000,
};

export const DEPOSIT_AMOUNT = 3000;

export const SALON = {
  id: "nile-urban-ramos-mejia",
  name: "Nile Urban Lounge",
  address: "Av. De Mayo 702, Ramos Mejía",
  phone: "1164380904",
  email: "Nileurbanlounge@gmail.com",
  instagram: "https://www.instagram.com/nile.urbanlounge",
  hours: "Lunes de 13 a 18:20 hs · Martes a sábado de 10 a 19 hs",
  whatsapp: "5491164380904",
};
