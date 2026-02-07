import Stripe from "stripe";

let stripeInstance: Stripe | null = null;

export const stripe = new Proxy({} as Stripe, {
  get(target, prop, receiver) {
    if (!stripeInstance) {
      const stripeKey = process.env.STRIPE_SECRET_KEY || "";
      stripeInstance = new Stripe(stripeKey, {
        apiVersion: "2025-12-15.clover",
        typescript: true,
      });
    }
    const value = Reflect.get(stripeInstance, prop, receiver);
    return typeof value === 'function' ? value.bind(stripeInstance) : value;
  }
});
