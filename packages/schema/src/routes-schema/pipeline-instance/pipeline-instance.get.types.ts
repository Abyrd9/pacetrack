import { z } from "zod/v4";
import { PipelineInstanceSchema } from "../../db-schema/pipeline-instance";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

const PIPELINE_INSTANCE_GET_ROUTE_PATH = "/api/pipeline-instance/get";

const PipelineInstanceGetRequestSchema = z.object({
	search: z.string().optional(),
	status: PipelineInstanceSchema.pick({ status: true }).shape.status.optional(),
	page: z.coerce.number().int().positive().optional(),
	perPage: z.coerce.number().int().positive().max(100).optional(),
});

const PipelineInstanceGetActionDataErrorSchema = ActionDataSchema(
	PipelineInstanceGetRequestSchema,
	"error",
	PIPELINE_INSTANCE_GET_ROUTE_PATH,
);

const PipelineInstanceGetActionDataSuccessSchema = ActionDataSchema(
	z.object({
		instances: z.array(PipelineInstanceSchema),
		pagination: z
			.object({
				total: z.number(),
				page: z.number(),
				perPage: z.number(),
				totalPages: z.number(),
			})
			.optional(),
	}),
	"ok",
	PIPELINE_INSTANCE_GET_ROUTE_PATH,
);

export type PipelineInstanceGetRouteResponse = RouteResponse<
	typeof PipelineInstanceGetActionDataSuccessSchema,
	typeof PipelineInstanceGetActionDataErrorSchema
>;

export const PIPELINE_INSTANCE_GET_ROUTE = {
	path: PIPELINE_INSTANCE_GET_ROUTE_PATH,
	method: "POST",
	request: PipelineInstanceGetRequestSchema,
	response: z.union([
		PipelineInstanceGetActionDataSuccessSchema,
		PipelineInstanceGetActionDataErrorSchema,
	]),
	createRouteResponse: (
		args: Omit<PipelineInstanceGetRouteResponse, "key">,
	) => {
		return {
			...args,
			key: PIPELINE_INSTANCE_GET_ROUTE.path,
		};
	},
} as const;
