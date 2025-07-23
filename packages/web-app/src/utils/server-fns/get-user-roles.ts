import { ACCOUNT_GET_ROLES_ROUTE, type Role } from "@pacetrack/schema";
import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { client } from "../helpers/api-client";

export const getAccountRolesServerFn = createServerFn({
  method: "GET",
}).handler(async () => {
  const request = await getRequest();
  const resp = await client("ACCOUNT_GET_ROLES_ROUTE", {}, request);

  if (resp.data.status === "error") {
    console.error("Failed to get user roles", resp.data.errors);
    throw new Error("Failed to get user roles");
  }

  return resp.data.payload.roles;
});

export const getAccountRolesQueryOptions = (
  initialData?: Record<string, Role> | null
) =>
  queryOptions({
    queryKey: [ACCOUNT_GET_ROLES_ROUTE.path],
    queryFn: () => getAccountRolesServerFn(),
    initialData,
  });
