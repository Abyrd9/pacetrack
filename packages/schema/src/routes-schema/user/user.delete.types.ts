import { z } from "zod/v4";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

const USER_DELETE_ROUTE_PATH = "/api/user/delete";

const UserDeleteRequestSchema = z.object({
  userId: z.string(),
});

const UserDeleteActionDataErrorSchema = ActionDataSchema(
  UserDeleteRequestSchema,
  "error",
  USER_DELETE_ROUTE_PATH
);

const UserDeleteActionDataSuccessSchema = ActionDataSchema(
  z.object({
    message: z.string(),
  }),
  "ok",
  USER_DELETE_ROUTE_PATH
);

export type UserDeleteRouteResponse = RouteResponse<
  typeof UserDeleteActionDataSuccessSchema,
  typeof UserDeleteActionDataErrorSchema
>;

export const USER_DELETE_ROUTE = {
  path: USER_DELETE_ROUTE_PATH,
  method: "POST",
  request: UserDeleteRequestSchema,
  response: z.union([
    UserDeleteActionDataSuccessSchema,
    UserDeleteActionDataErrorSchema,
  ]),
  createRouteResponse: (args: Omit<UserDeleteRouteResponse, "key">) => {
    return {
      ...args,
      key: USER_DELETE_ROUTE.path,
    };
  },
} as const;
