import type { Account, Tenant, User } from "@pacetrack/schema";
import { Layout, LogOut, PlusIcon, Settings } from "lucide-react";
import { useState } from "react";
import { Link, useFetcher } from "react-router";
import { Avatar } from "~/components/primitives/avatar";
import { Button } from "~/components/primitives/button";
import { Select } from "~/components/primitives/select";
import { NewTenantForm } from "./NewTenantForm";
import { ThemeButton } from "./ThemeButton";
import { Label } from "./primitives/label";

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
	user,
	tenant,
	tenants,
	accounts,
	baseApiUrl,
}: {
	user?: User;
	tenant?: Tenant;
	tenants?: Tenant[];
	accounts?: Account[];
	baseApiUrl?: string;
}) {
	const [isNewTenantDialogOpen, setIsNewTenantDialogOpen] = useState(false);
	const fetcher = useFetcher();

	return (
		<div className="w-64 h-full border-r border-background-100 flex flex-col">
			{/* User Profile Section */}
			{user && (
				<div className="flex items-center gap-2.5 p-4 !pb-0">
					<Avatar size="sm">
						{user.image_url ? (
							<Avatar.Image
								src={`${baseApiUrl}/serve/${user.image_url}`}
								alt={user.display_name ?? user.email ?? "User"}
							/>
						) : null}
						<Avatar.Fallback>
							{getInitials(
								user.display_name ?? undefined,
								user.email ?? undefined,
							)}
						</Avatar.Fallback>
					</Avatar>
					<div>
						<div className="font-medium">{user.display_name || "User"}</div>
						{!user.display_name && (
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
				<Select
					defaultValue={tenant?.id}
					onValueChange={(value) => {
						const form = new FormData();
						form.append("tenant_id", value);
						fetcher.submit(form, {
							method: "POST",
							action: "/api/switch-tenant",
						});
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
							{tenants?.map((t) => (
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

				<form method="POST" action="/api/sign-out">
					<Button className="w-full justify-between gap-2">
						<span>Sign out</span>
						<LogOut className="w-4 h-4" />
					</Button>
				</form>
			</div>

			{/* New Tenant Form Dialog */}
			<NewTenantForm
				isOpen={isNewTenantDialogOpen}
				onClose={() => setIsNewTenantDialogOpen(false)}
				accounts={accounts ?? []}
			/>
		</div>
	);
}
