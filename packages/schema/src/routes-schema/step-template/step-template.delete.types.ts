import { z } from "zod/v4";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

const STEP_TEMPLATE_DELETE_ROUTE_PATH = "/api/step-template/delete";

const StepTemplateDeleteRequestSchema = z.object({
	id: z.string(),
});

const StepTemplateDeleteActionDataErrorSchema = ActionDataSchema(
	StepTemplateDeleteRequestSchema,
	"error",
	STEP_TEMPLATE_DELETE_ROUTE_PATH,
);

const StepTemplateDeleteActionDataSuccessSchema = ActionDataSchema(
	z.object({ message: z.string() }),
	"ok",
	STEP_TEMPLATE_DELETE_ROUTE_PATH,
);

export type StepTemplateDeleteRouteResponse = RouteResponse<
	typeof StepTemplateDeleteActionDataSuccessSchema,
	typeof StepTemplateDeleteActionDataErrorSchema
>;

export const STEP_TEMPLATE_DELETE_ROUTE = {
	path: STEP_TEMPLATE_DELETE_ROUTE_PATH,
	method: "POST",
	request: StepTemplateDeleteRequestSchema,
	response: z.union([
		StepTemplateDeleteActionDataSuccessSchema,
		StepTemplateDeleteActionDataErrorSchema,
	]),
	createRouteResponse: (args: Omit<StepTemplateDeleteRouteResponse, "key">) => {
		return {
			...args,
			key: STEP_TEMPLATE_DELETE_ROUTE.path,
		};
	},
} as const;
