import {
	ACCOUNT_GET_BY_ID_ROUTE_PATH,
	type Account,
	AccountGetByIdRequestSchema,
	type AccountGetByIdRouteResponse,
} from "@pacetrack/schema";
import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { getWebRequest } from "@tanstack/react-start/server";
import { client } from "../helpers/api-client";

export const getAccountByIdServerFn = createServerFn({ method: "POST" })
	.validator(AccountGetByIdRequestSchema)
	.handler(async (ctx) => {
		const { accountId } = ctx.data;

		const request = await getWebRequest();
		const resp = await client<AccountGetByIdRouteResponse>(
			ACCOUNT_GET_BY_ID_ROUTE_PATH,
			{
				method: "POST",
				body: JSON.stringify({ accountId: accountId }),
				headers: {
					"Content-Type": "application/json",
				},
			},
			request,
		);

		if (resp.data.status === "error") {
			throw new Error("Failed to get account");
		}

		return resp.data.payload;
	});

export const getAccountByIdQueryOptions = (
	accountId: string,
	initialData?: Account | null,
) =>
	queryOptions({
		queryKey: [ACCOUNT_GET_BY_ID_ROUTE_PATH, accountId],
		queryFn: () =>
			getAccountByIdServerFn({
				data: {
					accountId: accountId,
				},
			}),
		initialData: initialData,
	});
