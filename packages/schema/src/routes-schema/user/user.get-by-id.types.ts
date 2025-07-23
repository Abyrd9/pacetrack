import { z } from "zod/v4";
import { UserSchema } from "../../db-schema/user";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

export const USER_GET_BY_ID_ROUTE_PATH = "/api/user/get-by-id";

export const UserGetByIdRequestSchema = z.object({
  userId: z.string(),
});

export const UserGetByIdActionDataErrorSchema = ActionDataSchema(
  UserGetByIdRequestSchema,
  "error",
  USER_GET_BY_ID_ROUTE_PATH
);

export const UserGetByIdActionDataSuccessSchema = ActionDataSchema(
  UserSchema,
  "ok",
  USER_GET_BY_ID_ROUTE_PATH
);

export type UserGetByIdRouteResponse = RouteResponse<
  typeof UserGetByIdActionDataSuccessSchema,
  typeof UserGetByIdActionDataErrorSchema
>;

export const makeUserGetByIdRouteResponse = (args: UserGetByIdRouteResponse) =>
  args;
