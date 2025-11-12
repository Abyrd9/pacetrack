import { z } from "zod/v4";
import { ItemTemplateSchema } from "../../db-schema/item-template";
import { PipelineTemplateSchema } from "../../db-schema/pipeline-template";
import { StepTemplateSchema } from "../../db-schema/step-template";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

const PIPELINE_TEMPLATE_GET_BY_ID_ROUTE_PATH =
	"/api/pipeline-template/get-by-id";

const PipelineTemplateGetByIdRequestSchema = z.object({
	id: z.string(),
});

const PipelineTemplateGetByIdActionDataErrorSchema = ActionDataSchema(
	PipelineTemplateGetByIdRequestSchema,
	"error",
	PIPELINE_TEMPLATE_GET_BY_ID_ROUTE_PATH,
);
const PipelineTemplateGetByIdActionDataSuccessSchema = ActionDataSchema(
	PipelineTemplateSchema.extend({
		step_templates: z.array(StepTemplateSchema),
		item_template: ItemTemplateSchema,
	}),
	"ok",
	PIPELINE_TEMPLATE_GET_BY_ID_ROUTE_PATH,
);

export type PipelineTemplateGetByIdRouteResponse = RouteResponse<
	typeof PipelineTemplateGetByIdActionDataSuccessSchema,
	typeof PipelineTemplateGetByIdActionDataErrorSchema
>;

export const PIPELINE_TEMPLATE_GET_BY_ID_ROUTE = {
	path: PIPELINE_TEMPLATE_GET_BY_ID_ROUTE_PATH,
	method: "POST",
	request: PipelineTemplateGetByIdRequestSchema,
	response: z.union([
		PipelineTemplateGetByIdActionDataSuccessSchema,
		PipelineTemplateGetByIdActionDataErrorSchema,
	]),
	createRouteResponse: (
		args: Omit<PipelineTemplateGetByIdRouteResponse, "key">,
	) => {
		return {
			...args,
			key: PIPELINE_TEMPLATE_GET_BY_ID_ROUTE.path,
		};
	},
} as const;
