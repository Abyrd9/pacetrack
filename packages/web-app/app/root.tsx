import {
  VALIDATE_SESSION_ROUTE_PATH,
  type ValidateSessionRouteResponse,
} from "@pacetrack/schema";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  data,
  isRouteErrorResponse,
  redirect,
  useRouteLoaderData,
} from "react-router";
import type { Route } from "./+types/root";
import "./styles/app.css";
import stylesheet from "./styles/app.css?url";
import { client } from "./utils/helpers/api-client";
import { hint_checkPrefersColorScheme } from "./utils/services/client-hints/prefers-color-scheme";
import { hint_checkPrefersMotion } from "./utils/services/client-hints/prefers-motion";
import { hint_checkTimeZone } from "./utils/services/client-hints/time-zone";
import { ThemeProvider } from "./utils/services/client-theme/ThemeProvider";
import { getClientTheme } from "./utils/services/client-theme/ui-theme.server";

export const links: Route.LinksFunction = () => [
  { rel: "stylesheet", href: stylesheet },
];

export async function loader({ request }: Route.LoaderArgs) {
  const { theme, headers } = await getClientTheme(request);

  const { data: json, response } = await client<ValidateSessionRouteResponse>(
    VALIDATE_SESSION_ROUTE_PATH,
    request,
    {
      method: "POST",
      body: JSON.stringify({}),
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  const pathname = new URL(request.url).pathname;
  if (pathname.startsWith("/auth") && json.status === "ok") {
    return redirect("/");
  }

  return data({ theme }, { headers });
}

export type RootLoaderData = typeof loader;

export function Layout({ children }: { children: React.ReactNode }) {
  const data = useRouteLoaderData<typeof loader>("root");

  return (
    <ThemeProvider theme={data?.theme ?? "system"}>
      {({ theme }) => (
        <html className={theme} lang="en">
          <head>
            <meta charSet="utf-8" />
            <meta
              name="viewport"
              content="width=device-width, initial-scale=1"
            />
            <Meta />
            <Links />
            <script
              // biome-ignore lint/security/noDangerouslySetInnerHtml: We need this to run the hint check so we can set cookies for these values without a screen flash
              dangerouslySetInnerHTML={{
                __html: `
                  (${hint_checkPrefersColorScheme.toString()})();
                  (${hint_checkPrefersMotion.toString()})();
                  (${hint_checkTimeZone.toString()})();
                `,
              }}
            />
          </head>
          <body>
            <TooltipProvider>{children}</TooltipProvider>
            <ScrollRestoration />
            <Scripts />
          </body>
        </html>
      )}
    </ThemeProvider>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
