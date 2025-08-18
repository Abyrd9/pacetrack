import { z } from "zod/v4";
import { AccountSchema } from "../../db-schema/account";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

export const AccountUpdateRequestSchema = z.object({
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

export const ACCOUNT_UPDATE_ROUTE_PATH = "/api/account/update";

export const AccountUpdateActionDataErrorSchema = ActionDataSchema(
	AccountUpdateRequestSchema,
	"error",
	ACCOUNT_UPDATE_ROUTE_PATH,
);
export const AccountUpdateActionDataSuccessSchema = ActionDataSchema(
	AccountSchema,
	"ok",
	ACCOUNT_UPDATE_ROUTE_PATH,
);

export type AccountUpdateRouteResponse = RouteResponse<
	typeof AccountUpdateActionDataSuccessSchema,
	typeof AccountUpdateActionDataErrorSchema
>;

export const makeAccountUpdateRouteResponse = (
	args: AccountUpdateRouteResponse,
) => args;
