import { z } from "zod/v4";
import { PipelineTemplateSchema } from "../../db-schema/pipeline-template";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

const PIPELINE_TEMPLATE_GET_ROUTE_PATH = "/api/pipeline-template/get";

const PipelineTemplateGetRequestSchema = z.object({
	search: z.string().optional(),
});

const PipelineTemplateGetActionDataErrorSchema = ActionDataSchema(
	z.object({
		global: z.string(),
	}),
	"error",
	PIPELINE_TEMPLATE_GET_ROUTE_PATH,
);

const PipelineTemplateGetActionDataSuccessSchema = ActionDataSchema(
	z.object({
		templates: z.array(PipelineTemplateSchema),
	}),
	"ok",
	PIPELINE_TEMPLATE_GET_ROUTE_PATH,
);

export type PipelineTemplateGetRouteResponse = RouteResponse<
	typeof PipelineTemplateGetActionDataSuccessSchema,
	typeof PipelineTemplateGetActionDataErrorSchema
>;

export const PIPELINE_TEMPLATE_GET_ROUTE = {
	path: PIPELINE_TEMPLATE_GET_ROUTE_PATH,
	method: "POST",
	request: PipelineTemplateGetRequestSchema,
	response: z.union([
		PipelineTemplateGetActionDataSuccessSchema,
		PipelineTemplateGetActionDataErrorSchema,
	]),
	createRouteResponse: (
		args: Omit<PipelineTemplateGetRouteResponse, "key">,
	) => {
		return {
			...args,
			key: PIPELINE_TEMPLATE_GET_ROUTE.path,
		};
	},
} as const;
