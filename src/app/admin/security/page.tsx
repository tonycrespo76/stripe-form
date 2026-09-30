import Link from "next/link";
import { getOrCreateAdmin } from "@/lib/totp";
import { requireAdmin } from "@/lib/session";
import Enroll from "./Enroll";

export const dynamic = "force-dynamic";

export default async function SecurityPage() {
  const s = await requireAdmin();
  const admin = await getOrCreateAdmin(s.email);
  return (
    <main className="mx-auto w-full max-w-md px-4 py-16">
      <h1 className="mb-1 text-2xl font-semibold text-zinc-900">Two-factor authentication</h1>
      <p className="mb-6 text-sm text-zinc-500">
        {admin.totpEnabled
          ? "An authenticator app is enabled on your account."
          : "Add an authenticator app so signing in requires your email code and a TOTP code."}
      </p>
      <Enroll enabled={admin.totpEnabled} />
      <Link href="/admin" className="mt-8 inline-block text-sm text-indigo-600 hover:underline">
        ← Back to payments
      </Link>
    </main>
  );
}
