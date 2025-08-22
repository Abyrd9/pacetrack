// src/router.tsx

import { QueryClient } from "@tanstack/react-query";
import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { routerWithQueryClient } from "@tanstack/react-router-with-query";
import { DefaultCatchBoundary } from "./components/DefaultCatchBoundary";
import { routeTree } from "./routeTree.gen";
import { getBaseApiUrl } from "./utils/helpers/get-api-base-url";

export const tanstackQueryClient = new QueryClient();

export function createRouter() {
	return routerWithQueryClient(
		createTanStackRouter({
			routeTree,
			defaultPreload: "intent",
			// Since we're using React Query, we don't want loader calls to ever be stale
			// This will ensure that the loader is always called when the route is preloaded or visited
			defaultPreloadStaleTime: 0,
			defaultErrorComponent: DefaultCatchBoundary,
			scrollRestoration: true,
			context: {
				BASE_API_URL: getBaseApiUrl(),
				queryClient: tanstackQueryClient,
			},
		}),
		tanstackQueryClient,
	);
}

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof createRouter>;
	}
}
