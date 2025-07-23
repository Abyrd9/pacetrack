import {
  SESSION_GET_ACCOUNTS_META_ROUTE,
  type SessionGetAccountsMetaRouteResponse,
} from "@pacetrack/schema/src/routes-schema/session/session.get-accounts-meta.types";
import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { client } from "../helpers/api-client";

export const getAccountsMetaServerFn = createServerFn({
  method: "POST",
}).handler(async () => {
  const request = await getRequest();
  const resp = await client(
    "SESSION_GET_ACCOUNTS_META_ROUTE",
    {
      body: {},
      headers: {
        "Content-Type": "application/json",
      },
    },
    request
  );

  if (resp.data.status === "error") {
    throw new Error("Failed to get accounts meta");
  }

  return resp.data.payload;
});

export const getAccountsMetaQueryOptions = (
  initialData?: SessionGetAccountsMetaRouteResponse["payload"] | null
) =>
  queryOptions({
    queryKey: [SESSION_GET_ACCOUNTS_META_ROUTE.path],
    queryFn: () => getAccountsMetaServerFn(),
    initialData,
  });
