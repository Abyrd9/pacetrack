import { z } from "zod/v4";
import { MembershipSchema } from "../../db-schema/membership";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

const MEMBERSHIP_GET_ROUTE_PATH = "/api/membership/get";

const MembershipGetActionDataErrorSchema = ActionDataSchema(
  z.object({
    global: z.string(),
  }),
  "error",
  MEMBERSHIP_GET_ROUTE_PATH
);

const MembershipGetActionDataSuccessSchema = ActionDataSchema(
  z.object({
    memberships: z.array(MembershipSchema),
  }),
  "ok",
  MEMBERSHIP_GET_ROUTE_PATH
);

export type MembershipGetRouteResponse = RouteResponse<
  typeof MembershipGetActionDataSuccessSchema,
  typeof MembershipGetActionDataErrorSchema
>;

export const MEMBERSHIP_GET_ROUTE = {
  path: MEMBERSHIP_GET_ROUTE_PATH,
  method: "GET",
  response: z.union([
    MembershipGetActionDataSuccessSchema,
    MembershipGetActionDataErrorSchema,
  ]),
  createRouteResponse: (args: Omit<MembershipGetRouteResponse, "key">) => {
    return {
      ...args,
      key: MEMBERSHIP_GET_ROUTE.path,
    };
  },
} as const;
