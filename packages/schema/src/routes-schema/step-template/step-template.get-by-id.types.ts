import { z } from "zod/v4";
import { StepTemplateSchema } from "../../db-schema/step-template";
import { ActionDataSchema, type RouteResponse } from "../../types/generics";

const STEP_TEMPLATE_GET_BY_ID_ROUTE_PATH = "/api/step-template/get-by-id";

const StepTemplateGetByIdRequestSchema = z.object({
	id: z.string(),
});

const StepTemplateGetByIdActionDataErrorSchema = ActionDataSchema(
	StepTemplateGetByIdRequestSchema,
	"error",
	STEP_TEMPLATE_GET_BY_ID_ROUTE_PATH,
);
const StepTemplateGetByIdActionDataSuccessSchema = ActionDataSchema(
	StepTemplateSchema,
	"ok",
	STEP_TEMPLATE_GET_BY_ID_ROUTE_PATH,
);

export type StepTemplateGetByIdRouteResponse = RouteResponse<
	typeof StepTemplateGetByIdActionDataSuccessSchema,
	typeof StepTemplateGetByIdActionDataErrorSchema
>;

export const STEP_TEMPLATE_GET_BY_ID_ROUTE = {
	path: STEP_TEMPLATE_GET_BY_ID_ROUTE_PATH,
	method: "POST",
	request: StepTemplateGetByIdRequestSchema,
	response: z.union([
		StepTemplateGetByIdActionDataSuccessSchema,
		StepTemplateGetByIdActionDataErrorSchema,
	]),
	createRouteResponse: (
		args: Omit<StepTemplateGetByIdRouteResponse, "key">,
	) => {
		return {
			...args,
			key: STEP_TEMPLATE_GET_BY_ID_ROUTE.path,
		};
	},
} as const;
