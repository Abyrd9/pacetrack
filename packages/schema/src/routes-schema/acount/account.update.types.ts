import { z } from "zod/v4";
import { AccountSchema } from "../../db-schema/account";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

const AccountUpdateRequestSchema = z.object({
  id: z.string(),
  display_name: z.string().optional(),
  image: z
    .union([
      z
        .file()
        .max(1024 * 1024 * 25, {
          message: "Image must be less than 25MB",
        })
        .mime(["image/png", "image/webp", "image/jpeg"]),
      z.literal("REMOVE"),
    ])
    .optional(),
});

const ACCOUNT_UPDATE_ROUTE_PATH = "/api/account/update";

const AccountUpdateActionDataErrorSchema = ActionDataSchema(
  AccountUpdateRequestSchema,
  "error",
  ACCOUNT_UPDATE_ROUTE_PATH
);
const AccountUpdateActionDataSuccessSchema = ActionDataSchema(
  AccountSchema,
  "ok",
  ACCOUNT_UPDATE_ROUTE_PATH
);

export type AccountUpdateRouteResponse = RouteResponse<
  typeof AccountUpdateActionDataSuccessSchema,
  typeof AccountUpdateActionDataErrorSchema
>;

export const ACCOUNT_UPDATE_ROUTE = {
  path: ACCOUNT_UPDATE_ROUTE_PATH,
  method: "POST",
  request: AccountUpdateRequestSchema,
  response: z.union([
    AccountUpdateActionDataSuccessSchema,
    AccountUpdateActionDataErrorSchema,
  ]),
  createRouteResponse: (args: Omit<AccountUpdateRouteResponse, "key">) => {
    return {
      ...args,
      key: ACCOUNT_UPDATE_ROUTE.path,
    };
  },
} as const;
