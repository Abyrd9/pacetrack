import { useZodForm } from "@abyrd9/zod-form-data";
import {
	TenantCreateRequestSchema,
	type Account,
	type TenantCreateRouteResponse,
} from "@pacetrack/schema";
import { useEffect, useState } from "react";
import { useFetcher } from "react-router";
import { Button } from "~/components/primitives/button";
import { Dialog } from "~/components/primitives/dialog";
import { ImageUploader } from "~/components/primitives/image-uploader";
import { Input, InputError } from "~/components/primitives/input";
import { Label } from "~/components/primitives/label";

interface NewTenantFormProps {
	isOpen: boolean;
	onClose: () => void;
	accounts: Account[];
}

export function NewTenantForm({
	isOpen,
	onClose,
	accounts,
}: NewTenantFormProps) {
	const [logoFile, setLogoFile] = useState<File | null>(null);

	const fetcher = useFetcher<TenantCreateRouteResponse>();
	const { fields } = useZodForm({
		schema: TenantCreateRequestSchema,
		errors: fetcher.data?.errors,
	});

	// Get the first account ID for the hidden input
	const firstAccountId = accounts[0]?.id;

	useEffect(() => {
		console.log("fetcher.data", fetcher.data);
		if (fetcher.data?.status === "ok") onClose();
	}, [fetcher.data, onClose]);

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

		fetcher.submit(formData, {
			method: "post",
			encType: "multipart/form-data",
		});
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
								{fields.image_url.error && (
									<InputError>{fields.image_url.error}</InputError>
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
									disabled={fetcher.state !== "idle"}
								>
									Cancel
								</Button>
								<Button
									name="action"
									value="create-tenant"
									type="submit"
									isLoading={fetcher.state !== "idle"}
									disabled={fetcher.state !== "idle"}
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
