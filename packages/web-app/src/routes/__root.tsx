// src/routes/__root.tsx
/// <reference types="vite/client" />

import { TooltipProvider } from "@radix-ui/react-tooltip";
import {
	createRootRouteWithContext,
	HeadContent,
	Outlet,
	Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import type { ReactNode } from "react";
import { DefaultCatchBoundary } from "~/components/DefaultCatchBoundary";
import { ToasterProvider } from "~/components/ToasterProvider";
import "../styles/app.css";
import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { getClientThemeServerFn } from "~/utils/services/client-theme/ui-theme.server";
import css from "../styles/app.css?url";
import { hint_checkPrefersColorScheme } from "../utils/services/client-hints/prefers-color-scheme";
import { hint_checkPrefersMotion } from "../utils/services/client-hints/prefers-motion";
import { hint_checkTimeZone } from "../utils/services/client-hints/time-zone";
import { ThemeProvider } from "../utils/services/client-theme/ThemeProvider";

export const Route = createRootRouteWithContext<{
	BASE_API_URL: string;
	queryClient: QueryClient;
}>()({
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: "PaceTrack",
			},
		],
		links: [{ rel: "stylesheet", href: css }],
	}),
	errorComponent: (props) => {
		return (
			<RootDocument theme="system">
				<DefaultCatchBoundary {...props} />
			</RootDocument>
		);
	},
	beforeLoad: async () => {
		const { theme } = await getClientThemeServerFn();

		return {
			theme,
		};
	},
	loader: ({ context }) => {
		return {
			theme: context.theme,
		};
	},
	notFoundComponent: () => <div>Not Found</div>,
	component: RootComponent,
});

function RootComponent() {
	const data = Route.useLoaderData();

	return (
		<ThemeProvider theme={data.theme}>
			{({ theme }) => (
				<RootDocument theme={theme}>
					<TooltipProvider>
						<ToasterProvider>
							<Outlet />
						</ToasterProvider>
					</TooltipProvider>
				</RootDocument>
			)}
		</ThemeProvider>
	);
}

function RootDocument({
	children,
	theme,
}: Readonly<{
	children: ReactNode;
	theme: string;
}>) {
	return (
		<html className={theme} lang="en">
			<head>
				<HeadContent />
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
				{children}
				<TanStackRouterDevtools position="bottom-right" />
				<ReactQueryDevtools buttonPosition="bottom-left" />
				<Scripts />
			</body>
		</html>
	);
}
