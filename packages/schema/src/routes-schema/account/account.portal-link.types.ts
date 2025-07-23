import { z } from "zod/v4";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

export const ACCOUNT_PORTAL_LINK_ROUTE_PATH = "/api/account/portal-link";

export const AccountPortalLinkRequestSchema = z.object({
  accountId: z.string(),
});

export const AccountPortalLinkActionDataErrorSchema = ActionDataSchema(
  AccountPortalLinkRequestSchema,
  "error",
  ACCOUNT_PORTAL_LINK_ROUTE_PATH
);

export const AccountPortalLinkActionDataSuccessSchema = ActionDataSchema(
  z.object({ url: z.string().url() }),
  "ok",
  ACCOUNT_PORTAL_LINK_ROUTE_PATH
);

export type AccountPortalLinkRouteResponse = RouteResponse<
  typeof AccountPortalLinkActionDataSuccessSchema,
  typeof AccountPortalLinkActionDataErrorSchema
>;

export const makeAccountPortalLinkRouteResponse = (
  args: AccountPortalLinkRouteResponse
) => args;
