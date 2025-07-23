import { z } from "zod/v4";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

const MEMBERSHIP_PORTAL_LINK_ROUTE_PATH = "/api/membership/portal-link";

const MembershipPortalLinkRequestSchema = z.object({
  membershipId: z.string(),
});

const MembershipPortalLinkActionDataErrorSchema = ActionDataSchema(
  MembershipPortalLinkRequestSchema,
  "error",
  MEMBERSHIP_PORTAL_LINK_ROUTE_PATH
);

const MembershipPortalLinkActionDataSuccessSchema = ActionDataSchema(
  z.object({ url: z.string().url() }),
  "ok",
  MEMBERSHIP_PORTAL_LINK_ROUTE_PATH
);

export type MembershipPortalLinkRouteResponse = RouteResponse<
  typeof MembershipPortalLinkActionDataSuccessSchema,
  typeof MembershipPortalLinkActionDataErrorSchema
>;

export const MEMBERSHIP_PORTAL_LINK_ROUTE = {
  path: MEMBERSHIP_PORTAL_LINK_ROUTE_PATH,
  method: "POST",
  request: MembershipPortalLinkRequestSchema,
  response: z.union([
    MembershipPortalLinkActionDataSuccessSchema,
    MembershipPortalLinkActionDataErrorSchema,
  ]),
  createRouteResponse: (
    args: Omit<MembershipPortalLinkRouteResponse, "key">
  ) => {
    return {
      ...args,
      key: MEMBERSHIP_PORTAL_LINK_ROUTE.path,
    };
  },
} as const;
