import { z } from "zod/v4";
import { AccountSchema } from "../../db-schema/account";
import { RoleSchema } from "../../db-schema/role";
import { TenantSchema } from "../../db-schema/tenant";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

const SESSION_GET_ACCOUNTS_META_ROUTE_PATH = "/api/session/get-account-meta";

const SessionGetAccountsMetaRequestSchema = z.object({});

const SessionGetAccountsMetaActionDataErrorSchema = ActionDataSchema(
  SessionGetAccountsMetaRequestSchema,
  "error",
  SESSION_GET_ACCOUNTS_META_ROUTE_PATH
);

const SessionGetAccountsMetaActionDataSuccessSchema = ActionDataSchema(
  z.object({
    session: z.array(
      z.object({
        account: AccountSchema,
        tenants: z.array(
          z.object({
            tenant: TenantSchema,
            role: RoleSchema,
          })
        ),
      })
    ),
    all: z.array(
      z.object({
        account: AccountSchema,
        tenants: z.array(
          z.object({
            tenant: TenantSchema,
            role: RoleSchema,
          })
        ),
      })
    ),
  }),
  "ok",
  SESSION_GET_ACCOUNTS_META_ROUTE_PATH
);

export type SessionGetAccountsMetaRouteResponse = RouteResponse<
  typeof SessionGetAccountsMetaActionDataSuccessSchema,
  typeof SessionGetAccountsMetaActionDataErrorSchema
>;

export const SESSION_GET_ACCOUNTS_META_ROUTE = {
  path: SESSION_GET_ACCOUNTS_META_ROUTE_PATH,
  method: "POST",
  request: SessionGetAccountsMetaRequestSchema,
  response: z.discriminatedUnion("status", [
    SessionGetAccountsMetaActionDataSuccessSchema,
    SessionGetAccountsMetaActionDataErrorSchema,
  ]),
  createRouteResponse: (
    args: Omit<SessionGetAccountsMetaRouteResponse, "key">
  ) => {
    return {
      ...args,
      key: SESSION_GET_ACCOUNTS_META_ROUTE.path,
    };
  },
} as const;
