import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import { Card } from "~/components/primitives/card";
import { cx } from "~/utils/helpers/cx";

export const Route = createFileRoute("/auth")({
	component: RouteComponent,
});

function RouteComponent() {
	const location = useLocation();
	const pathname = location.pathname;

	let title = "";
	let description = "";

	if (pathname === "/auth/sign-in") {
		title = "Sign in";
		description = "Sign in to your account";
	} else if (pathname === "/auth/sign-up") {
		title = "Sign up";
		description = "Sign up for an account";
	} else if (pathname === "/auth/forgot-password") {
		title = "Forgot password";
		description = "Forgot your password? No problem";
	}

	if (!pathname.startsWith("/auth")) return null;

	return (
		<div className="flex h-dvh w-full items-center justify-center px-4">
			<Card className="w-full max-w-md px-14 py-8 shadow-md">
				{/* Replace with logo */}
				{/* <img src={Logo} width={140} alt="indevor.io logo" /> */}

				<div className={cx(title || description ? "py-8" : "")}>
					{title && (
						<h1 className="text-3xl font-bold text-foreground pb-2">{title}</h1>
					)}
					{description && (
						<p className="text-sm/snug text-muted-foreground">{description}</p>
					)}
				</div>

				<Outlet />
			</Card>
		</div>
	);
}
