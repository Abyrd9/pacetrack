import { z } from "zod/v4";
import { ItemTemplateSchema } from "../../db-schema/item-template";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

const ItemTemplateDeleteRequestSchema = z.object({
	id: z.string({ error: "ID is required" }),
});

const ITEM_TEMPLATE_DELETE_ROUTE_PATH = "/api/item-template/delete";

const ItemTemplateDeleteActionDataErrorSchema = ActionDataSchema(
	ItemTemplateDeleteRequestSchema,
	"error",
	ITEM_TEMPLATE_DELETE_ROUTE_PATH,
);
const ItemTemplateDeleteActionDataSuccessSchema = ActionDataSchema(
	ItemTemplateSchema,
	"ok",
	ITEM_TEMPLATE_DELETE_ROUTE_PATH,
);

export type ItemTemplateDeleteRouteResponse = RouteResponse<
	typeof ItemTemplateDeleteActionDataSuccessSchema,
	typeof ItemTemplateDeleteActionDataErrorSchema
>;

export const ITEM_TEMPLATE_DELETE_ROUTE = {
	path: ITEM_TEMPLATE_DELETE_ROUTE_PATH,
	method: "POST",
	request: ItemTemplateDeleteRequestSchema,
	response: z.union([
		ItemTemplateDeleteActionDataSuccessSchema,
		ItemTemplateDeleteActionDataErrorSchema,
	]),
	createRouteResponse: (args: Omit<ItemTemplateDeleteRouteResponse, "key">) => {
		return {
			...args,
			key: ITEM_TEMPLATE_DELETE_ROUTE.path,
		};
	},
} as const;
