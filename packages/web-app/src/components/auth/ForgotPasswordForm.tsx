import { useZodForm } from "@abyrd9/zod-form-data";
import {
	FORGOT_PASSWORD_ROUTE_PATH,
	ForgotPasswordRequestSchema,
	type ForgotPasswordRouteResponse,
} from "@pacetrack/schema";
import { useMutation } from "@tanstack/react-query";
import { SendIcon } from "lucide-react";
import { Button } from "~/components/primitives/button";
import { Input, InputComposer } from "~/components/primitives/input";
import { Label } from "~/components/primitives/label";
import { client } from "~/utils/helpers/api-client";

export const ForgotPasswordForm = ({
	onSuccess,
}: {
	onSuccess?: () => void;
}) => {
	const {
		data,
		isPending,
		mutate: onSubmit,
	} = useMutation({
		mutationFn: async (e: React.FormEvent<HTMLFormElement>) => {
			e.preventDefault();

			let element: HTMLFormElement | undefined;
			if (e.target instanceof HTMLFormElement) {
				element = e.target;
			} else if (e.currentTarget instanceof HTMLFormElement) {
				element = e.currentTarget;
			} else {
				throw new Error("Form element not found");
			}

			const form = new FormData(element);
			const { data } = await client<ForgotPasswordRouteResponse>(
				FORGOT_PASSWORD_ROUTE_PATH,
				{
					method: "POST",
					body: form,
				},
			);

			return data;
		},
		onSuccess: (data) => {
			if (data.status === "ok") onSuccess?.();
		},
	});

	const { fields } = useZodForm({
		schema: ForgotPasswordRequestSchema,
		errors: data?.errors,
	});

	return (
		<form onSubmit={onSubmit}>
			<div className="pb-4">
				<Label htmlFor={fields.email.name}>Email address</Label>
				<Input
					type="email"
					name={fields.email.name}
					value={fields.email.value}
					onChange={(e) => fields.email.onChange(e.target.value)}
					className="w-full max-w-none"
					placeholder="john.doe@example.com"
				/>
				{fields.email.error && (
					<InputComposer.Error>{fields.email.error}</InputComposer.Error>
				)}
				{data?.errors?.global && (
					<InputComposer.Error>{data.errors.global}</InputComposer.Error>
				)}
			</div>
			<div className="pt-4">
				<Button
					color="primary"
					className="w-full space-x-2"
					isLoading={isPending}
					disabled={isPending}
					type="submit"
				>
					<Button.Loader className="flex w-full items-center justify-center space-x-2">
						<span>Reset Password</span>
						<SendIcon />
					</Button.Loader>
				</Button>
			</div>
		</form>
	);
};
