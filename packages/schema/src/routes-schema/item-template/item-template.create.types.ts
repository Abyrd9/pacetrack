import { z } from "zod/v4";
import { FieldsDefinitionSchema } from "../../config-schemas/fields";
import { ItemTemplateSchema } from "../../db-schema/item-template";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

const ItemTemplateCreateRequestSchema = z.object({
	name: z.string({ error: "Name is required" }).min(1, {
		message: "Name is required",
	}),
	description: z.string().optional(),
	pipeline_template_id: z
		.string({ error: "Pipeline template ID is required" })
		.min(1, {
			message: "Pipeline template ID is required",
		}),
	initial_step_index: z
		.number({ error: "Initial step index is required" })
		.int()
		.min(0, {
			message: "Initial step index must be 0 or greater",
		})
		.default(0),
	fields_definition: FieldsDefinitionSchema.optional(),
});

const ITEM_TEMPLATE_CREATE_ROUTE_PATH = "/api/item-template/create";

const ItemTemplateCreateActionDataErrorSchema = ActionDataSchema(
	ItemTemplateCreateRequestSchema,
	"error",
	ITEM_TEMPLATE_CREATE_ROUTE_PATH,
);
const ItemTemplateCreateActionDataSuccessSchema = ActionDataSchema(
	ItemTemplateSchema,
	"ok",
	ITEM_TEMPLATE_CREATE_ROUTE_PATH,
);

export type ItemTemplateCreateRouteResponse = RouteResponse<
	typeof ItemTemplateCreateActionDataSuccessSchema,
	typeof ItemTemplateCreateActionDataErrorSchema
>;

export const ITEM_TEMPLATE_CREATE_ROUTE = {
	path: ITEM_TEMPLATE_CREATE_ROUTE_PATH,
	method: "POST",
	request: ItemTemplateCreateRequestSchema,
	response: z.union([
		ItemTemplateCreateActionDataSuccessSchema,
		ItemTemplateCreateActionDataErrorSchema,
	]),
	createRouteResponse: (args: Omit<ItemTemplateCreateRouteResponse, "key">) => {
		return {
			...args,
			key: ITEM_TEMPLATE_CREATE_ROUTE.path,
		};
	},
} as const;
