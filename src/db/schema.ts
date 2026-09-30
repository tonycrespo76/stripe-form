import {
  bigint,
  boolean,
  index,
  int,
  mysqlTable,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

export const admins = mysqlTable("admins", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  // AES-256-GCM encrypted base32 secret (see lib/crypto.ts)
  totpSecret: varchar("totp_secret", { length: 512 }),
  totpEnabled: boolean("totp_enabled").notNull().default(false),
  // last accepted TOTP time-step, blocks code replay
  totpLastStep: bigint("totp_last_step", { mode: "number" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const otpCodes = mysqlTable(
  "otp_codes",
  {
    id: int("id").autoincrement().primaryKey(),
    email: varchar("email", { length: 255 }).notNull(),
    codeHash: varchar("code_hash", { length: 64 }).notNull(),
    attempts: int("attempts").notNull().default(0),
    expiresAt: timestamp("expires_at").notNull(),
    consumedAt: timestamp("consumed_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("otp_email_idx").on(t.email)],
);

export const payments = mysqlTable(
  "payments",
  {
    id: int("id").autoincrement().primaryKey(),
    stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 })
      .notNull()
      .unique(),
    email: varchar("email", { length: 255 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    amount: int("amount").notNull(), // minor units (cents)
    currency: varchar("currency", { length: 3 }).notNull(),
    status: varchar("status", { length: 32 }).notNull().default("pending"),
    receiptSentAt: timestamp("receipt_sent_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("payments_created_idx").on(t.createdAt)],
);
