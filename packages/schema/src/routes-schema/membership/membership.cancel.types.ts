import { z } from "zod/v4";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

const MEMBERSHIP_CANCEL_ROUTE_PATH = "/api/membership/cancel";

const MembershipCancelRequestSchema = z.object({
  membershipId: z.string(),
});

const MembershipCancelActionDataErrorSchema = ActionDataSchema(
  MembershipCancelRequestSchema,
  "error",
  MEMBERSHIP_CANCEL_ROUTE_PATH
);

const MembershipCancelActionDataSuccessSchema = ActionDataSchema(
  z.object({ message: z.string() }),
  "ok",
  MEMBERSHIP_CANCEL_ROUTE_PATH
);

export type MembershipCancelRouteResponse = RouteResponse<
  typeof MembershipCancelActionDataSuccessSchema,
  typeof MembershipCancelActionDataErrorSchema
>;

export const MEMBERSHIP_CANCEL_ROUTE = {
  path: MEMBERSHIP_CANCEL_ROUTE_PATH,
  method: "POST",
  request: MembershipCancelRequestSchema,
  response: z.union([
    MembershipCancelActionDataSuccessSchema,
    MembershipCancelActionDataErrorSchema,
  ]),
  createRouteResponse: (args: Omit<MembershipCancelRouteResponse, "key">) => {
    return {
      ...args,
      key: MEMBERSHIP_CANCEL_ROUTE.path,
    };
  },
} as const;
