import { z } from "zod/v4";
import { RoleSchema } from "../../db-schema/role";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

export const USER_GET_ROLES_ROUTE_PATH = "/api/user/get-roles";

export const UserGetRolesActionDataErrorSchema = ActionDataSchema(
  z.object({
    global: z.string().optional(),
  }),
  "error",
  USER_GET_ROLES_ROUTE_PATH
);

export const UserGetRolesActionDataSuccessSchema = ActionDataSchema(
  z.object({
    roles: z.record(z.string(), z.array(RoleSchema)),
  }),
  "ok",
  USER_GET_ROLES_ROUTE_PATH
);

export type UserGetRolesRouteResponse = RouteResponse<
  typeof UserGetRolesActionDataSuccessSchema,
  typeof UserGetRolesActionDataErrorSchema
>;

export const makeUserGetRolesRouteResponse = (
  args: UserGetRolesRouteResponse
) => args;
