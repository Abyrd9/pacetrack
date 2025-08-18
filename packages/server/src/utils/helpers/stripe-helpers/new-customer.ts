import type { Account, User } from "@pacetrack/schema";
import { createId } from "@paralleldrive/cuid2";
import { stripe } from "src/utils/helpers/stripe";

export const createNewCustomer = async (user: User, account: Account) => {
	// We'll use this when deploying this to a non-production environment
	// Just to know the application works and such
	if (Bun.env.MOCK_STRIPE) {
		return {
			customer: {
				id: `cus_${createId()}`,
			},
			subscription: {
				id: `sub_${createId()}`,
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
