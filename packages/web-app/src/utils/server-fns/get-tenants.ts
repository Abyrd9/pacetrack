import { TENANT_GET_ROUTE, type Tenant } from "@pacetrack/schema";
import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { client } from "../helpers/api-client";

export const getTenantsServerFn = createServerFn({ method: "POST" }).handler(
  async () => {
    const request = await getRequest();
    const resp = await client("TENANT_GET_ROUTE", {}, request);

    if (resp.data.status === "error") {
      throw new Error("Failed to get tenants");
    }

    return resp.data.payload.tenants;
  }
);

export const getTenantsQueryOptions = (initialData?: Tenant[] | null) =>
  queryOptions({
    queryKey: [TENANT_GET_ROUTE.path],
    queryFn: () => getTenantsServerFn(),
    initialData: initialData,
  });
