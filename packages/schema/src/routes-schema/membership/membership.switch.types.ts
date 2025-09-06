import { z } from "zod/v4";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

const MEMBERSHIP_SWITCH_ROUTE_PATH = "/api/membership/switch";

const MembershipSwitchRequestSchema = z.object({
  tenantId: z.string(),
  targetMembershipId: z.string().nullable(),
});

const MembershipSwitchActionDataErrorSchema = ActionDataSchema(
  MembershipSwitchRequestSchema,
  "error",
  MEMBERSHIP_SWITCH_ROUTE_PATH
);

const MembershipSwitchActionDataSuccessSchema = ActionDataSchema(
  z.object({ message: z.string() }),
  "ok",
  MEMBERSHIP_SWITCH_ROUTE_PATH
);

export type MembershipSwitchRouteResponse = RouteResponse<
  typeof MembershipSwitchActionDataSuccessSchema,
  typeof MembershipSwitchActionDataErrorSchema
>;

export const MEMBERSHIP_SWITCH_ROUTE = {
  path: MEMBERSHIP_SWITCH_ROUTE_PATH,
  method: "POST",
  request: MembershipSwitchRequestSchema,
  response: z.union([
    MembershipSwitchActionDataSuccessSchema,
    MembershipSwitchActionDataErrorSchema,
  ]),
  createRouteResponse: (args: Omit<MembershipSwitchRouteResponse, "key">) => {
    return {
      ...args,
      key: MEMBERSHIP_SWITCH_ROUTE.path,
    };
  },
} as const;
