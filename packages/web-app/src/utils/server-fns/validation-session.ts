import { createServerFn } from "@tanstack/react-start";
import { getWebRequest, setHeader } from "@tanstack/react-start/server";
import { client } from "../helpers/api-client";

export const validateSessionServerFn = createServerFn({
  method: "POST",
}).handler(async () => {
  const request = await getWebRequest();
  const { data, response } = await client(
    "VALIDATE_SESSION_ROUTE",
    {
      method: "POST",
    },
    request
  );

  // Update the session cookie
  const cookie = response.headers.get("Set-Cookie");
  if (cookie) setHeader("Set-Cookie", cookie);

  return {
    data,
  };
});
