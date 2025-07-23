import { z } from "zod/v4";
import { UserSchema } from "../../db-schema/user";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

const UserCreateRequestSchema = z.object({
  display_name: z.string().optional(),
});

const USER_CREATE_ROUTE_PATH = "/api/user/create";

const UserCreateActionDataErrorSchema = ActionDataSchema(
  UserCreateRequestSchema,
  "error",
  USER_CREATE_ROUTE_PATH
);
const UserCreateActionDataSuccessSchema = ActionDataSchema(
  UserSchema,
  "ok",
  USER_CREATE_ROUTE_PATH
);

export type UserCreateRouteResponse = RouteResponse<
  typeof UserCreateActionDataSuccessSchema,
  typeof UserCreateActionDataErrorSchema
>;

export const USER_CREATE_ROUTE = {
  path: USER_CREATE_ROUTE_PATH,
  method: "POST",
  request: UserCreateRequestSchema,
  response: z.union([
    UserCreateActionDataSuccessSchema,
    UserCreateActionDataErrorSchema,
  ]),
  createRouteResponse: (args: Omit<UserCreateRouteResponse, "key">) => {
    return {
      ...args,
      key: USER_CREATE_ROUTE.path,
    };
  },
} as const;
