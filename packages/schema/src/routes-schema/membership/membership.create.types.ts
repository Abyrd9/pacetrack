import { z } from "zod/v4";
import { MembershipSchema } from "../../db-schema/membership";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

const MEMBERSHIP_CREATE_ROUTE_PATH = "/api/membership/create";

const MembershipCreateRequestSchema = z.object({
  tenantId: z.string(),
});

const MembershipCreateActionDataErrorSchema = ActionDataSchema(
  MembershipCreateRequestSchema,
  "error",
  MEMBERSHIP_CREATE_ROUTE_PATH
);

const MembershipCreateActionDataSuccessSchema = ActionDataSchema(
  MembershipSchema,
  "ok",
  MEMBERSHIP_CREATE_ROUTE_PATH
);

export type MembershipCreateRouteResponse = RouteResponse<
  typeof MembershipCreateActionDataSuccessSchema,
  typeof MembershipCreateActionDataErrorSchema
>;

export const MEMBERSHIP_CREATE_ROUTE = {
  path: MEMBERSHIP_CREATE_ROUTE_PATH,
  method: "POST",
  request: MembershipCreateRequestSchema,
  response: z.union([
    MembershipCreateActionDataSuccessSchema,
    MembershipCreateActionDataErrorSchema,
  ]),
  createRouteResponse: (args: Omit<MembershipCreateRouteResponse, "key">) => {
    return {
      ...args,
      key: MEMBERSHIP_CREATE_ROUTE.path,
    };
  },
} as const;
