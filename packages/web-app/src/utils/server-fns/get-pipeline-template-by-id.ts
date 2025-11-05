import {
	PIPELINE_TEMPLATE_GET_BY_ID_ROUTE,
	type PipelineTemplate,
	type PipelineTemplateGetByIdRouteResponse,
} from "@pacetrack/schema";
import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { client } from "../helpers/api-client";

export const getPipelineTemplateByIdServerFn = createServerFn({
	method: "POST",
})
	.inputValidator(PIPELINE_TEMPLATE_GET_BY_ID_ROUTE.request)
	.handler(async (ctx) => {
		const request = await getRequest();
		const resp = await client(
			"PIPELINE_TEMPLATE_GET_BY_ID_ROUTE",
			{
				body: ctx.data,
			},
			request,
		);

		if (resp.data.status === "error") {
			throw new Error("Failed to get pipeline template");
		}

		return resp.data.payload;
	});

export const getPipelineTemplateByIdQueryOptions = (
	id: string,
	initialData?: PipelineTemplateGetByIdRouteResponse["payload"],
) =>
	queryOptions({
		queryKey: [PIPELINE_TEMPLATE_GET_BY_ID_ROUTE.path, id],
		queryFn: () => getPipelineTemplateByIdServerFn({ data: { id } }),
		initialData: initialData,
	});
