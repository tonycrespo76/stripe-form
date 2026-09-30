"use client";

import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const input =
  "w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200";
const button =
  "w-full rounded-lg bg-indigo-600 px-4 py-2.5 font-medium text-white hover:bg-indigo-500 disabled:opacity-50";

export default function PayForm() {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function start(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const f = new FormData(e.currentTarget);
    const res = await fetch("/api/payment-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: f.get("name"),
        email: f.get("email"),
        amount: Number(f.get("amount")),
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return setError(data.error ?? "Something went wrong.");
    setClientSecret(data.clientSecret);
  }

  if (clientSecret) {
    return (
      <Elements stripe={stripePromise} options={{ clientSecret }}>
        <Checkout />
      </Elements>
    );
  }

  return (
    <form onSubmit={start} className="space-y-4">
      <label className="block space-y-1">
        <span className="text-sm font-medium text-zinc-700">Full name</span>
        <input name="name" required maxLength={100} autoComplete="name" className={input} />
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-medium text-zinc-700">Email (for your receipt)</span>
        <input name="email" type="email" required autoComplete="email" className={input} />
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-medium text-zinc-700">Amount (USD)</span>
        <input
          name="amount"
          type="number"
          required
          min="0.5"
          max="10000"
          step="0.01"
          inputMode="decimal"
          className={input}
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button disabled={loading} className={button}>
        {loading ? "Please wait…" : "Continue to payment"}
      </button>
    </form>
  );
}

function Checkout() {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setBusy(true);
    setError(null);
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}/pay/success` },
    });
    // Only reached on immediate error; otherwise Stripe redirects.
    setError(error.message ?? "Payment failed.");
    setBusy(false);
  }

  return (
    <form onSubmit={pay} className="space-y-4">
      <PaymentElement />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button disabled={!stripe || busy} className={button}>
        {busy ? "Processing…" : "Pay now"}
      </button>
    </form>
  );
}
