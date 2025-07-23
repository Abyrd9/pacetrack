import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { client } from "../helpers/api-client";

export const signOutServerFn = createServerFn({ method: "POST" }).handler(
  async () => {
    const request = await getRequest();
    const resp = await client("SIGN_OUT_ROUTE", {}, request);

    return resp.data;
  }
);
