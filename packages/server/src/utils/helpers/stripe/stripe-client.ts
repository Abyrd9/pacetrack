import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) console.warn("STRIPE_SECRET_KEY is not set");

// Build a config object that only contains keys accepted by the Stripe constructor
const config: Stripe.StripeConfig = {
  apiVersion: "2025-09-30.clover",
  typescript: true,
};

// Allow overriding the API base (useful for stripe-mock, etc.) via STRIPE_API_BASE
if (process.env.STRIPE_API_BASE) {
  try {
    const url = new URL(process.env.STRIPE_API_BASE);
    config.protocol = url.protocol.replace(":", "") as "http" | "https";
    config.host = url.hostname;
    if (url.port) config.port = Number(url.port);
  } catch {
    // If STRIPE_API_BASE is a bare hostname without protocol (e.g. "localhost")
    config.host = process.env.STRIPE_API_BASE;
  }
}

export const stripe = key ? new Stripe(key, config) : undefined;
