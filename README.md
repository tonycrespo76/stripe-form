# Stripe Payment Form

Next.js 16 (App Router) · React 19 · MySQL (Drizzle) · Stripe Payment Element · SMTP2GO (OTP + receipts) · TOTP 2FA.

- `/pay` – public guest checkout (name, email, amount → Stripe Payment Element).
- Stripe webhook marks the payment `succeeded` and emails a receipt via SMTP2GO (sent once, idempotent).
- `/admin` – payments list. Sign-in = emailed 6-digit OTP (admin emails only, from `ADMIN_EMAILS`), then TOTP if enrolled. Enroll an authenticator at `/admin/security`.

## Setup

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill it in (`APP_SECRET`: `openssl rand -base64 32`).
3. Create the MySQL database (`CREATE DATABASE stripe_pay;`), then `npm run db:push`.
4. Webhook (local): `stripe listen --forward-to localhost:3000/api/stripe/webhook` and put the printed `whsec_…` in `STRIPE_WEBHOOK_SECRET`.
   Production: add an endpoint for `payment_intent.succeeded` and `payment_intent.payment_failed`.
5. SMTP2GO: verify your sender domain/address and use it in `MAIL_FROM`.
6. `npm run dev` → http://localhost:3000. Test card: `4242 4242 4242 4242`.

## Notes

- OTP: hashed (HMAC), 10 min expiry, 5 attempts, 60 s resend throttle.
- TOTP secrets are AES-256-GCM encrypted at rest; used codes can't be replayed.
- Not built yet: backup/recovery codes, refunds, rate limiting per IP.
