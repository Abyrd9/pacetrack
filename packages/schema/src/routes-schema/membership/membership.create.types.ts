import { z } from "zod/v4";
import { MembershipSchema } from "../../db-schema/membership";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

export const MEMBERSHIP_CREATE_ROUTE_PATH = "/api/membership/create";

export const MembershipCreateRequestSchema = z.object({
	tenantId: z.string(),
});

export const MembershipCreateActionDataErrorSchema = ActionDataSchema(
	MembershipCreateRequestSchema,
	"error",
	MEMBERSHIP_CREATE_ROUTE_PATH,
);

export const MembershipCreateActionDataSuccessSchema = ActionDataSchema(
	MembershipSchema,
	"ok",
	MEMBERSHIP_CREATE_ROUTE_PATH,
);

export type MembershipCreateRouteResponse = RouteResponse<
	typeof MembershipCreateActionDataSuccessSchema,
	typeof MembershipCreateActionDataErrorSchema
>;

export const makeMembershipCreateRouteResponse = (
	args: MembershipCreateRouteResponse,
) => args;
