import {
  bigint,
  boolean,
  index,
  integer,
  pgTable,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

const ts = (name: string) => timestamp(name, { withTimezone: true });
const id = () => integer("id").primaryKey().generatedAlwaysAsIdentity();

export const admins = pgTable("admins", {
  id: id(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  // AES-256-GCM encrypted base32 secret (see lib/crypto.ts)
  totpSecret: varchar("totp_secret", { length: 512 }),
  totpEnabled: boolean("totp_enabled").notNull().default(false),
  // last accepted TOTP time-step, blocks code replay
  totpLastStep: bigint("totp_last_step", { mode: "number" }),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const otpCodes = pgTable(
  "otp_codes",
  {
    id: id(),
    email: varchar("email", { length: 255 }).notNull(),
    codeHash: varchar("code_hash", { length: 64 }).notNull(),
    attempts: integer("attempts").notNull().default(0),
    expiresAt: ts("expires_at").notNull(),
    consumedAt: ts("consumed_at"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("otp_email_idx").on(t.email)],
);

export const payments = pgTable(
  "payments",
  {
    id: id(),
    stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 })
      .notNull()
      .unique(),
    email: varchar("email", { length: 255 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    amount: integer("amount").notNull(), // minor units (cents)
    currency: varchar("currency", { length: 3 }).notNull(),
    status: varchar("status", { length: 32 }).notNull().default("pending"),
    receiptSentAt: ts("receipt_sent_at"),
    refundedAt: ts("refunded_at"),
    refundedAmount: integer("refunded_amount").notNull().default(0), // cumulative, minor units
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("payments_created_idx").on(t.createdAt)],
);
