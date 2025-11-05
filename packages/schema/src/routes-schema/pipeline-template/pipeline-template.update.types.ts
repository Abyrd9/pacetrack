import { z } from "zod/v4";
import { PipelineTemplateSchema } from "../../db-schema/pipeline-template";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

const PipelineTemplateUpdateRequestSchema = z.object({
	id: z.string(),
	name: z.string().min(1, { message: "Name is required" }).optional(),
	description: z.string().optional(),
	status: PipelineTemplateSchema.pick({ status: true }).shape.status.optional(),
	icon: z.string().optional(),
	iconColor: z.string().optional(),
});

const PIPELINE_TEMPLATE_UPDATE_ROUTE_PATH = "/api/pipeline-template/update";

const PipelineTemplateUpdateActionDataErrorSchema = ActionDataSchema(
	PipelineTemplateUpdateRequestSchema,
	"error",
	PIPELINE_TEMPLATE_UPDATE_ROUTE_PATH,
);
const PipelineTemplateUpdateActionDataSuccessSchema = ActionDataSchema(
	PipelineTemplateSchema,
	"ok",
	PIPELINE_TEMPLATE_UPDATE_ROUTE_PATH,
);

export type PipelineTemplateUpdateRouteResponse = RouteResponse<
	typeof PipelineTemplateUpdateActionDataSuccessSchema,
	typeof PipelineTemplateUpdateActionDataErrorSchema
>;

export const PIPELINE_TEMPLATE_UPDATE_ROUTE = {
	path: PIPELINE_TEMPLATE_UPDATE_ROUTE_PATH,
	method: "POST",
	request: PipelineTemplateUpdateRequestSchema,
	response: z.union([
		PipelineTemplateUpdateActionDataSuccessSchema,
		PipelineTemplateUpdateActionDataErrorSchema,
	]),
	createRouteResponse: (
		args: Omit<PipelineTemplateUpdateRouteResponse, "key">,
	) => {
		return {
			...args,
			key: PIPELINE_TEMPLATE_UPDATE_ROUTE.path,
		};
	},
} as const;
