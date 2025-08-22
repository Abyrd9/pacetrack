import {
  VALIDATE_SESSION_ROUTE_PATH,
  type ValidateSessionRouteResponse,
} from "@pacetrack/schema";
import { createServerFn } from "@tanstack/react-start";
import { getWebRequest, setHeader } from "@tanstack/react-start/server";
import { client } from "../helpers/api-client";

export const validateSessionServerFn = createServerFn({
  method: "POST",
}).handler(async () => {
  const request = await getWebRequest();
  console.log("REQUEST HEADERS", request.headers);
  const { data, response } = await client<ValidateSessionRouteResponse>(
    VALIDATE_SESSION_ROUTE_PATH,
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
