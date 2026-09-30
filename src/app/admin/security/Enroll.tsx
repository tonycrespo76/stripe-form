"use client";

import { useActionState } from "react";
import { confirmEnrollment, startEnrollment, type FormState } from "../actions";

export default function Enroll({ enabled }: { enabled: boolean }) {
  const [start, startAction, starting] = useActionState<FormState, FormData>(
    () => startEnrollment(),
    {},
  );
  const [confirm, confirmAction, confirming] = useActionState<FormState, FormData>(
    confirmEnrollment,
    start,
  );
  const enrollment = start.qr ? start : null;

  return (
    <div className="space-y-4">
      {!enrollment && (
        <form action={startAction}>
          <button
            disabled={starting}
            className="rounded-lg bg-indigo-600 px-4 py-2.5 font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {enabled ? "Replace authenticator" : "Set up authenticator app"}
          </button>
        </form>
      )}

      {enrollment && (
        <form action={confirmAction} className="space-y-4">
          <p className="text-sm text-zinc-600">
            Scan this QR code with Google Authenticator, 1Password, Authy, etc.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={enrollment.qr} alt="TOTP QR code" width={220} height={220} />
          <p className="text-xs text-zinc-500">
            Can&apos;t scan? Enter this key manually:{" "}
            <code className="break-all select-all">{enrollment.secret}</code>
          </p>
          <input
            name="token"
            required
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            placeholder="6-digit code"
            className="w-48 rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-indigo-500"
          />
          {confirm.error && <p className="text-sm text-red-600">{confirm.error}</p>}
          <button
            disabled={confirming}
            className="ml-2 rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            Enable
          </button>
        </form>
      )}
    </div>
  );
}
