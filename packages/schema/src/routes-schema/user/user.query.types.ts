import { z } from "zod/v4";
import { UserSchema } from "../../db-schema/user";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

export const UserQueryRequestSchema = z.object({
  term: z.string().min(1),
  page: z.coerce.number().int().positive().optional(),
  perPage: z.coerce.number().int().positive().max(100).optional(),
});

export const USER_QUERY_ROUTE_PATH = "/api/user/query";

export const UserQueryActionDataErrorSchema = ActionDataSchema(
  UserQueryRequestSchema,
  "error",
  USER_QUERY_ROUTE_PATH
);

export const UserQueryActionDataSuccessSchema = ActionDataSchema(
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
  USER_QUERY_ROUTE_PATH
);

export type UserQueryRouteResponse = RouteResponse<
  typeof UserQueryActionDataSuccessSchema,
  typeof UserQueryActionDataErrorSchema
>;

export const makeUserQueryRouteResponse = (args: UserQueryRouteResponse) =>
  args;
