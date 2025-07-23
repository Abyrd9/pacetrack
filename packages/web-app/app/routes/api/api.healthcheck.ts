import { data } from "react-router";
import type { Route } from "./+types/api.healthcheck";

export function loader(_: Route.LoaderArgs) {
  return data({
    message: "OK",
  });
}
