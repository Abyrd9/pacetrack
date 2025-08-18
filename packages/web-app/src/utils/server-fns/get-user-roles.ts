import {
	ACCOUNT_GET_ROLES_ROUTE_PATH,
	type AccountGetRolesRouteResponse,
	type Role,
} from "@pacetrack/schema";
import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { getWebRequest } from "@tanstack/react-start/server";
import { client } from "../helpers/api-client";

export const getAccountRolesServerFn = createServerFn({
	method: "POST",
}).handler(async () => {
	const request = await getWebRequest();
	const resp = await client<AccountGetRolesRouteResponse>(
		ACCOUNT_GET_ROLES_ROUTE_PATH,
		{
			method: "POST",
			body: JSON.stringify({}),
			headers: {
				"Content-Type": "application/json",
			},
		},
		request,
	);

	if (resp.data.status === "error") {
		throw new Error("Failed to get user roles");
	}

	return resp.data.payload.roles;
});

export const getAccountRolesQueryOptions = (
	initialData?: Record<string, Role> | null,
) =>
	queryOptions({
		queryKey: [ACCOUNT_GET_ROLES_ROUTE_PATH],
		queryFn: () => getAccountRolesServerFn(),
		initialData,
	});
