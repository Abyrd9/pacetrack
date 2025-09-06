import { z } from "zod/v4";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";
import { PublicSessionWithTokenSchema } from "../../types/session";

const VALIDATE_SESSION_ROUTE_PATH = "/api/session/validate";

const ValidateSessionRequestSchema = z.object({
  tenantId: z.string().optional(),
});

const ValidateSessionSuccessSchema = ActionDataSchema(
  z.object({
    user_id: z.string(),
    account_id: z.string(),
    tenant_id: z.string(),
    role_id: z.string(),
    session: PublicSessionWithTokenSchema,
  }),
  "ok",
  VALIDATE_SESSION_ROUTE_PATH
);

const ValidateSessionErrorSchema = ActionDataSchema(
  z.object({
    user_id: z.string().optional(),
    account_id: z.string().optional(),
    tenant_id: z.string().optional(),
    role_id: z.string().optional(),
  }),
  "error",
  VALIDATE_SESSION_ROUTE_PATH
);

export type ValidateSessionRouteResponse = RouteResponse<
  typeof ValidateSessionSuccessSchema,
  typeof ValidateSessionErrorSchema
>;

export const VALIDATE_SESSION_ROUTE = {
  path: VALIDATE_SESSION_ROUTE_PATH,
  method: "POST",
  request: ValidateSessionRequestSchema,
  response: z.union([ValidateSessionSuccessSchema, ValidateSessionErrorSchema]),
  createRouteResponse: (args: Omit<ValidateSessionRouteResponse, "key">) => {
    return {
      ...args,
      key: VALIDATE_SESSION_ROUTE.path,
    };
  },
} as const;
