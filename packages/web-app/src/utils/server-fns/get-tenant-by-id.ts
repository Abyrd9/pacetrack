import {
	TENANT_GET_BY_ID_ROUTE_PATH,
	type Tenant,
	TenantGetByIdRequestSchema,
	type TenantGetByIdRouteResponse,
} from "@pacetrack/schema";
import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { getWebRequest } from "@tanstack/react-start/server";
import { client } from "../helpers/api-client";

export const getTenantByIdServerFn = createServerFn({ method: "POST" })
	.validator(TenantGetByIdRequestSchema)
	.handler(async (ctx) => {
		const { tenantId } = ctx.data;

		const request = await getWebRequest();
		const resp = await client<TenantGetByIdRouteResponse>(
			TENANT_GET_BY_ID_ROUTE_PATH,
			{
				method: "POST",
				body: JSON.stringify({ tenantId: tenantId }),
				headers: {
					"Content-Type": "application/json",
				},
			},
			request,
		);

		if (resp.data.status === "error") {
			throw new Error("Failed to get tenant");
		}

		return resp.data.payload;
	});

export const getTenantByIdQueryOptions = (
	tenantId: string,
	initialData?: Tenant | null,
) =>
	queryOptions({
		queryKey: [TENANT_GET_BY_ID_ROUTE_PATH, tenantId],
		queryFn: () =>
			getTenantByIdServerFn({
				data: {
					tenantId: tenantId,
				},
			}),
		initialData: initialData,
	});
