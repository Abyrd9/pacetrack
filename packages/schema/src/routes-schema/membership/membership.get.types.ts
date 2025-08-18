import { z } from "zod/v4";
import { MembershipSchema } from "../../db-schema/membership";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

export const MEMBERSHIP_GET_ROUTE_PATH = "/api/membership/get";

export const MembershipGetActionDataErrorSchema = ActionDataSchema(
	z.object({
		global: z.string(),
	}),
	"error",
	MEMBERSHIP_GET_ROUTE_PATH,
);

export const MembershipGetActionDataSuccessSchema = ActionDataSchema(
	z.object({
		memberships: z.array(MembershipSchema),
	}),
	"ok",
	MEMBERSHIP_GET_ROUTE_PATH,
);

export type MembershipGetRouteResponse = RouteResponse<
	typeof MembershipGetActionDataSuccessSchema,
	typeof MembershipGetActionDataErrorSchema
>;

export const makeMembershipGetRouteResponse = (
	args: MembershipGetRouteResponse,
) => args;
