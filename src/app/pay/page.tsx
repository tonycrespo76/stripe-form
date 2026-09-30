import PayForm from "./PayForm";

export const metadata = { title: "Make a payment" };

export default function PayPage() {
  return (
    <main className="mx-auto w-full max-w-md px-4 py-16">
      <h1 className="mb-1 text-2xl font-semibold text-zinc-900">Make a payment</h1>
      <p className="mb-6 text-sm text-zinc-500">
        Secure checkout powered by Stripe. A receipt will be emailed to you.
      </p>
      <PayForm />
    </main>
  );
}
