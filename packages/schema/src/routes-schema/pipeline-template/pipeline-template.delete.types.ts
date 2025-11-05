import { z } from "zod/v4";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

const PIPELINE_TEMPLATE_DELETE_ROUTE_PATH = "/api/pipeline-template/delete";

const PipelineTemplateDeleteRequestSchema = z.object({
	id: z.string(),
});

const PipelineTemplateDeleteActionDataErrorSchema = ActionDataSchema(
	PipelineTemplateDeleteRequestSchema,
	"error",
	PIPELINE_TEMPLATE_DELETE_ROUTE_PATH,
);

const PipelineTemplateDeleteActionDataSuccessSchema = ActionDataSchema(
	z.object({ message: z.string() }),
	"ok",
	PIPELINE_TEMPLATE_DELETE_ROUTE_PATH,
);

export type PipelineTemplateDeleteRouteResponse = RouteResponse<
	typeof PipelineTemplateDeleteActionDataSuccessSchema,
	typeof PipelineTemplateDeleteActionDataErrorSchema
>;

export const PIPELINE_TEMPLATE_DELETE_ROUTE = {
	path: PIPELINE_TEMPLATE_DELETE_ROUTE_PATH,
	method: "POST",
	request: PipelineTemplateDeleteRequestSchema,
	response: z.union([
		PipelineTemplateDeleteActionDataSuccessSchema,
		PipelineTemplateDeleteActionDataErrorSchema,
	]),
	createRouteResponse: (
		args: Omit<PipelineTemplateDeleteRouteResponse, "key">,
	) => {
		return {
			...args,
			key: PIPELINE_TEMPLATE_DELETE_ROUTE.path,
		};
	},
} as const;
