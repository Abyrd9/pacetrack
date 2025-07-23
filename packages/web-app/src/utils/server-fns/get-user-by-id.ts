import { ACCOUNT_GET_BY_ID_ROUTE, type Account } from "@pacetrack/schema";
import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { getWebRequest } from "@tanstack/react-start/server";
import { client } from "../helpers/api-client";

export const getAccountByIdServerFn = createServerFn({ method: "POST" })
  .validator(ACCOUNT_GET_BY_ID_ROUTE.request)
  .handler(async (ctx) => {
    const { accountId } = ctx.data;

    const request = await getWebRequest();
    const resp = await client(
      "ACCOUNT_GET_BY_ID_ROUTE",
      {
        method: "POST",
        body: JSON.stringify({ accountId: accountId }),
        headers: {
          "Content-Type": "application/json",
        },
      },
      request
    );

    if (resp.data.status === "error") {
      throw new Error("Failed to get account");
    }

    return resp.data.payload;
  });

export const getAccountByIdQueryOptions = (
  accountId: string,
  initialData?: Account | null
) =>
  queryOptions({
    queryKey: [ACCOUNT_GET_BY_ID_ROUTE.path, accountId],
    queryFn: () =>
      getAccountByIdServerFn({
        data: {
          accountId: accountId,
        },
      }),
    initialData: initialData,
  });
