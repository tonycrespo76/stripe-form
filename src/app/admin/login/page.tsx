"use client";

import { useActionState, useState } from "react";
import { requestCode, submitCode, type FormState } from "../actions";

const input =
  "w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200";
const button =
  "w-full rounded-lg bg-indigo-600 px-4 py-2.5 font-medium text-white hover:bg-indigo-500 disabled:opacity-50";

export default function LoginPage() {
  const [sent, sendAction, sending] = useActionState<FormState, FormData>(requestCode, {});
  const [verified, verifyAction, verifying] = useActionState<FormState, FormData>(submitCode, {});

  const [typed, setTyped] = useState("");
  const email = verified.email ?? sent.email;
  const codeSent = sent.codeSent || verified.codeSent;
  const error = verified.error ?? sent.error;

  return (
    <main className="mx-auto w-full max-w-sm px-4 py-16">
      <h1 className="mb-1 text-2xl font-semibold text-zinc-900">Admin sign in</h1>
      <p className="mb-6 text-sm text-zinc-500">
        {codeSent
          ? `If ${email} is an admin address, a 6-digit code is on its way.`
          : "We'll email you a one-time code."}
      </p>

      {!codeSent ? (
        <form action={sendAction} className="space-y-4">
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            className={input}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button disabled={sending} className={button}>
            {sending ? "Sending…" : "Email me a code"}
          </button>
        </form>
      ) : (
        <form action={verifyAction} className="space-y-4">
          <input type="hidden" name="email" value={email} />
          <input
            name="code"
            required
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            placeholder="123456"
            className={`${input} text-center text-xl tracking-[0.4em]`}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button disabled={verifying} className={button}>
            {verifying ? "Verifying…" : "Sign in"}
          </button>
        </form>
      )}
    </main>
  );
}
