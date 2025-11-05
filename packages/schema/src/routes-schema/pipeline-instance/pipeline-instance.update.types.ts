import { z } from "zod/v4";
import { PipelineInstanceSchema } from "../../db-schema/pipeline-instance";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

const PipelineInstanceUpdateRequestSchema = z.object({
	id: z.string(),
	name: z.string().min(1, { message: "Name is required" }).optional(),
	start_date: z.coerce.date().optional(), // This would only need to be updated if there was an accidental instance creation
	end_date: z.coerce.date().optional(),
	status: PipelineInstanceSchema.pick({ status: true }).shape.status.optional(),
});

const PIPELINE_INSTANCE_UPDATE_ROUTE_PATH = "/api/pipeline-instance/update";

const PipelineInstanceUpdateActionDataErrorSchema = ActionDataSchema(
	PipelineInstanceUpdateRequestSchema,
	"error",
	PIPELINE_INSTANCE_UPDATE_ROUTE_PATH,
);
const PipelineInstanceUpdateActionDataSuccessSchema = ActionDataSchema(
	PipelineInstanceSchema,
	"ok",
	PIPELINE_INSTANCE_UPDATE_ROUTE_PATH,
);

export type PipelineInstanceUpdateRouteResponse = RouteResponse<
	typeof PipelineInstanceUpdateActionDataSuccessSchema,
	typeof PipelineInstanceUpdateActionDataErrorSchema
>;

export const PIPELINE_INSTANCE_UPDATE_ROUTE = {
	path: PIPELINE_INSTANCE_UPDATE_ROUTE_PATH,
	method: "POST",
	request: PipelineInstanceUpdateRequestSchema,
	response: z.union([
		PipelineInstanceUpdateActionDataSuccessSchema,
		PipelineInstanceUpdateActionDataErrorSchema,
	]),
	createRouteResponse: (
		args: Omit<PipelineInstanceUpdateRouteResponse, "key">,
	) => {
		return {
			...args,
			key: PIPELINE_INSTANCE_UPDATE_ROUTE.path,
		};
	},
} as const;
