import { useZodForm } from "@abyrd9/zod-form-data";
import {
	CHANGE_EMAIL_ROUTE_PATH,
	ChangeEmailRequestSchema,
	type ChangeEmailRouteResponse,
} from "@pacetrack/schema";
import { useMutation } from "@tanstack/react-query";
import { MailIcon, SendIcon } from "lucide-react";
import { Button } from "~/components/primitives/button";
import { Input, InputError } from "~/components/primitives/input";
import { Label } from "~/components/primitives/label";
import { client } from "~/utils/helpers/api-client";
import { toast } from "../ToasterProvider";

type ChangeEmailFormProps = {
	currentEmail?: string | null;
};

export function ChangeEmailForm({ currentEmail }: ChangeEmailFormProps) {
	const {
		mutate: onSubmit,
		data,
		isPending,
	} = useMutation({
		mutationFn: async (form: FormData) => {
			const { data } = await client<ChangeEmailRouteResponse>(
				CHANGE_EMAIL_ROUTE_PATH,
				{
					method: "POST",
					body: form,
					headers: {
						"Content-Type": "multipart/form-data",
					},
				},
			);

			if (data.status === "error") {
				throw new Error(data.errors?.global ?? "Something went wrong");
			}

			return data;
		},
		onError: (error) => {
			toast.error("Error sending confirmation email", error.message);
		},
	});

	const { fields } = useZodForm({
		schema: ChangeEmailRequestSchema,
		errors: data?.errors,
	});

	return (
		<div className="space-y-2">
			<h2 className="text-lg font-medium">Current Email</h2>
			{data?.status === "ok" ? (
				<p className="text-sm text-muted-foreground">
					A confirmation link has been sent to {data.payload?.email}. Please
					check your inbox.
				</p>
			) : (
				<>
					{currentEmail && (
						<p className="bg-background-100 rounded-md p-2 px-4 text-sm w-fit flex items-center gap-2 mb-4">
							<MailIcon className="w-4 h-4" />
							<span>{currentEmail}</span>
						</p>
					)}
					<form
						method="POST"
						encType="multipart/form-data"
						onSubmit={(e) => {
							e.preventDefault();
							const formData = new FormData(e.target as HTMLFormElement);
							onSubmit(formData);
						}}
					>
						<input type="hidden" name="action" value="change-email" />
						<div className="space-y-2 pb-4">
							<Label htmlFor={fields.email.name}>Update email address</Label>
							<div className="flex items-center gap-2">
								<Input
									type="email"
									id={fields.email.name}
									name={fields.email.name}
									value={fields.email.value}
									onChange={(e) => fields.email.onChange(e.target.value)}
									placeholder="new.address@example.com"
								/>
								<Button
									variant="ghost"
									isLoading={isPending}
									disabled={isPending}
									type="submit"
									className="space-x-2 block w-full max-w-fit h-[38px]"
								>
									<Button.Loader className="flex items-center space-x-2">
										<span>Send confirmation</span>
										<SendIcon />
									</Button.Loader>
								</Button>
							</div>

							{fields.email.error && (
								<InputError>{fields.email.error}</InputError>
							)}
						</div>
					</form>
				</>
			)}
		</div>
	);
}
