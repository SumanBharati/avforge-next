import Stripe from "stripe";

let _stripe: Stripe | null = null;

// Lazily constructed so a missing STRIPE_SECRET_KEY (e.g. a build/deploy
// that hasn't configured billing yet) doesn't break `next build`'s page
// data collection for every route that imports this module — it only
// throws once a Stripe API route is actually invoked at runtime.
function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return _stripe;
}

export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return Reflect.get(getStripe(), prop);
  },
});
