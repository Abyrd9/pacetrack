import { createServerFn } from "@tanstack/react-start";
import { getRequest, setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod/v4";
import { hint_getPrefersColorScheme } from "../client-hints/prefers-color-scheme";
import type { Theme } from "./ThemeProvider";

// Simple cookie parser
function parseCookies(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {};

  return cookieHeader.split(";").reduce(
    (cookies, cookie) => {
      const [name, value] = cookie.trim().split("=");
      if (name && value) {
        cookies[name] = decodeURIComponent(value);
      }
      return cookies;
    },
    {} as Record<string, string>
  );
}

// Simple cookie setter
function setCookie(
  name: string,
  value: string,
  options: {
    path?: string;
    httpOnly?: boolean;
    sameSite?: string;
    maxAge?: number;
    secure?: boolean;
  } = {}
) {
  const {
    path = "/",
    httpOnly = true,
    sameSite = "Lax",
    maxAge = 31536000,
    secure = false,
  } = options;

  let cookie = `${name}=${encodeURIComponent(
    value
  )}; Path=${path}; SameSite=${sameSite}; Max-Age=${maxAge}`;

  if (httpOnly) {
    cookie += "; HttpOnly";
  }

  if (secure) {
    cookie += "; Secure";
  }

  return cookie;
}

export const getClientThemeServerFn = createServerFn({
  method: "GET",
}).handler(async () => {
  const request = getRequest();
  const prefersColorsSchema = hint_getPrefersColorScheme(request);
  const cookies = parseCookies(request.headers.get("Cookie"));

  let theme = cookies["pacetrack-theme"] as Theme | undefined;

  let cookie = "";
  if ((!theme || theme === "system") && prefersColorsSchema) {
    theme = prefersColorsSchema === "dark" ? "dark" : "light";
    cookie = setCookie("pacetrack-theme", prefersColorsSchema);
    setResponseHeader("Set-Cookie", cookie);
  }

  return {
    theme: theme || "system",
  };
});

const setThemeSchema = z.object({
  theme: z.enum(["light", "dark", "system"]),
});

export const setThemeServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(setThemeSchema)
  .handler(async ({ data }) => {
    const cookie = setCookie("pacetrack-theme", data.theme);
    setResponseHeader("Set-Cookie", cookie);

    return {
      success: true,
      cookieHeader: cookie,
    };
  });
