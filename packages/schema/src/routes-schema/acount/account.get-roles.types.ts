import { z } from "zod/v4";
import { RoleSchema } from "../../db-schema/role";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

export const ACCOUNT_GET_ROLES_ROUTE_PATH = "/api/account/get-roles";

export const AccountGetRolesActionDataErrorSchema = ActionDataSchema(
	z.object({
		global: z.string().optional(),
	}),
	"error",
	ACCOUNT_GET_ROLES_ROUTE_PATH,
);

export const AccountGetRolesActionDataSuccessSchema = ActionDataSchema(
	z.object({
		roles: z.record(z.string(), RoleSchema),
	}),
	"ok",
	ACCOUNT_GET_ROLES_ROUTE_PATH,
);

export type AccountGetRolesRouteResponse = RouteResponse<
	typeof AccountGetRolesActionDataSuccessSchema,
	typeof AccountGetRolesActionDataErrorSchema
>;

export const makeAccountGetRolesRouteResponse = (
	args: AccountGetRolesRouteResponse,
) => args;
