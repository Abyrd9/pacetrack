import { ACCOUNT_GET_ROUTE, type Account } from "@pacetrack/schema";
import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { client } from "../helpers/api-client";

export const getAccountsServerFn = createServerFn({ method: "POST" }).handler(
  async () => {
    const request = await getRequest();
    const resp = await client(
      "ACCOUNT_GET_ROUTE",
      {
        body: {},
        headers: {
          "Content-Type": "application/json",
        },
      },
      request
    );

    if (resp.data.status === "error") {
      throw new Error("Failed to get accounts");
    }

    return resp.data.payload.accounts;
  }
);

export const getAccountsQueryOptions = (initialData?: Account[] | null) =>
  queryOptions({
    queryKey: [ACCOUNT_GET_ROUTE.path],
    queryFn: () => getAccountsServerFn(),
    initialData: initialData,
  });
