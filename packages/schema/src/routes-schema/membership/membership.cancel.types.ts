import { z } from "zod/v4";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

export const MEMBERSHIP_CANCEL_ROUTE_PATH = "/api/membership/cancel";

export const MembershipCancelRequestSchema = z.object({
	membershipId: z.string(),
});

export const MembershipCancelActionDataErrorSchema = ActionDataSchema(
	MembershipCancelRequestSchema,
	"error",
	MEMBERSHIP_CANCEL_ROUTE_PATH,
);

export const MembershipCancelActionDataSuccessSchema = ActionDataSchema(
	z.object({ message: z.string() }),
	"ok",
	MEMBERSHIP_CANCEL_ROUTE_PATH,
);

export type MembershipCancelRouteResponse = RouteResponse<
	typeof MembershipCancelActionDataSuccessSchema,
	typeof MembershipCancelActionDataErrorSchema
>;

export const makeMembershipCancelRouteResponse = (
	args: MembershipCancelRouteResponse,
) => args;
