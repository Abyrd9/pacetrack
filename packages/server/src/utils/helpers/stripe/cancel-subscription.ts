import { stripe } from "./stripe-client";

/**
 * Cancel a Stripe subscription if Stripe is configured.
 * Handles both real Stripe and mock/local environments gracefully.
 *
 * @param subscriptionId - The Stripe subscription ID to cancel
 * @returns true if subscription was cancelled (or Stripe is not configured), false if no subscription_id
 */
export async function cancelSubscription(
  subscriptionId: string | null
): Promise<boolean> {
  // No subscription to cancel
  if (!subscriptionId) {
    return false;
  }

  // If subscription ID looks like a mock ID, skip Stripe call
  if (subscriptionId.startsWith("sub_mock_")) {
    return true;
  }

  // If stripe is undefined, it means we might not want it active in the current environment
  // (e.g., local dev without STRIPE_SECRET_KEY, or using stripe-mock)
  if (stripe) {
    try {
      await stripe.subscriptions.cancel(subscriptionId);
    } catch (error) {
      console.error("Failed to cancel Stripe subscription:", error);
      // Don't throw - we still want to soft-delete the membership
      // The subscription will remain in Stripe but the user loses access
      return false;
    }
  }

  return true;
}
