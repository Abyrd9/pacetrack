import { z } from "zod/v4";
import { AccountSchema } from "../../db-schema/account";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

export const AccountGetRequestSchema = z.object({
	page: z.coerce.number().int().positive().optional(),
	perPage: z.coerce.number().int().positive().max(100).optional(),
});

export const ACCOUNT_GET_ROUTE_PATH = "/api/account/get";

export const AccountGetActionDataErrorSchema = ActionDataSchema(
	AccountGetRequestSchema,
	"error",
	ACCOUNT_GET_ROUTE_PATH,
);

export const AccountGetActionDataSuccessSchema = ActionDataSchema(
	z.object({
		accounts: z.array(AccountSchema),
		pagination: z
			.object({
				total: z.number(),
				page: z.number(),
				perPage: z.number(),
				totalPages: z.number(),
			})
			.optional(),
	}),
	"ok",
	ACCOUNT_GET_ROUTE_PATH,
);

export type AccountGetRouteResponse = RouteResponse<
	typeof AccountGetActionDataSuccessSchema,
	typeof AccountGetActionDataErrorSchema
>;

export const makeAccountGetRouteResponse = (args: AccountGetRouteResponse) =>
	args;
