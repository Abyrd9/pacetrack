import { z } from "zod/v4";
import { PipelineTemplateSchema } from "../../db-schema/pipeline-template";
import { StepTemplateSchema } from "../../db-schema/step-template";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";
import { STEP_TEMPLATE_CREATE_ROUTE } from "../step-template/step-template.create.types";

const PipelineTemplateCreateRequestSchema = z.object({
	name: z.string({ error: "Name is required" }).min(1, {
		message: "Name is required",
	}),
	description: z.string().optional(),
	icon: z.string().optional(),
	iconColor: z.string().optional(),
	step_templates: z
		.array(
			STEP_TEMPLATE_CREATE_ROUTE.request.omit({ pipeline_template_id: true }),
		)
		.default([]),
});

const PIPELINE_TEMPLATE_CREATE_ROUTE_PATH = "/api/pipeline-template/create";

const PipelineTemplateCreateActionDataErrorSchema = ActionDataSchema(
	PipelineTemplateCreateRequestSchema,
	"error",
	PIPELINE_TEMPLATE_CREATE_ROUTE_PATH,
);
const PipelineTemplateCreateActionDataSuccessSchema = ActionDataSchema(
	PipelineTemplateSchema.extend({
		step_templates: z.array(StepTemplateSchema),
	}),
	"ok",
	PIPELINE_TEMPLATE_CREATE_ROUTE_PATH,
);

export type PipelineTemplateCreateRouteResponse = RouteResponse<
	typeof PipelineTemplateCreateActionDataSuccessSchema,
	typeof PipelineTemplateCreateActionDataErrorSchema
>;

export const PIPELINE_TEMPLATE_CREATE_ROUTE = {
	path: PIPELINE_TEMPLATE_CREATE_ROUTE_PATH,
	method: "POST",
	request: PipelineTemplateCreateRequestSchema,
	response: z.union([
		PipelineTemplateCreateActionDataSuccessSchema,
		PipelineTemplateCreateActionDataErrorSchema,
	]),
	createRouteResponse: (
		args: Omit<PipelineTemplateCreateRouteResponse, "key">,
	) => {
		return {
			...args,
			key: PIPELINE_TEMPLATE_CREATE_ROUTE.path,
		};
	},
} as const;
