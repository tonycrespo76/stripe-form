import { randomInt } from "node:crypto";
import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { db, otpCodes } from "@/db";
import { hmac, safeEqual } from "./crypto";
import { otpEmail, sendMail } from "./mailer";

const TTL_MS = 10 * 60 * 1000;
const RESEND_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

export function adminEmails() {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/** Sends a code only to allow-listed admins; callers must respond identically either way. */
export async function issueOtp(email: string) {
  if (!adminEmails().includes(email)) return;

  const [last] = await db
    .select()
    .from(otpCodes)
    .where(eq(otpCodes.email, email))
    .orderBy(desc(otpCodes.createdAt))
    .limit(1);
  if (last && Date.now() - last.createdAt.getTime() < RESEND_MS) return;

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await db.insert(otpCodes).values({
    email,
    codeHash: hmac(`${email}:${code}`),
    expiresAt: new Date(Date.now() + TTL_MS),
  });
  await sendMail({ to: email, ...otpEmail(code) });
}

export async function verifyOtp(email: string, code: string) {
  const [row] = await db
    .select()
    .from(otpCodes)
    .where(
      and(
        eq(otpCodes.email, email),
        isNull(otpCodes.consumedAt),
        gt(otpCodes.expiresAt, new Date()),
      ),
    )
    .orderBy(desc(otpCodes.createdAt))
    .limit(1);
  if (!row || row.attempts >= MAX_ATTEMPTS) return false;

  await db
    .update(otpCodes)
    .set({ attempts: row.attempts + 1 })
    .where(eq(otpCodes.id, row.id));

  if (!safeEqual(row.codeHash, hmac(`${email}:${code}`))) return false;

  const [res] = await db
    .update(otpCodes)
    .set({ consumedAt: new Date() })
    .where(and(eq(otpCodes.id, row.id), isNull(otpCodes.consumedAt)));
  return res.affectedRows === 1;
}
