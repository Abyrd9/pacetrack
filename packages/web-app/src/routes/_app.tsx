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
import { getTenantByIdQueryOptions } from "~/utils/server-fns/get-tenant-by-id";
import { getTenantsQueryOptions } from "~/utils/server-fns/get-tenants";
import { getAccountByIdQueryOptions } from "~/utils/server-fns/get-user-by-id";
import { getAccountRolesQueryOptions } from "~/utils/server-fns/get-user-roles";
import { validateSessionServerFn } from "~/utils/server-fns/validation-session";

export const Route = createFileRoute("/_app")({
  component: RouteComponent,
  staleTime: 30 * 60 * 1000, // 30 minutes
  loader: async ({ context }) => {
    const { queryClient } = context;

    const resp = await validateSessionServerFn();

    if (resp.data.status === "error") {
      throw redirect({ to: "/auth/sign-in" });
    }

    const [account, tenant, rolesByTenantId, tenants, accounts] =
      await Promise.all([
        queryClient.ensureQueryData(
          getAccountByIdQueryOptions(resp.data.payload.account_id)
        ),
        queryClient.ensureQueryData(
          getTenantByIdQueryOptions(resp.data.payload.tenant_id)
        ),
        queryClient.ensureQueryData(getAccountRolesQueryOptions()),
        queryClient.ensureQueryData(getTenantsQueryOptions()),
        queryClient.ensureQueryData(getAccountsQueryOptions()),
      ]);

    if (!account || !tenant || !tenants || !accounts) {
      throw redirect({ to: "/auth/sign-in" });
    }

    return {
      account,
      tenant,
      rolesByTenantId,
      tenants,
      accounts,
    };
  },
});

function RouteComponent() {
  const context = Route.useRouteContext();
  const data = Route.useLoaderData();

  const [
    { data: account, isLoading: accountIsLoading },
    { data: tenant, isLoading: tenantIsLoading },
    { data: rolesByTenantId, isLoading: rolesByTenantIdIsLoading },
    { data: tenants, isLoading: tenantsIsLoading },
    { data: accounts, isLoading: accountsIsLoading },
  ] = useSuspenseQueries({
    queries: [
      getAccountByIdQueryOptions(data.account.id),
      getTenantByIdQueryOptions(data.tenant.id),
      getAccountRolesQueryOptions(),
      getTenantsQueryOptions(),
      getAccountsQueryOptions(),
    ],
  });

  if (
    accountIsLoading ||
    tenantIsLoading ||
    rolesByTenantIdIsLoading ||
    tenantsIsLoading ||
    accountsIsLoading
  ) {
    return (
      <div className="h-dvh w-full flex">
        <div className="m-auto">
          <Loader2 className="w-10 h-10 animate-spin" />
        </div>
      </div>
    );
  }

  if (!account || !tenant || !tenants || !accounts) {
    return <Navigate to="/auth/sign-in" />;
  }

  return (
    <div className="h-dvh w-full flex">
      <Sidebar
        account={account}
        tenant={tenant}
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
