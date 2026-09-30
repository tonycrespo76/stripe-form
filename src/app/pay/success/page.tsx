import Link from "next/link";
import { stripe } from "@/lib/stripe";

export const metadata = { title: "Payment status" };

export default async function SuccessPage({
  searchParams,
}: PageProps<"/pay/success">) {
  const sp = await searchParams;
  const id = typeof sp.payment_intent === "string" ? sp.payment_intent : null;
  const pi = id ? await stripe().paymentIntents.retrieve(id).catch(() => null) : null;

  const ok = pi?.status === "succeeded";
  const processing = pi?.status === "processing";

  return (
    <main className="mx-auto w-full max-w-md px-4 py-16 text-center">
      <h1 className="mb-2 text-2xl font-semibold text-zinc-900">
        {ok ? "Payment received 🎉" : processing ? "Payment processing" : "Payment not completed"}
      </h1>
      {pi && (
        <p className="mb-2 text-zinc-600">
          {new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: pi.currency.toUpperCase(),
          }).format(pi.amount / 100)}
        </p>
      )}
      <p className="mb-6 text-sm text-zinc-500">
        {ok || processing
          ? "A receipt will be emailed to you shortly."
          : "Something went wrong. You have not been charged. Please try again."}
      </p>
      <Link href="/pay" className="text-indigo-600 hover:underline">
        {ok ? "Make another payment" : "Try again"}
      </Link>
    </main>
  );
}
