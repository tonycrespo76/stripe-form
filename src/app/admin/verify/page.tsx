"use client";

import { useActionState } from "react";
import { submitTotp, type FormState } from "../actions";

export default function VerifyPage() {
  const [state, action, pending] = useActionState<FormState, FormData>(submitTotp, {});
  return (
    <main className="mx-auto w-full max-w-sm px-4 py-16">
      <h1 className="mb-1 text-2xl font-semibold text-zinc-900">Two-factor check</h1>
      <p className="mb-6 text-sm text-zinc-500">
        Enter the 6-digit code from your authenticator app.
      </p>
      <form action={action} className="space-y-4">
        <input
          name="token"
          required
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          placeholder="123456"
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-center text-xl tracking-[0.4em] outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
        />
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        <button
          disabled={pending}
          className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {pending ? "Verifying…" : "Verify"}
        </button>
      </form>
    </main>
  );
}
