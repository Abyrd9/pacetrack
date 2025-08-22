import {
	type Account,
	type Membership,
	SESSION_SWITCH_TENANT_ROUTE_PATH,
	type SessionSwitchTenantRouteResponse,
	SIGN_OUT_ROUTE_PATH,
	type SignOutRouteResponse,
	type Tenant,
} from "@pacetrack/schema";
import { useMutation } from "@tanstack/react-query";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { Layout, LogOut, PlusIcon, Settings } from "lucide-react";
import { useState } from "react";
import { Avatar } from "~/components/primitives/avatar";
import { Button } from "~/components/primitives/button";
import { Select } from "~/components/primitives/select";
import { client } from "~/utils/helpers/api-client";
import { NewTenantForm } from "./forms/NewTenantForm";
import { Dialog } from "./primitives/dialog";
import { Label } from "./primitives/label";
import { ThemeButton } from "./ThemeButton";

function getInitials(name?: string, email?: string) {
	if (name) {
		const parts = name.trim().split(" ");
		if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "";
		return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
	}
	if (email) return email[0]?.toUpperCase() ?? "";
	return "?";
}

export function Sidebar({
	account,
	tenant,
	tenants,
	accounts,
	baseApiUrl,
}: {
	account?: Account;
	tenant?: Tenant;
	tenants?: Tenant[];
	accounts?: Account[];
	baseApiUrl?: string;
}) {
	const router = useRouter();
	const navigate = useNavigate();

	const [isNewTenantDialogOpen, setIsNewTenantDialogOpen] = useState(false);

	const { mutate } = useMutation({
		mutationFn: async () => {
			const resp = await client<SignOutRouteResponse>(SIGN_OUT_ROUTE_PATH, {
				method: "POST",
			});

			return resp;
		},
		onSuccess: ({ data }) => {
			if (data.status === "ok") {
				navigate({
					to: "/auth/sign-in",
				});
			}
		},
	});

	const { mutate: switchTenant } = useMutation({
		mutationFn: async (form: FormData) => {
			const resp = await client<SessionSwitchTenantRouteResponse>(
				SESSION_SWITCH_TENANT_ROUTE_PATH,
				{
					method: "POST",
					body: form,
				},
			);

			return resp;
		},
		onSuccess: ({ data }) => {
			if (data.status === "ok") {
				router.invalidate();
			}
		},
	});

	return (
		<div className="w-64 h-full border-r border-background-100 flex flex-col">
			{/* User Profile Section */}
			{account && (
				<div className="flex items-center gap-2.5 p-4 !pb-0">
					<Avatar size="sm">
						{account.image_url ? (
							<Avatar.Image
								src={`${baseApiUrl}/serve/${account.image_url}`}
								alt={account.display_name ?? account.email ?? "User"}
							/>
						) : null}
						<Avatar.Fallback>
							{getInitials(
								account.display_name ?? undefined,
								account.email ?? undefined,
							)}
						</Avatar.Fallback>
					</Avatar>
					<div>
						<div className="font-medium">{account.display_name || "User"}</div>
						{!account.display_name && (
							<div className="text-xs text-gray-500">No name set</div>
						)}
					</div>
				</div>
			)}
			{/* Organization Section */}
			<div className="p-4 border-b border-background-100">
				<Label className="text-xs text-muted-foreground">
					Current Organization
				</Label>
				<div className="flex items-center gap-1.5">
					<Avatar size="sm">
						<Avatar.Image
							src={`${baseApiUrl}/serve/${tenant?.image_url}`}
							alt={tenant?.name}
						/>
						<Avatar.Fallback>{tenant?.name?.charAt(0)}</Avatar.Fallback>
					</Avatar>

					<Select
						key={tenant?.id}
						defaultValue={tenant?.id}
						onValueChange={async (value) => {
							const form = new FormData();
							form.append("tenant_id", value);
							await switchTenant(form);
						}}
					>
						<Select.Trigger className="w-full" asChild>
							<Button className="w-full justify-between gap-2">
								<span className="truncate">
									<Select.Value placeholder="Select tenant">
										{tenant?.name}
									</Select.Value>
								</span>
								<span>
									<Select.Icon />
								</span>
							</Button>
						</Select.Trigger>
						<Select.Content
							position="popper"
							sideOffset={10}
							className="w-[var(--radix-select-trigger-width)]"
						>
							<Select.Viewport>
								{tenants
									?.slice()
									.sort((a, b) => {
										// Personal tenants always come first
										if (a.kind === "personal" && b.kind !== "personal")
											return -1;
										if (a.kind !== "personal" && b.kind === "personal")
											return 1;

										// If both are the same kind, sort alphabetically by name
										return a.name.localeCompare(b.name);
									})
									.map((t) => (
										<Select.Item
											className="flex items-center justify-between gap-4"
											disabled={t.id === tenant?.id}
											key={t.id}
											value={t.id}
										>
											<span className="truncate">{t.name}</span>
											<Select.ItemIndicator />
										</Select.Item>
									))}

								<Select.Separator />

								<Button
									variant="ghost"
									className="w-full justify-between"
									onClick={() => setIsNewTenantDialogOpen(true)}
								>
									<span>New Organization</span>
									<PlusIcon />
								</Button>
							</Select.Viewport>
						</Select.Content>
					</Select>
				</div>
			</div>
			<nav className="flex-1 p-4 space-y-1">
				<Link
					to="/"
					className="flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
				>
					<Layout className="w-4 h-4" />
					<span>Dashboard</span>
				</Link>
			</nav>
			<div className="p-4 border-t border-background-100 space-y-2.5">
				<div className="flex items-center gap-2">
					<Button
						asChild
						variant="ghost"
						className="flex items-center justify-between gap-3 w-full"
					>
						<Link to="/settings">
							<span>Settings</span>
							<Settings className="w-4 h-4" />
						</Link>
					</Button>
					<ThemeButton />
				</div>

				<Dialog>
					<Dialog.Trigger asChild>
						<Button className="w-full justify-between gap-2">
							<span>Sign out</span>
							<LogOut className="w-4 h-4" />
						</Button>
					</Dialog.Trigger>
					<Dialog.Portal>
						<Dialog.Overlay>
							<Dialog.Content className="max-w-sm">
								<Dialog.Title>Sign out</Dialog.Title>
								<Dialog.Description>
									Are you sure you want to sign out?
								</Dialog.Description>
								<div className="flex justify-end gap-2 mt-6">
									<Dialog.Close asChild>
										<Button variant="outline">Cancel</Button>
									</Dialog.Close>

									<Button variant="default" onClick={() => mutate()}>
										Sign out
									</Button>
								</div>
							</Dialog.Content>
						</Dialog.Overlay>
					</Dialog.Portal>
				</Dialog>
			</div>
			<NewTenantForm
				isOpen={isNewTenantDialogOpen}
				onClose={() => setIsNewTenantDialogOpen(false)}
				accounts={accounts ?? []}
			/>
			;
		</div>
	);
}
