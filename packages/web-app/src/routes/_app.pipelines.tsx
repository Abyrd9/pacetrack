import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/pipelines")({
	component: RouteComponent,
});

function RouteComponent() {
	return <Outlet />;
}
