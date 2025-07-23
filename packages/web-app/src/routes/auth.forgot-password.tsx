import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Mail } from "lucide-react";
import { useState } from "react";
import { ForgotPasswordForm } from "~/components/auth/ForgotPasswordForm";
import { Button } from "~/components/primitives/button";

export const Route = createFileRoute("/auth/forgot-password")({
	component: RouteComponent,
});

function RouteComponent() {
	const [submitted, setSubmitted] = useState(false);

	return (
		<>
			{submitted ? (
				<div>
					<div className=" flex items-center space-x-2">
						<span className="text-xl font-bold ">Email Sent</span>
						<Mail className="text-base" />
					</div>
					<div className="text-sm/snug text-muted-foreground pt-2">
						If you have an account, you&apos;ll receive an email with a link to
						reset your password.
					</div>

					<div className="pt-6">
						<Button className="w-fit space-x-2" asChild>
							<Link to="/auth/sign-in">
								<ArrowLeft />
								<span>Back to Sign In</span>
							</Link>
						</Button>
					</div>
				</div>
			) : (
				<ForgotPasswordForm onSuccess={() => setSubmitted(true)} />
			)}
		</>
	);
}
