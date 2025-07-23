import { createServerFn } from "@tanstack/react-start";
import { getRequest, setResponseHeader } from "@tanstack/react-start/server";
import { client } from "../helpers/api-client";

export const validateSessionServerFn = createServerFn({
  method: "POST",
}).handler(async () => {
  const request = await getRequest();
  const { data, response } = await client(
    "VALIDATE_SESSION_ROUTE",
    {
      body: {},
    },
    request
  );

  // Update the session cookie
  const cookie = response.headers.get("Set-Cookie");
  if (cookie) setResponseHeader("Set-Cookie", cookie);

  return {
    data,
  };
});
