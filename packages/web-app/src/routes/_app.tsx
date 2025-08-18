import { useSuspenseQueries } from "@tanstack/react-query";
import {
	createFileRoute,
	Navigate,
	Outlet,
	redirect,
} from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { Sidebar } from "~/components/Sidebar";
import { getAccountsQueryOptions } from "~/utils/server-fns/get-accounts";
import { getTenantByIdServerFn } from "~/utils/server-fns/get-tenant-by-id";
import { getTenantsQueryOptions } from "~/utils/server-fns/get-tenants";
import { getAccountByIdServerFn } from "~/utils/server-fns/get-user-by-id";
import { getAccountRolesServerFn } from "~/utils/server-fns/get-user-roles";
import { validateSessionServerFn } from "~/utils/server-fns/validation-session";

export const Route = createFileRoute("/_app")({
	component: RouteComponent,
	beforeLoad: async () => {
		const resp = await validateSessionServerFn();

		if (resp.data.status === "error") {
			throw redirect({ to: "/auth/sign-in" });
		}

		const [account, tenant, roles] = await Promise.all([
			getAccountByIdServerFn({
				data: {
					accountId: resp.data.payload.account_id,
				},
			}),
			getTenantByIdServerFn({
				data: {
					tenantId: resp.data.payload.tenant_id,
				},
			}),
			getAccountRolesServerFn(),
		]);

		if (!account || !tenant) {
			throw redirect({ to: "/auth/sign-in" });
		}

		const rolesByTenantId = roles[tenant.id];

		if (!rolesByTenantId) {
			throw redirect({ to: "/auth/sign-in" });
		}

		return {
			account,
			tenant,
			rolesByTenantId,
		};
	},
	loader: async ({ context }) => {
		const { queryClient } = context;
		const [tenants, accounts] = await Promise.all([
			queryClient.ensureQueryData(getTenantsQueryOptions()),
			queryClient.ensureQueryData(getAccountsQueryOptions()),
		]);

		if (!tenants || !accounts) {
			throw redirect({ to: "/auth/sign-in" });
		}
	},
});

function RouteComponent() {
	const context = Route.useRouteContext();

	const [
		{ data: tenants, isLoading: tenantsIsLoading },
		{ data: accounts, isLoading: accountsIsLoading },
	] = useSuspenseQueries({
		queries: [getTenantsQueryOptions(), getAccountsQueryOptions()],
	});

	if (tenantsIsLoading || accountsIsLoading) {
		return (
			<div className="h-dvh w-full flex">
				<div className="m-auto">
					<Loader2 className="w-10 h-10 animate-spin" />
				</div>
			</div>
		);
	}

	if (!tenants || !accounts) {
		return <Navigate to="/auth/sign-in" />;
	}

	return (
		<div className="h-dvh w-full flex">
			<Sidebar
				account={context.account}
				tenant={context.tenant}
				tenants={tenants}
				accounts={accounts}
				baseApiUrl={context.BASE_API_URL}
			/>
			<main className="flex-1 overflow-auto">
				<div className="max-w-7xl mx-auto p-6 h-full flex flex-col">
					<Outlet />
				</div>
			</main>
		</div>
	);
}
