import { createFileRoute } from "@tanstack/react-router";
import { GoogleSignInForm } from "~/components/auth/SignInFormGoogle";
import { SignUpForm } from "~/components/auth/SignUpForm";

export const Route = createFileRoute("/auth/sign-up")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<>
			<GoogleSignInForm />

			<div className="flex items-center space-x-3 py-6">
				<div className="h-[1px] w-full bg-gray-100" />
				<span className="-translate-y-[2px] text-sm text-muted-foreground">
					or
				</span>
				<div className="h-[1px] w-full bg-gray-100" />
			</div>

			<SignUpForm />
		</>
	);
}
