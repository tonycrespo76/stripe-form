import Stripe from "stripe";

let _stripe: Stripe | undefined;
export function stripe() {
  return (_stripe ??= new Stripe(process.env.STRIPE_SECRET_KEY!));
}
