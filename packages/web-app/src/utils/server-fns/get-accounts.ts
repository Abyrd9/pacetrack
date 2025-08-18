import {
	ACCOUNT_GET_ROUTE_PATH,
	type Account,
	type AccountGetRouteResponse,
} from "@pacetrack/schema";
import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { getWebRequest } from "@tanstack/react-start/server";
import { client } from "../helpers/api-client";

export const getAccountsServerFn = createServerFn({ method: "POST" }).handler(
	async () => {
		const request = await getWebRequest();
		const resp = await client<AccountGetRouteResponse>(
			ACCOUNT_GET_ROUTE_PATH,
			{
				method: "GET",
			},
			request,
		);

		if (resp.data.status === "error") {
			throw new Error("Failed to get accounts");
		}

		return resp.data.payload.accounts;
	},
);

export const getAccountsQueryOptions = (initialData?: Account[] | null) =>
	queryOptions({
		queryKey: [ACCOUNT_GET_ROUTE_PATH],
		queryFn: () => getAccountsServerFn(),
		initialData: initialData,
	});
