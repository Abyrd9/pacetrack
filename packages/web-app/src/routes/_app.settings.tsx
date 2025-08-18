import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ChangeEmailForm } from "~/components/forms/ChangeEmailForm";
import { ManageTenantsForm } from "~/components/forms/ManageTenantsForm";
import { UpdateUserAvatarForm } from "~/components/forms/UpdateUserAvatarForm";
import { UpdateUserForm } from "~/components/forms/UpdateUserForm";
import { getTenantsQueryOptions } from "~/utils/server-fns/get-tenants";
import { getAccountRolesQueryOptions } from "~/utils/server-fns/get-user-roles";

export const Route = createFileRoute("/_app/settings")({
	component: RouteComponent,
	loader: async ({ context }) => {
		await context.queryClient.ensureQueryData(getAccountRolesQueryOptions());
	},
});

function RouteComponent() {
	const context = Route.useRouteContext();

	const { data: tenants } = useSuspenseQuery(getTenantsQueryOptions());
	const { data: rolesPerTenant } = useSuspenseQuery(
		getAccountRolesQueryOptions(),
	);

	console.log(tenants);

	if (!tenants || !rolesPerTenant) {
		return null;
	}

	return (
		<main className="container mx-auto max-w-xl space-y-6 py-8">
			<h1 className="text-2xl font-bold">Account Settings</h1>

			<UpdateUserAvatarForm
				account={context.account}
				baseApiUrl={context.BASE_API_URL}
			/>
			<UpdateUserForm account={context.account} />
			<ChangeEmailForm currentEmail={context.account?.email} />
			<ManageTenantsForm
				tenant={context.tenant}
				tenants={tenants}
				roles={rolesPerTenant}
				baseApiUrl={context.BASE_API_URL}
			/>
		</main>
	);
}
