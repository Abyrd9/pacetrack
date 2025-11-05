import { z } from "zod/v4";
import { PipelineInstanceSchema } from "../../db-schema/pipeline-instance";
import { StepSchema } from "../../db-schema/step";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

const PipelineInstanceCreateRequestSchema = z.object({
	name: z.string({ error: "Name is required" }).min(1, {
		message: "Name is required",
	}),
	pipeline_template_id: z
		.string({ error: "Pipeline template ID is required" })
		.min(1, {
			message: "Pipeline template ID is required",
		}),
});

const PIPELINE_INSTANCE_CREATE_ROUTE_PATH = "/api/pipeline-instance/create";

const PipelineInstanceCreateActionDataErrorSchema = ActionDataSchema(
	PipelineInstanceCreateRequestSchema,
	"error",
	PIPELINE_INSTANCE_CREATE_ROUTE_PATH,
);
const PipelineInstanceCreateActionDataSuccessSchema = ActionDataSchema(
	PipelineInstanceSchema.extend({
		steps: z.array(StepSchema),
	}),
	"ok",
	PIPELINE_INSTANCE_CREATE_ROUTE_PATH,
);

export type PipelineInstanceCreateRouteResponse = RouteResponse<
	typeof PipelineInstanceCreateActionDataSuccessSchema,
	typeof PipelineInstanceCreateActionDataErrorSchema
>;

export const PIPELINE_INSTANCE_CREATE_ROUTE = {
	path: PIPELINE_INSTANCE_CREATE_ROUTE_PATH,
	method: "POST",
	request: PipelineInstanceCreateRequestSchema,
	response: z.union([
		PipelineInstanceCreateActionDataSuccessSchema,
		PipelineInstanceCreateActionDataErrorSchema,
	]),
	createRouteResponse: (
		args: Omit<PipelineInstanceCreateRouteResponse, "key">,
	) => {
		return {
			...args,
			key: PIPELINE_INSTANCE_CREATE_ROUTE.path,
		};
	},
} as const;
