import { z } from "zod/v4";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

const PIPELINE_INSTANCE_DELETE_ROUTE_PATH = "/api/pipeline-instance/delete";

const PipelineInstanceDeleteRequestSchema = z.object({
	id: z.string(),
});

const PipelineInstanceDeleteActionDataErrorSchema = ActionDataSchema(
	PipelineInstanceDeleteRequestSchema,
	"error",
	PIPELINE_INSTANCE_DELETE_ROUTE_PATH,
);

const PipelineInstanceDeleteActionDataSuccessSchema = ActionDataSchema(
	z.object({ message: z.string() }),
	"ok",
	PIPELINE_INSTANCE_DELETE_ROUTE_PATH,
);

export type PipelineInstanceDeleteRouteResponse = RouteResponse<
	typeof PipelineInstanceDeleteActionDataSuccessSchema,
	typeof PipelineInstanceDeleteActionDataErrorSchema
>;

export const PIPELINE_INSTANCE_DELETE_ROUTE = {
	path: PIPELINE_INSTANCE_DELETE_ROUTE_PATH,
	method: "POST",
	request: PipelineInstanceDeleteRequestSchema,
	response: z.union([
		PipelineInstanceDeleteActionDataSuccessSchema,
		PipelineInstanceDeleteActionDataErrorSchema,
	]),
	createRouteResponse: (
		args: Omit<PipelineInstanceDeleteRouteResponse, "key">,
	) => {
		return {
			...args,
			key: PIPELINE_INSTANCE_DELETE_ROUTE.path,
		};
	},
} as const;
