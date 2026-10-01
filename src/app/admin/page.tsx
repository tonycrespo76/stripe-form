import Link from "next/link";
import { desc } from "drizzle-orm";
import { db, payments } from "@/db";
import { requireAdmin } from "@/lib/session";
import { getOrCreateAdmin } from "@/lib/totp";
import { logout } from "./actions";
import RefundButton from "./RefundButton";

export const dynamic = "force-dynamic";

const money = (cents: number, cur: string) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: cur.toUpperCase() }).format(cents / 100);

export default async function AdminPage() {
  const s = await requireAdmin();
  const [admin, rows] = await Promise.all([
    getOrCreateAdmin(s.email),
    db.select().from(payments).orderBy(desc(payments.createdAt)).limit(100),
  ]);

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900">Payments</h1>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-zinc-500">{s.email}</span>
          <Link href="/admin/security" className="text-indigo-600 hover:underline">
            2FA
          </Link>
          <form action={logout}>
            <button className="text-zinc-600 hover:underline">Sign out</button>
          </form>
        </div>
      </header>

      {!admin.totpEnabled && (
        <p className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Authenticator app not set up.{" "}
          <Link href="/admin/security" className="font-medium underline">
            Enable two-factor authentication
          </Link>
          .
        </p>
      )}

      <div className="overflow-x-auto rounded-lg border border-zinc-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-600">
            <tr>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2 text-right">Amount</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Receipt</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {rows.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-2 whitespace-nowrap">{p.createdAt.toLocaleString("en-US")}</td>
                <td className="px-4 py-2">{p.name}</td>
                <td className="px-4 py-2">{p.email}</td>
                <td className="px-4 py-2 text-right">{money(p.amount, p.currency)}</td>
                <td className="px-4 py-2">{p.status}</td>
                <td className="px-4 py-2">{p.receiptSentAt ? "sent" : "—"}</td>
                <td className="px-4 py-2 text-right">
                  {p.status === "succeeded" && (
                    <RefundButton id={p.id} label={money(p.amount, p.currency)} />
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                  No payments yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
