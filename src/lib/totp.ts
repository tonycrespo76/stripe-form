import { generateSecret, generateURI, verify } from "otplib";
import QRCode from "qrcode";
import { eq } from "drizzle-orm";
import { admins, db } from "@/db";
import { decrypt, encrypt } from "./crypto";

const ISSUER = "Payment Form";

export async function getOrCreateAdmin(email: string) {
  await db.insert(admins).values({ email }).onConflictDoNothing();
  const [a] = await db.select().from(admins).where(eq(admins.email, email));
  return a;
}

/** Starts enrollment: stores a pending (not yet enabled) secret, returns QR + manual key. */
export async function beginTotpEnrollment(email: string) {
  const secret = generateSecret();
  await db
    .update(admins)
    .set({ totpSecret: encrypt(secret), totpEnabled: false, totpLastStep: null })
    .where(eq(admins.email, email));
  const uri = generateURI({ issuer: ISSUER, label: email, secret });
  return { secret, qr: await QRCode.toDataURL(uri, { margin: 1, width: 220 }) };
}

/** Checks a code (±1 step), rejecting replays. `enable` flips totpEnabled on success. */
export async function checkTotp(email: string, token: string, enable = false) {
  const [a] = await db.select().from(admins).where(eq(admins.email, email));
  if (!a?.totpSecret || !/^\d{6}$/.test(token)) return false;
  if (!enable && !a.totpEnabled) return false;

  const res = await verify({
    secret: decrypt(a.totpSecret),
    token,
    epochTolerance: 30,
  });
  if (!res.valid) return false;
  const step = Math.floor(Date.now() / 30_000) + res.delta; // delta is in 30s periods
  if (a.totpLastStep !== null && step <= a.totpLastStep) return false;

  await db
    .update(admins)
    .set({ totpLastStep: step, ...(enable ? { totpEnabled: true } : {}) })
    .where(eq(admins.email, email));
  return true;
}
