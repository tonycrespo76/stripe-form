"use client";

import { useActionState } from "react";
import { refundPayment, type FormState } from "./actions";

export default function RefundButton({ id, label }: { id: number; label: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(refundPayment, {});
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(`Refund ${label}? This cannot be undone.`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        disabled={pending}
        className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
      >
        {pending ? "Refunding…" : "Refund"}
      </button>
      {state.error && <p className="mt-1 max-w-48 text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
