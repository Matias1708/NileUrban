import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const bookingId = req.nextUrl.searchParams.get("bookingId");
  const body = await req.json().catch(() => ({}));

  console.log("MP webhook", { bookingId, type: body?.type, data: body?.data });

  return NextResponse.json({ received: true });
}
