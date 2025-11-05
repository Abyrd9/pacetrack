import { z } from "zod/v4";
import { StepSchema } from "../../db-schema/step";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

const STEP_GET_ROUTE_PATH = "/api/step/get";

const StepGetRequestSchema = z.object({
	pipeline_template_id: z.string().optional(),
});

const StepGetActionDataErrorSchema = ActionDataSchema(
	z.object({
		global: z.string(),
	}),
	"error",
	STEP_GET_ROUTE_PATH,
);

const StepGetActionDataSuccessSchema = ActionDataSchema(
	z.object({
		steps: z.array(StepSchema),
	}),
	"ok",
	STEP_GET_ROUTE_PATH,
);

export type StepGetRouteResponse = RouteResponse<
	typeof StepGetActionDataSuccessSchema,
	typeof StepGetActionDataErrorSchema
>;

export const STEP_GET_ROUTE = {
	path: STEP_GET_ROUTE_PATH,
	method: "GET",
	request: StepGetRequestSchema,
	response: z.union([
		StepGetActionDataSuccessSchema,
		StepGetActionDataErrorSchema,
	]),
	createRouteResponse: (args: Omit<StepGetRouteResponse, "key">) => {
		return {
			...args,
			key: STEP_GET_ROUTE.path,
		};
	},
} as const;
