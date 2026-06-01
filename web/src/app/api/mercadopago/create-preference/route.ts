import { NextRequest, NextResponse } from "next/server";
import { DEPOSIT_AMOUNT } from "@/lib/constants";

export async function POST(req: NextRequest) {
  const { bookingId, title, amount } = await req.json();
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;

  if (!token) {
    return NextResponse.json(
      {
        error: "Mercado Pago no configurado",
        sandbox: true,
        depositAmount: DEPOSIT_AMOUNT,
      },
      { status: 503 }
    );
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const deposit = amount ?? DEPOSIT_AMOUNT;

  const preference = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      items: [
        {
          title: title ?? "Seña reserva Nile Urban Lounge",
          quantity: 1,
          unit_price: deposit,
          currency_id: "ARS",
        },
      ],
      back_urls: {
        success: `${siteUrl}/reservar/confirmacion?booking=${bookingId}&paid=1`,
        failure: `${siteUrl}/reservar?deposit=failed`,
        pending: `${siteUrl}/reservar/confirmacion?booking=${bookingId}&paid=pending`,
      },
      auto_return: "approved",
      external_reference: bookingId,
      notification_url: `${siteUrl}/api/mercadopago/webhook?bookingId=${bookingId}`,
    }),
  });

  const data = await preference.json();
  if (!preference.ok) {
    return NextResponse.json({ error: data.message ?? "MP error" }, { status: 500 });
  }

  return NextResponse.json({
    initPoint: data.init_point,
    sandboxInitPoint: data.sandbox_init_point,
    preferenceId: data.id,
  });
}
