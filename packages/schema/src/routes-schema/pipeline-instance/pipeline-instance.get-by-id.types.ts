import { z } from "zod/v4";
import { PipelineInstanceSchema } from "../../db-schema/pipeline-instance";
import { StepSchema } from "../../db-schema/step";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

const PIPELINE_INSTANCE_GET_BY_ID_ROUTE_PATH =
	"/api/pipeline-instance/get-by-id";

const PipelineInstanceGetByIdRequestSchema = z.object({
	id: z.string(),
});

const PipelineInstanceGetByIdActionDataErrorSchema = ActionDataSchema(
	PipelineInstanceGetByIdRequestSchema,
	"error",
	PIPELINE_INSTANCE_GET_BY_ID_ROUTE_PATH,
);
const PipelineInstanceGetByIdActionDataSuccessSchema = ActionDataSchema(
	PipelineInstanceSchema.extend({
		steps: z.array(StepSchema),
	}),
	"ok",
	PIPELINE_INSTANCE_GET_BY_ID_ROUTE_PATH,
);

export type PipelineInstanceGetByIdRouteResponse = RouteResponse<
	typeof PipelineInstanceGetByIdActionDataSuccessSchema,
	typeof PipelineInstanceGetByIdActionDataErrorSchema
>;

export const PIPELINE_INSTANCE_GET_BY_ID_ROUTE = {
	path: PIPELINE_INSTANCE_GET_BY_ID_ROUTE_PATH,
	method: "POST",
	request: PipelineInstanceGetByIdRequestSchema,
	response: z.union([
		PipelineInstanceGetByIdActionDataSuccessSchema,
		PipelineInstanceGetByIdActionDataErrorSchema,
	]),
	createRouteResponse: (
		args: Omit<PipelineInstanceGetByIdRouteResponse, "key">,
	) => {
		return {
			...args,
			key: PIPELINE_INSTANCE_GET_BY_ID_ROUTE.path,
		};
	},
} as const;
