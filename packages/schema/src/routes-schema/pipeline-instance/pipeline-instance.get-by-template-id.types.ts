import { z } from "zod/v4";
import { PipelineInstanceSchema } from "../../db-schema/pipeline-instance";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

const PIPELINE_INSTANCE_GET_BY_TEMPLATE_ID_ROUTE_PATH =
	"/api/pipeline-instance/get-by-template-id";

const PipelineInstanceGetByTemplateIdRequestSchema = z.object({
	search: z.string().optional(),
	pipeline_template_id: z
		.string({ error: "Pipeline template ID is required" })
		.min(1, { message: "Pipeline template ID is required" }),
	status: PipelineInstanceSchema.pick({ status: true }).shape.status.optional(),
});

const PipelineInstanceGetByTemplateIdActionDataErrorSchema = ActionDataSchema(
	PipelineInstanceGetByTemplateIdRequestSchema,
	"error",
	PIPELINE_INSTANCE_GET_BY_TEMPLATE_ID_ROUTE_PATH,
);

const PipelineInstanceGetByTemplateIdActionDataSuccessSchema = ActionDataSchema(
	z.array(PipelineInstanceSchema),
	"ok",
	PIPELINE_INSTANCE_GET_BY_TEMPLATE_ID_ROUTE_PATH,
);

export type PipelineInstanceGetByTemplateIdRouteResponse = RouteResponse<
	typeof PipelineInstanceGetByTemplateIdActionDataSuccessSchema,
	typeof PipelineInstanceGetByTemplateIdActionDataErrorSchema
>;

export const PIPELINE_INSTANCE_GET_BY_TEMPLATE_ID_ROUTE = {
	path: PIPELINE_INSTANCE_GET_BY_TEMPLATE_ID_ROUTE_PATH,
	method: "POST",
	request: PipelineInstanceGetByTemplateIdRequestSchema,
	response: z.union([
		PipelineInstanceGetByTemplateIdActionDataSuccessSchema,
		PipelineInstanceGetByTemplateIdActionDataErrorSchema,
	]),
	createRouteResponse: (
		args: Omit<PipelineInstanceGetByTemplateIdRouteResponse, "key">,
	) => {
		return {
			...args,
			key: PIPELINE_INSTANCE_GET_BY_TEMPLATE_ID_ROUTE.path,
		};
	},
} as const;
