import { data } from "react-router";
import type { Theme } from "~/utils/services/client-theme/ThemeProvider";
import { clientThemeCookieSession } from "~/utils/services/client-theme/ui-theme.server";
import type { Route } from "./+types/api.set-theme";

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const theme = form.get("theme") as Theme;
  if (!theme) {
    throw data(`Invalid theme: ${theme}`, { status: 400 });
  }

  const cookie = request.headers.get("Cookie");
  const session = await clientThemeCookieSession.getSession(cookie);
  session.set("theme", theme);

  return data(null, {
    status: 200,
    headers: {
      "Set-Cookie": await clientThemeCookieSession.commitSession(session),
    },
  });
}
