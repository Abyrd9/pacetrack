import { z } from "zod/v4";
import { ItemTemplateSchema } from "../../db-schema/item-template";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

const ItemTemplateGetByIdRequestSchema = z.object({
	id: z.string({ error: "ID is required" }),
});

const ITEM_TEMPLATE_GET_BY_ID_ROUTE_PATH = "/api/item-template/get-by-id";

const ItemTemplateGetByIdActionDataErrorSchema = ActionDataSchema(
	ItemTemplateGetByIdRequestSchema,
	"error",
	ITEM_TEMPLATE_GET_BY_ID_ROUTE_PATH,
);
const ItemTemplateGetByIdActionDataSuccessSchema = ActionDataSchema(
	ItemTemplateSchema,
	"ok",
	ITEM_TEMPLATE_GET_BY_ID_ROUTE_PATH,
);

export type ItemTemplateGetByIdRouteResponse = RouteResponse<
	typeof ItemTemplateGetByIdActionDataSuccessSchema,
	typeof ItemTemplateGetByIdActionDataErrorSchema
>;

export const ITEM_TEMPLATE_GET_BY_ID_ROUTE = {
	path: ITEM_TEMPLATE_GET_BY_ID_ROUTE_PATH,
	method: "POST",
	request: ItemTemplateGetByIdRequestSchema,
	response: z.union([
		ItemTemplateGetByIdActionDataSuccessSchema,
		ItemTemplateGetByIdActionDataErrorSchema,
	]),
	createRouteResponse: (
		args: Omit<ItemTemplateGetByIdRouteResponse, "key">,
	) => {
		return {
			...args,
			key: ITEM_TEMPLATE_GET_BY_ID_ROUTE.path,
		};
	},
} as const;
