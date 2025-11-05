import { z } from "zod/v4";
import { StepTemplateSchema } from "../../db-schema/step-template";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

const StepTemplateUpdateRequestSchema = z.object({
	id: z.string(),
	name: z.string().min(1, { message: "Name is required" }).optional(),
	description: z.string().optional(),
	order: z.number().int().min(0).optional(),
	target_duration_days: z.number().int().min(0).optional(),
	color: z.string().optional(),
	icon: z.string().optional(),
	iconColor: z.string().optional(),
});

const STEP_TEMPLATE_UPDATE_ROUTE_PATH = "/api/step-template/update";

const StepTemplateUpdateActionDataErrorSchema = ActionDataSchema(
	StepTemplateUpdateRequestSchema,
	"error",
	STEP_TEMPLATE_UPDATE_ROUTE_PATH,
);
const StepTemplateUpdateActionDataSuccessSchema = ActionDataSchema(
	StepTemplateSchema,
	"ok",
	STEP_TEMPLATE_UPDATE_ROUTE_PATH,
);

export type StepTemplateUpdateRouteResponse = RouteResponse<
	typeof StepTemplateUpdateActionDataSuccessSchema,
	typeof StepTemplateUpdateActionDataErrorSchema
>;

export const STEP_TEMPLATE_UPDATE_ROUTE = {
	path: STEP_TEMPLATE_UPDATE_ROUTE_PATH,
	method: "POST",
	request: StepTemplateUpdateRequestSchema,
	response: z.union([
		StepTemplateUpdateActionDataSuccessSchema,
		StepTemplateUpdateActionDataErrorSchema,
	]),
	createRouteResponse: (args: Omit<StepTemplateUpdateRouteResponse, "key">) => {
		return {
			...args,
			key: STEP_TEMPLATE_UPDATE_ROUTE.path,
		};
	},
} as const;
