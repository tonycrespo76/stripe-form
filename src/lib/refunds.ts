import { and, eq } from "drizzle-orm";
import { db, payments } from "@/db";
import { refundEmail, sendMail } from "./mailer";

/**
 * Records the cumulative refunded amount (Stripe's charge.amount_refunded) and
 * emails the customer about the newly refunded portion, partial or full.
 * Idempotent: the admin action, the webhook and Stripe retries can all call it
 * with the same total and only the first one sends an email.
 */
export async function syncRefund(paymentIntentId: string, totalRefunded: number) {
  const [p] = await db
    .select()
    .from(payments)
    .where(eq(payments.stripePaymentIntentId, paymentIntentId));
  if (!p || totalRefunded <= p.refundedAmount) return;

  // Optimistic claim on the previous total: only one concurrent caller wins.
  const claimed = await db
    .update(payments)
    .set({
      refundedAmount: totalRefunded,
      status: totalRefunded >= p.amount ? "refunded" : "partially_refunded",
      refundedAt: new Date(),
    })
    .where(
      and(eq(payments.id, p.id), eq(payments.refundedAmount, p.refundedAmount)),
    )
    .returning({ id: payments.id });
  if (claimed.length === 0) return;

  try {
    await sendMail({
      to: p.email,
      ...refundEmail({
        name: p.name,
        currency: p.currency,
        id: p.stripePaymentIntentId,
        refunded: totalRefunded - p.refundedAmount,
        paymentAmount: p.amount,
        totalRefunded,
      }),
    });
  } catch (e) {
    // The refund itself succeeded; don't fail the request over the email.
    console.error("Refund email failed", e);
  }
}
