import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { db, payments } from "@/db";
import { markPaidAndSendReceipt } from "@/lib/receipts";
import { stripe } from "@/lib/stripe";

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) return new NextResponse("Missing signature", { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(
      await req.text(), // raw body required for signature check
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch {
    return new NextResponse("Invalid signature", { status: 400 });
  }

  if (event.type === "payment_intent.succeeded") {
    await markPaidAndSendReceipt(event.data.object.id);
  } else if (event.type === "charge.refunded") {
    const charge = event.data.object;
    const pi = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
    if (pi) {
      await db
        .update(payments)
        .set({
          status: charge.refunded ? "refunded" : "partially_refunded",
          refundedAt: new Date(),
        })
        .where(eq(payments.stripePaymentIntentId, pi));
    }
  } else if (event.type === "payment_intent.payment_failed") {
    await db
      .update(payments)
      .set({ status: "failed" })
      .where(eq(payments.stripePaymentIntentId, event.data.object.id));
  }

  return NextResponse.json({ received: true });
}
