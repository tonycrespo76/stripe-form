"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, payments } from "@/db";
import { markRefundedAndNotify } from "@/lib/refunds";
import { stripe } from "@/lib/stripe";
import { adminEmails, issueOtp, verifyOtp } from "@/lib/otp";
import { clearSession, getSession, requireAdmin, setSession } from "@/lib/session";
import { beginTotpEnrollment, checkTotp, getOrCreateAdmin } from "@/lib/totp";

export type FormState = {
  error?: string;
  email?: string;
  codeSent?: boolean;
  qr?: string;
  secret?: string;
};

const EmailSchema = z.email().transform((e) => e.toLowerCase());

/** Step 1a: request an emailed code. Same response whether or not the email is an admin. */
export async function requestCode(_: FormState, fd: FormData): Promise<FormState> {
  const parsed = EmailSchema.safeParse(fd.get("email"));
  if (!parsed.success) return { error: "Enter a valid email." };
  try {
    await issueOtp(parsed.data);
  } catch (e) {
    console.error("OTP send failed", e);
    return { error: "Could not send the code. Try again shortly.", email: parsed.data };
  }
  return { email: parsed.data, codeSent: true };
}

/** Step 1b: verify emailed code. Continues to TOTP if enrolled. */
export async function submitCode(_: FormState, fd: FormData): Promise<FormState> {
  const parsed = EmailSchema.safeParse(fd.get("email"));
  const code = String(fd.get("code") ?? "").trim();
  if (!parsed.success) return { error: "Enter a valid email." };
  const email = parsed.data;
  const fail = { error: "Invalid or expired code.", email, codeSent: true };

  if (!adminEmails().includes(email) || !/^\d{6}$/.test(code)) return fail;
  if (!(await verifyOtp(email, code))) return fail;

  const admin = await getOrCreateAdmin(email);
  if (admin.totpEnabled) {
    await setSession({ email, stage: "totp" });
    redirect("/admin/verify");
  }
  await setSession({ email, stage: "full" });
  redirect("/admin/security"); // prompt to enroll an authenticator
}

/** Step 2: authenticator code. */
export async function submitTotp(_: FormState, fd: FormData): Promise<FormState> {
  const s = await getSession();
  if (s?.stage !== "totp") redirect("/admin/login");
  const ok = await checkTotp(s.email, String(fd.get("token") ?? "").trim());
  if (!ok) return { error: "Invalid authenticator code." };
  await setSession({ email: s.email, stage: "full" });
  redirect("/admin");
}

export async function startEnrollment(): Promise<FormState> {
  const s = await requireAdmin();
  const { qr, secret } = await beginTotpEnrollment(s.email);
  return { qr, secret };
}

export async function confirmEnrollment(prev: FormState, fd: FormData): Promise<FormState> {
  const s = await requireAdmin();
  const ok = await checkTotp(s.email, String(fd.get("token") ?? "").trim(), true);
  if (!ok) return { ...prev, error: "Invalid code. Try the next one shown in your app." };
  redirect("/admin");
}

export async function logout() {
  await clearSession();
  redirect("/admin/login");
}

/** Full refund of a succeeded payment. Status is also synced by the charge.refunded webhook. */
export async function refundPayment(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const id = Number(fd.get("id"));
  const [p] = Number.isInteger(id)
    ? await db.select().from(payments).where(eq(payments.id, id))
    : [];
  if (!p) return { error: "Payment not found." };
  if (p.status !== "succeeded") return { error: "Only succeeded payments can be refunded." };

  try {
    await stripe().refunds.create(
      { payment_intent: p.stripePaymentIntentId },
      { idempotencyKey: `refund-${p.stripePaymentIntentId}` },
    );
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (code !== "charge_already_refunded") {
      console.error("Refund failed", e);
      return { error: (e as Error).message || "Refund failed." };
    }
  }
  await markRefundedAndNotify(p.stripePaymentIntentId);
  revalidatePath("/admin");
  return {};
}
