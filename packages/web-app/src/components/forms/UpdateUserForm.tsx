import {
	ACCOUNT_UPDATE_ROUTE_PATH,
	type Account,
	type AccountUpdateRouteResponse,
} from "@pacetrack/schema";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { client } from "~/utils/helpers/api-client";
import { Button } from "../primitives/button";
import { Input, InputError } from "../primitives/input";
import { Label } from "../primitives/label";

export function UpdateUserForm({ account }: { account: Account }) {
	const router = useRouter();

	const {
		mutate: onSubmit,
		data,
		isPending,
	} = useMutation({
		mutationFn: async (form: FormData) => {
			const { data } = await client<AccountUpdateRouteResponse>(
				ACCOUNT_UPDATE_ROUTE_PATH,
				{
					method: "POST",
					body: form,
					headers: {
						"Content-Type": "multipart/form-data",
					},
				},
			);

			return data;
		},
		onSuccess: (data) => {
			if (data.status === "ok") router.invalidate();
		},
	});

	return (
		<form
			method="post"
			encType="multipart/form-data"
			className="space-y-4"
			onSubmit={(e) => {
				e.preventDefault();
				const formData = new FormData(e.target as HTMLFormElement);
				onSubmit(formData);
			}}
		>
			{/* action discriminator */}
			<input type="hidden" name="action" value="update-profile" />
			{/* user id needed by API */}
			<input type="hidden" name="id" value={account?.id ?? ""} />
			{/* Display name */}
			<div className="space-y-2">
				<Label htmlFor="display_name">Display name</Label>
				<div className="flex items-center gap-2">
					<Input
						name="display_name"
						defaultValue={account?.display_name ?? ""}
						placeholder="Your name"
					/>
					<Button
						variant="ghost"
						type="submit"
						disabled={isPending}
						className="h-[38px] w-full max-w-fit"
					>
						{isPending ? "Saving…" : "Save changes"}
					</Button>
				</div>

				{data?.status === "error" && data.errors?.display_name && (
					<InputError>{data.errors.display_name}</InputError>
				)}
			</div>
		</form>
	);
}
