import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/auth/")({
  component: RouteComponent,
  loader: async () => {
    throw redirect({ to: "/auth/sign-in" });
  },
});

function RouteComponent() {
  return <div />;
}
