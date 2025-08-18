import { z } from "zod/v4";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

export const MEMBERSHIP_PORTAL_LINK_ROUTE_PATH = "/api/membership/portal-link";

export const MembershipPortalLinkRequestSchema = z.object({
	membershipId: z.string(),
});

export const MembershipPortalLinkActionDataErrorSchema = ActionDataSchema(
	MembershipPortalLinkRequestSchema,
	"error",
	MEMBERSHIP_PORTAL_LINK_ROUTE_PATH,
);

export const MembershipPortalLinkActionDataSuccessSchema = ActionDataSchema(
	z.object({ url: z.string().url() }),
	"ok",
	MEMBERSHIP_PORTAL_LINK_ROUTE_PATH,
);

export type MembershipPortalLinkRouteResponse = RouteResponse<
	typeof MembershipPortalLinkActionDataSuccessSchema,
	typeof MembershipPortalLinkActionDataErrorSchema
>;

export const makeMembershipPortalLinkRouteResponse = (
	args: MembershipPortalLinkRouteResponse,
) => args;
