import { redirect } from "react-router";

export default function loader() {
  return redirect("/auth/sign-in");
}
