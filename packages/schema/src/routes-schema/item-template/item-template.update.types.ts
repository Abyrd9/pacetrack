import { z } from "zod/v4";
import { ItemTemplateSchema } from "../../db-schema/item-template";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

const ItemTemplateUpdateRequestSchema = z.object({
	id: z.string(),
	name: z.string().min(1, { message: "Name is required" }).optional(),
	description: z.string().optional(),
	initial_step_index: z.number().int().min(0).optional(),
	version: z.number().int().min(1).optional(),
});

const ITEM_TEMPLATE_UPDATE_ROUTE_PATH = "/api/item-template/update";

const ItemTemplateUpdateActionDataErrorSchema = ActionDataSchema(
	ItemTemplateUpdateRequestSchema,
	"error",
	ITEM_TEMPLATE_UPDATE_ROUTE_PATH,
);
const ItemTemplateUpdateActionDataSuccessSchema = ActionDataSchema(
	ItemTemplateSchema,
	"ok",
	ITEM_TEMPLATE_UPDATE_ROUTE_PATH,
);

export type ItemTemplateUpdateRouteResponse = RouteResponse<
	typeof ItemTemplateUpdateActionDataSuccessSchema,
	typeof ItemTemplateUpdateActionDataErrorSchema
>;

export const ITEM_TEMPLATE_UPDATE_ROUTE = {
	path: ITEM_TEMPLATE_UPDATE_ROUTE_PATH,
	method: "POST",
	request: ItemTemplateUpdateRequestSchema,
	response: z.union([
		ItemTemplateUpdateActionDataSuccessSchema,
		ItemTemplateUpdateActionDataErrorSchema,
	]),
	createRouteResponse: (args: Omit<ItemTemplateUpdateRouteResponse, "key">) => {
		return {
			...args,
			key: ITEM_TEMPLATE_UPDATE_ROUTE.path,
		};
	},
} as const;
