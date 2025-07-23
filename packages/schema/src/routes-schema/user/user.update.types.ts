import { z } from "zod/v4";
import { UserSchema } from "../../db-schema/user";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

export const UserUpdateRequestSchema = UserSchema.pick({
  id: true,
  display_name: true,
  image_url: true,
}).extend({
  id: z.string(),
  display_name: z.string().optional(),
  image_url: z
    .file()
    .max(1024 * 1024 * 25, {
      message: "Image must be less than 25MB",
    })
    .mime(["image/png", "image/webp", "image/jpeg"])
    .optional(),
});

export const USER_UPDATE_ROUTE_PATH = "/api/user/update";

export const UserUpdateActionDataErrorSchema = ActionDataSchema(
  UserUpdateRequestSchema,
  "error",
  USER_UPDATE_ROUTE_PATH
);
export const UserUpdateActionDataSuccessSchema = ActionDataSchema(
  UserSchema,
  "ok",
  USER_UPDATE_ROUTE_PATH
);

export type UserUpdateRouteResponse = RouteResponse<
  typeof UserUpdateActionDataSuccessSchema,
  typeof UserUpdateActionDataErrorSchema
>;

export const makeUserUpdateRouteResponse = (args: UserUpdateRouteResponse) =>
  args;
