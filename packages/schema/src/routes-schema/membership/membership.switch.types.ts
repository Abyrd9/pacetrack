import { z } from "zod/v4";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

export const MEMBERSHIP_SWITCH_ROUTE_PATH = "/api/membership/switch";

export const MembershipSwitchRequestSchema = z.object({
	tenantId: z.string(),
	targetMembershipId: z.string().nullable(),
});

export const MembershipSwitchActionDataErrorSchema = ActionDataSchema(
	MembershipSwitchRequestSchema,
	"error",
	MEMBERSHIP_SWITCH_ROUTE_PATH,
);

export const MembershipSwitchActionDataSuccessSchema = ActionDataSchema(
	z.object({ message: z.string() }),
	"ok",
	MEMBERSHIP_SWITCH_ROUTE_PATH,
);

export type MembershipSwitchRouteResponse = RouteResponse<
	typeof MembershipSwitchActionDataSuccessSchema,
	typeof MembershipSwitchActionDataErrorSchema
>;

export const makeMembershipSwitchRouteResponse = (
	args: MembershipSwitchRouteResponse,
) => args;
