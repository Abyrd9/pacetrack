import type { Account, User } from "@pacetrack/schema";
import { createId } from "@paralleldrive/cuid2";
import { stripe } from "src/utils/helpers/stripe/stripe-client";

export const createNewCustomer = async (user: User, account: Account) => {
  // If stripe is undefined, it means we might not want it active in the current environment
  if (!stripe) {
    return {
      customer: {
        id: `cus_mock_${createId()}`,
      },
      subscription: {
        id: `sub_mock_${createId()}`,
      },
    };
  }

  const customer = await stripe.customers.create({
    email: account.email ?? "",
    metadata: {
      user_id: user.id,
      account_id: account.id,
    },
  });

  const subscription = await stripe.subscriptions.create({
    customer: customer.id,
    items: [{ price: Bun.env.STRIPE_PRICE_ID }],
    payment_settings: {
      save_default_payment_method: "on_subscription",
    },
    trial_period_days: 30,
    trial_settings: {
      end_behavior: {
        missing_payment_method: "cancel",
      },
    },
  });

  return { customer, subscription };
};
