import { z } from "zod/v4";
import { StepTemplateSchema } from "../../db-schema/step-template";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

const STEP_TEMPLATE_GET_ROUTE_PATH = "/api/step-template/get";

const StepTemplateGetRequestSchema = z.object({
	pipeline_template_id: z.string().optional(),
});

const StepTemplateGetActionDataErrorSchema = ActionDataSchema(
	z.object({
		global: z.string(),
	}),
	"error",
	STEP_TEMPLATE_GET_ROUTE_PATH,
);

const StepTemplateGetActionDataSuccessSchema = ActionDataSchema(
	z.object({
		steps: z.array(StepTemplateSchema),
	}),
	"ok",
	STEP_TEMPLATE_GET_ROUTE_PATH,
);

export type StepTemplateGetRouteResponse = RouteResponse<
	typeof StepTemplateGetActionDataSuccessSchema,
	typeof StepTemplateGetActionDataErrorSchema
>;

export const STEP_TEMPLATE_GET_ROUTE = {
	path: STEP_TEMPLATE_GET_ROUTE_PATH,
	method: "POST",
	request: StepTemplateGetRequestSchema,
	response: z.union([
		StepTemplateGetActionDataSuccessSchema,
		StepTemplateGetActionDataErrorSchema,
	]),
	createRouteResponse: (args: Omit<StepTemplateGetRouteResponse, "key">) => {
		return {
			...args,
			key: STEP_TEMPLATE_GET_ROUTE.path,
		};
	},
} as const;
