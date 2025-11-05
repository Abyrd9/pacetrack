import { z } from "zod/v4";
import { StepTemplateSchema } from "../../db-schema/step-template";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

const StepTemplateCreateRequestSchema = z.object({
	name: z.string({ error: "Name is required" }).min(1, {
		message: "Name is required",
	}),
	description: z.coerce.string().optional().default(""),
	pipeline_template_id: z
		.string({ error: "Pipeline template ID is required" })
		.min(1, {
			message: "Pipeline template ID is required",
		}),
	order: z.number({ error: "Order is required" }).int().min(0),
	target_duration_days: z.coerce.number().int().min(0).optional().default(0),
	color: z.string().optional(),
	icon: z.string().optional(),
	iconColor: z.string().optional(),
});

const STEP_TEMPLATE_CREATE_ROUTE_PATH = "/api/step-template/create";

const StepTemplateCreateActionDataErrorSchema = ActionDataSchema(
	StepTemplateCreateRequestSchema,
	"error",
	STEP_TEMPLATE_CREATE_ROUTE_PATH,
);
const StepTemplateCreateActionDataSuccessSchema = ActionDataSchema(
	StepTemplateSchema,
	"ok",
	STEP_TEMPLATE_CREATE_ROUTE_PATH,
);

export type StepTemplateCreateRouteResponse = RouteResponse<
	typeof StepTemplateCreateActionDataSuccessSchema,
	typeof StepTemplateCreateActionDataErrorSchema
>;

export const STEP_TEMPLATE_CREATE_ROUTE = {
	path: STEP_TEMPLATE_CREATE_ROUTE_PATH,
	method: "POST",
	request: StepTemplateCreateRequestSchema,
	response: z.union([
		StepTemplateCreateActionDataSuccessSchema,
		StepTemplateCreateActionDataErrorSchema,
	]),
	createRouteResponse: (args: Omit<StepTemplateCreateRouteResponse, "key">) => {
		return {
			...args,
			key: STEP_TEMPLATE_CREATE_ROUTE.path,
		};
	},
} as const;
