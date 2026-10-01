import { and, eq, ne } from "drizzle-orm";
import { db, payments } from "@/db";
import { refundEmail, sendMail } from "./mailer";

/**
 * Marks a payment fully refunded and emails the customer exactly once.
 * Safe to call from both the admin action and the charge.refunded webhook.
 */
export async function markRefundedAndNotify(paymentIntentId: string) {
  const [p] = await db
    .update(payments)
    .set({ status: "refunded", refundedAt: new Date() })
    .where(
      and(
        eq(payments.stripePaymentIntentId, paymentIntentId),
        ne(payments.status, "refunded"), // only the first caller wins
      ),
    )
    .returning();
  if (!p) return;

  try {
    await sendMail({
      to: p.email,
      ...refundEmail({
        name: p.name,
        amount: p.amount,
        currency: p.currency,
        id: p.stripePaymentIntentId,
      }),
    });
  } catch (e) {
    // The refund itself succeeded; don't fail the request over the email.
    console.error("Refund email failed", e);
  }
}
