import { redirect } from "react-router";
import type { Route } from "./+types/route";

export async function loader({ request }: Route.LoaderArgs) {
  return redirect("/auth/sign-in");
}

export default function AuthRoute() {
  return <div>AuthRoute</div>;
}
