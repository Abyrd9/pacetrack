import { z } from "zod/v4";
import { TenantSchema } from "../../db-schema/tenant";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

export const AccountAcceptInviteRequestSchema = z.object({
	code: z.string(),
	email: z.string(),
	tenantId: z.string(),
});

export const ACCOUNT_ACCEPT_INVITE_ROUTE_PATH = "/api/account/accept-invite";

export const AccountAcceptInviteActionDataErrorSchema = ActionDataSchema(
	AccountAcceptInviteRequestSchema,
	"error",
	ACCOUNT_ACCEPT_INVITE_ROUTE_PATH,
);

export const AccountAcceptInviteActionDataSuccessSchema = ActionDataSchema(
	z.object({
		tenant: TenantSchema,
	}),
	"ok",
	ACCOUNT_ACCEPT_INVITE_ROUTE_PATH,
);

export type AccountAcceptInviteRouteResponse = RouteResponse<
	typeof AccountAcceptInviteActionDataSuccessSchema,
	typeof AccountAcceptInviteActionDataErrorSchema
>;

export const makeAccountAcceptInviteRouteResponse = (
	args: AccountAcceptInviteRouteResponse,
) => args;
