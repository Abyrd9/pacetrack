import { z } from "zod/v4";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

// Request schema for removing accounts from a account group
export const AccountGroupRemoveAccountsRequestSchema = z.object({
	accountGroupId: z.string(),
	accountIds: z.array(z.string()).min(1),
});

export const ACCOUNT_GROUP_REMOVE_USERS_ROUTE_PATH =
	"/api/account-group/remove-accounts";

// Action data schemas
export const AccountGroupRemoveAccountsActionDataErrorSchema = ActionDataSchema(
	AccountGroupRemoveAccountsRequestSchema,
	"error",
	ACCOUNT_GROUP_REMOVE_USERS_ROUTE_PATH,
);

export const AccountGroupRemoveAccountsActionDataSuccessSchema =
	ActionDataSchema(
		z.object({
			message: z.string(),
		}),
		"ok",
		ACCOUNT_GROUP_REMOVE_USERS_ROUTE_PATH,
	);

// Route response type
export type AccountGroupRemoveAccountsRouteResponse = RouteResponse<
	typeof AccountGroupRemoveAccountsActionDataSuccessSchema,
	typeof AccountGroupRemoveAccountsActionDataErrorSchema
>;

export const makeAccountGroupRemoveAccountsRouteResponse = (
	args: AccountGroupRemoveAccountsRouteResponse,
) => args;
