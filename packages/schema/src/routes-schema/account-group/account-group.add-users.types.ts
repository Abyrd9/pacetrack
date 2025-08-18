import { z } from "zod/v4";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

// Request schema for adding accounts to a account group
export const AccountGroupAddAccountsRequestSchema = z.object({
	accountGroupId: z.string(),
	accountIds: z.array(z.string()).min(1),
});

// Route path constant
export const ACCOUNT_GROUP_ADD_ACCOUNTS_ROUTE_PATH =
	"/api/account-group/add-accounts";

// Action data schemas
export const AccountGroupAddAccountsActionDataErrorSchema = ActionDataSchema(
	AccountGroupAddAccountsRequestSchema,
	"error",
	ACCOUNT_GROUP_ADD_ACCOUNTS_ROUTE_PATH,
);

export const AccountGroupAddAccountsActionDataSuccessSchema = ActionDataSchema(
	z.object({
		message: z.string(),
	}),
	"ok",
	ACCOUNT_GROUP_ADD_ACCOUNTS_ROUTE_PATH,
);

// Route response type
export type AccountGroupAddAccountsRouteResponse = RouteResponse<
	typeof AccountGroupAddAccountsActionDataSuccessSchema,
	typeof AccountGroupAddAccountsActionDataErrorSchema
>;

export const makeAccountGroupAddAccountsRouteResponse = (
	args: AccountGroupAddAccountsRouteResponse,
) => args;
