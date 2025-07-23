import { z } from "zod/v4";
import { UserSchema } from "../../db-schema/user";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

const USER_GET_BY_ID_ROUTE_PATH = "/api/user/get-by-id";

const UserGetByIdRequestSchema = z.object({
  userId: z.string(),
});

const UserGetByIdActionDataErrorSchema = ActionDataSchema(
  UserGetByIdRequestSchema,
  "error",
  USER_GET_BY_ID_ROUTE_PATH
);
const UserGetByIdActionDataSuccessSchema = ActionDataSchema(
  UserSchema,
  "ok",
  USER_GET_BY_ID_ROUTE_PATH
);

export type UserGetByIdRouteResponse = RouteResponse<
  typeof UserGetByIdActionDataSuccessSchema,
  typeof UserGetByIdActionDataErrorSchema
>;

export const USER_GET_BY_ID_ROUTE = {
  path: USER_GET_BY_ID_ROUTE_PATH,
  method: "GET",
  request: UserGetByIdRequestSchema,
  response: z.union([
    UserGetByIdActionDataSuccessSchema,
    UserGetByIdActionDataErrorSchema,
  ]),
  createRouteResponse: (args: Omit<UserGetByIdRouteResponse, "key">) => {
    return {
      ...args,
      key: USER_GET_BY_ID_ROUTE.path,
    };
  },
} as const;
