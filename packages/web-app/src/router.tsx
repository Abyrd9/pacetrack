// src/router.tsx

import { QueryClient } from "@tanstack/react-query";
import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { routerWithQueryClient } from "@tanstack/react-router-with-query";
import { DefaultCatchBoundary } from "./components/DefaultCatchBoundary";
import { routeTree } from "./routeTree.gen";
import { getBaseApiUrl } from "./utils/helpers/get-api-base-url";

// Singleton QueryClient for browser to prevent memory leaks
// Without this, each createRouter() call creates a new QueryClient with:
// - Global event listeners (focus/online/visibility) that accumulate
// - Timers for garbage collection and refetching
// - Cache subscriptions that aren't properly cleaned up on HMR/re-renders
// This prevents duplicate network requests and memory growth
let browserQueryClient: QueryClient | undefined;

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Server: Short gcTime (30s) since request is short-lived
        // Browser: Long gcTime (5min) to cache data across navigation/HMR
        // Different gcTimes prevent server data from lingering in browser cache
        gcTime: typeof window === "undefined" ? 30_000 : 5 * 60_000,
        staleTime: 0,
        retry: 1,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

export function createRouter() {
  let queryClient: QueryClient;

  // Server-side: Always create a fresh QueryClient per request
  // This prevents cross-request data pollution and ensures clean state
  if (typeof window === "undefined") {
    queryClient = createQueryClient();
  } else {
    // Browser-side: Reuse singleton QueryClient to prevent memory leaks
    // Each new QueryClient registers global listeners and timers that don't get cleaned up
    // Without singleton, HMR and route changes would accumulate orphaned instances
    if (!browserQueryClient) {
      browserQueryClient = createQueryClient();
    }
    queryClient = browserQueryClient;
  }

  return routerWithQueryClient(
    createTanStackRouter({
      routeTree,
      defaultPreload: "intent",

      defaultErrorComponent: DefaultCatchBoundary,
      scrollRestoration: true,
      context: {
        BASE_API_URL: getBaseApiUrl(),
        queryClient,
      },
    }),
    queryClient
  );
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createRouter>;
  }
}
