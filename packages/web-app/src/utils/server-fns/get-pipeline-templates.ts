import {
	PIPELINE_TEMPLATE_GET_ROUTE,
	type PipelineTemplate,
} from "@pacetrack/schema";
import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { client } from "../helpers/api-client";

export const getPipelineTemplatesServerFn = createServerFn({
	method: "POST",
})
	.inputValidator(PIPELINE_TEMPLATE_GET_ROUTE.request)
	.handler(async (ctx) => {
		const request = await getRequest();
		const resp = await client(
			"PIPELINE_TEMPLATE_GET_ROUTE",
			{
				body: ctx.data,
			},
			request,
		);

		if (resp.data.status === "error") {
			throw new Error("Failed to get pipeline templates");
		}

		return resp.data.payload.templates;
	});

export const getPipelineTemplatesQueryOptions = (
	search?: string,
	initialData?: PipelineTemplate[] | null,
) =>
	queryOptions({
		queryKey: [PIPELINE_TEMPLATE_GET_ROUTE.path, search],
		queryFn: () => getPipelineTemplatesServerFn({ data: { search } }),
		initialData: initialData,
	});

