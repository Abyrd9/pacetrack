import { useZodForm } from "@abyrd9/zod-form-data";
import {
	ACCOUNT_GET_ROLES_ROUTE_PATH,
	type Account,
	TENANT_CREATE_ROUTE_PATH,
	TENANT_GET_ROUTE_PATH,
	TenantCreateRequestSchema,
	type TenantCreateRouteResponse,
} from "@pacetrack/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "~/components/primitives/button";
import { Dialog } from "~/components/primitives/dialog";
import { ImageUploader } from "~/components/primitives/image-uploader";
import { Input, InputError } from "~/components/primitives/input";
import { Label } from "~/components/primitives/label";
import { client } from "~/utils/helpers/api-client";

type NewTenantFormProps = {
	isOpen: boolean;
	onClose: () => void;
	accounts: Account[];
};

export function NewTenantForm({
	isOpen,
	onClose,
	accounts,
}: NewTenantFormProps) {
	const router = useRouter();
	const qc = useQueryClient();
	const [logoFile, setLogoFile] = useState<File | null>(null);

	const {
		data,
		isPending,
		mutate: onSubmit,
	} = useMutation({
		mutationFn: async (form: FormData) => {
			const { data } = await client<TenantCreateRouteResponse>(
				TENANT_CREATE_ROUTE_PATH,
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
			if (data?.status === "ok") {
				onClose();
				qc.invalidateQueries({ queryKey: [TENANT_GET_ROUTE_PATH] });
				qc.invalidateQueries({
					queryKey: [ACCOUNT_GET_ROLES_ROUTE_PATH],
				});
				router.invalidate();
			}
		},
	});

	const { fields } = useZodForm({
		schema: TenantCreateRequestSchema,
		errors: data?.errors,
	});

	// Get the first account ID for the hidden input
	const firstAccountId = accounts[0]?.id;

	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();

		const formData = new FormData();
		formData.append("name", fields.name.value);
		formData.append("action", "create-tenant");

		// Add account_id if available
		if (firstAccountId) {
			formData.append("account_id", firstAccountId);
		}

		// Add logo file if selected
		if (logoFile) {
			formData.append("image_url", logoFile);
		}

		onSubmit(formData);
	};

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<Dialog.Portal>
				<Dialog.Overlay>
					<Dialog.Content className="max-w-md">
						<Dialog.Title>Create New Organization</Dialog.Title>
						<Dialog.Description>
							Create a new organization to manage your projects and team
							members.
						</Dialog.Description>

						<form onSubmit={handleSubmit} className="space-y-4 mt-4">
							<div className="space-y-2">
								<Label htmlFor="name">Organization Name</Label>
								<Input
									id={fields.name.name}
									name={fields.name.name}
									type="text"
									placeholder="Enter organization name"
									required
									value={fields.name.value}
									onChange={(e) => fields.name.onChange(e.target.value)}
								/>
								{fields.name.error && (
									<InputError>{fields.name.error}</InputError>
								)}
							</div>

							<div className="space-y-2">
								<Label>Organization Logo (optional)</Label>
								<ImageUploader
									value={logoFile}
									onChange={setLogoFile}
									ratio="1:1"
								/>
								{fields.image.error && (
									<InputError>{fields.image.error}</InputError>
								)}
							</div>

							{/* Hidden input for account_id */}
							{firstAccountId && (
								<input type="hidden" name="account_id" value={firstAccountId} />
							)}

							<div className="flex justify-end space-x-2 pt-4">
								<Button
									type="button"
									variant="ghost"
									onClick={onClose}
									// disabled={isPending}
								>
									Cancel
								</Button>
								<Button
									name="action"
									value="create-tenant"
									type="submit"
									isLoading={isPending}
								>
									<Button.Loader>Create Organization</Button.Loader>
								</Button>
							</div>
						</form>
					</Dialog.Content>
				</Dialog.Overlay>
			</Dialog.Portal>
		</Dialog>
	);
}
