import { z } from "zod/v4";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

const SESSION_LINK_ACCOUNT_ROUTE_PATH = "/api/session/link-account";

const SessionLinkAccountRequestSchema = z.object({
  email: z.email({
    error: (val) =>
      val.input === undefined ? "Email is required" : "Email is invalid",
  }),
  password: z
    .string({ error: "Password is required" })
    .min(8, "Password must be at least 8 characters"),
});

const SessionLinkAccountActionDataErrorSchema = ActionDataSchema(
  SessionLinkAccountRequestSchema,
  "error",
  SESSION_LINK_ACCOUNT_ROUTE_PATH
);

const SessionLinkAccountActionDataSuccessSchema = ActionDataSchema(
  z.object({
    message: z.string(),
  }),
  "ok",
  SESSION_LINK_ACCOUNT_ROUTE_PATH
);

export type SessionLinkAccountRouteResponse = RouteResponse<
  typeof SessionLinkAccountActionDataSuccessSchema,
  typeof SessionLinkAccountActionDataErrorSchema
>;

export const SESSION_LINK_ACCOUNT_ROUTE = {
  path: SESSION_LINK_ACCOUNT_ROUTE_PATH,
  method: "POST",
  request: SessionLinkAccountRequestSchema,
  response: z.union([
    SessionLinkAccountActionDataSuccessSchema,
    SessionLinkAccountActionDataErrorSchema,
  ]),
  createRouteResponse: (args: Omit<SessionLinkAccountRouteResponse, "key">) => {
    return {
      ...args,
      key: SESSION_LINK_ACCOUNT_ROUTE.path,
    };
  },
} as const;
