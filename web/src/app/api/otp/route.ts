import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { normalizePhone } from "@/lib/phone";

const OTP_COOKIE = "nile_otp_session";
const OTP_TTL_MS = 10 * 60 * 1000;

interface OtpPayload {
  phone: string;
  code: string;
  expiresAt: number;
}

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function parseOtpCookie(raw: string | undefined): OtpPayload | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as OtpPayload;
    if (!data.phone || !data.code || !data.expiresAt) return null;
    return data;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const { phone } = await req.json();
  const normalized = normalizePhone(String(phone ?? ""));
  if (normalized.length < 8) {
    return NextResponse.json({ error: "Teléfono inválido" }, { status: 400 });
  }

  const code = generateCode();
  const payload: OtpPayload = {
    phone: normalized,
    code,
    expiresAt: Date.now() + OTP_TTL_MS,
  };

  const cookieStore = await cookies();
  cookieStore.set(OTP_COOKIE, JSON.stringify(payload), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: OTP_TTL_MS / 1000,
    path: "/",
  });

  return NextResponse.json({
    phone: normalized,
    message: "Código generado. Ingresalo para validar tu acceso.",
    code,
  });
}

export async function PUT(req: NextRequest) {
  const { phone, code } = await req.json();
  const normalized = normalizePhone(String(phone ?? ""));
  const enteredCode = String(code ?? "").trim();

  if (!normalized || enteredCode.length !== 6) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const session = parseOtpCookie(cookieStore.get(OTP_COOKIE)?.value);

  if (!session) {
    return NextResponse.json(
      { error: "Sesión expirada. Pedí un código nuevo." },
      { status: 401 }
    );
  }

  if (Date.now() > session.expiresAt) {
    cookieStore.delete(OTP_COOKIE);
    return NextResponse.json({ error: "Código expirado. Pedí uno nuevo." }, { status: 401 });
  }

  if (session.phone !== normalized || session.code !== enteredCode) {
    return NextResponse.json({ error: "Código incorrecto" }, { status: 401 });
  }

  cookieStore.delete(OTP_COOKIE);
  cookieStore.set("nile_otp_verified", normalized, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60,
    path: "/",
  });

  return NextResponse.json({ verified: true, phone: normalized });
}
