import { z } from "zod/v4";
import { UserSchema } from "../../db-schema/user";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

export const UserGetRequestSchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  perPage: z.coerce.number().int().positive().max(100).optional(),
});

export const USER_GET_ROUTE_PATH = "/api/user/get";

export const UserGetActionDataErrorSchema = ActionDataSchema(
  UserGetRequestSchema,
  "error",
  USER_GET_ROUTE_PATH
);

export const UserGetActionDataSuccessSchema = ActionDataSchema(
  z.object({
    users: z.array(UserSchema),
    pagination: z
      .object({
        total: z.number(),
        page: z.number(),
        perPage: z.number(),
        totalPages: z.number(),
      })
      .optional(),
  }),
  "ok",
  USER_GET_ROUTE_PATH
);

export type UserGetRouteResponse = RouteResponse<
  typeof UserGetActionDataSuccessSchema,
  typeof UserGetActionDataErrorSchema
>;

export const makeUserGetRouteResponse = (args: UserGetRouteResponse) => args;
