import { createCookieSessionStorage } from "react-router";
import { hint_getPrefersColorScheme } from "../client-hints/prefers-color-scheme";
import type { Theme } from "./ThemeProvider";

export const clientThemeCookieSession = createCookieSessionStorage({
  cookie: {
    name: "pacetrack-theme-session",
    sameSite: "lax",
    path: "/",
    httpOnly: true,
    secure: import.meta.env.PROD,
    maxAge: 31536000, // 1 year
  },
});

export const getClientTheme = async (request: Request) => {
  const prefersColorsSchema = hint_getPrefersColorScheme(request);
  const session = await clientThemeCookieSession.getSession(
    request.headers.get("Cookie")
  );

  let theme = session.get("theme") as Theme | undefined;

  const headers = new Headers();
  if ((!theme || theme === "system") && prefersColorsSchema) {
    theme = prefersColorsSchema === "dark" ? "dark" : "light";
    session.set("theme", prefersColorsSchema);
    headers.set(
      "Set-Cookie",
      await clientThemeCookieSession.commitSession(session)
    );
  }

  return {
    theme: theme,
    headers,
  };
};
