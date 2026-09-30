import { NextResponse } from "next/server";
import { z } from "zod";
import { db, payments } from "@/db";
import { stripe } from "@/lib/stripe";

const Body = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.email().max(255).transform((e) => e.toLowerCase()),
  amount: z.number().min(0.5).max(10_000), // USD
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid name, email or amount." }, { status: 400 });
  }
  const { name, email, amount } = parsed.data;
  const cents = Math.round(amount * 100);

  // Receipts are sent by us via SMTP2GO, so Stripe's receipt_email is not set.
  const pi = await stripe().paymentIntents.create({
    amount: cents,
    currency: "usd",
    automatic_payment_methods: { enabled: true },
    metadata: { name, email },
  });

  await db.insert(payments).values({
    stripePaymentIntentId: pi.id,
    email,
    name,
    amount: cents,
    currency: "usd",
  });

  return NextResponse.json({ clientSecret: pi.client_secret });
}
