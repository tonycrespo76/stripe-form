import { and, eq, isNull } from "drizzle-orm";
import { db, payments } from "@/db";
import { receiptEmail, sendMail } from "./mailer";

/** Marks the payment succeeded and emails the receipt exactly once. */
export async function markPaidAndSendReceipt(paymentIntentId: string) {
  await db
    .update(payments)
    .set({ status: "succeeded" })
    .where(eq(payments.stripePaymentIntentId, paymentIntentId));

  // Atomic claim: only one caller (webhook retry, etc.) wins the update.
  const [claim] = await db
    .update(payments)
    .set({ receiptSentAt: new Date() })
    .where(
      and(
        eq(payments.stripePaymentIntentId, paymentIntentId),
        isNull(payments.receiptSentAt),
      ),
    );
  if (claim.affectedRows === 0) return;

  const [p] = await db
    .select()
    .from(payments)
    .where(eq(payments.stripePaymentIntentId, paymentIntentId));
  try {
    await sendMail({
      to: p.email,
      ...receiptEmail({
        name: p.name,
        amount: p.amount,
        currency: p.currency,
        id: p.stripePaymentIntentId,
        date: p.createdAt,
      }),
    });
  } catch (e) {
    // release the claim so a webhook retry can resend
    await db
      .update(payments)
      .set({ receiptSentAt: null })
      .where(eq(payments.stripePaymentIntentId, paymentIntentId));
    throw e;
  }
}
