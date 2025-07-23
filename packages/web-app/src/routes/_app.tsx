import { useSuspenseQueries } from "@tanstack/react-query";
import {
  createFileRoute,
  Navigate,
  Outlet,
  redirect,
} from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { Sidebar } from "~/components/Sidebar";
import { getAccountsMetaQueryOptions } from "~/utils/server-fns/get-accounts-meta";
import { getTenantByIdQueryOptions } from "~/utils/server-fns/get-tenant-by-id";
import { getAccountByIdQueryOptions } from "~/utils/server-fns/get-user-by-id";
import { getAccountRolesQueryOptions } from "~/utils/server-fns/get-user-roles";
import { signOutServerFn } from "~/utils/server-fns/sign-out";
import { validateSessionServerFn } from "~/utils/server-fns/validation-session";

export const Route = createFileRoute("/_app")({
  component: RouteComponent,
  staleTime: 30 * 60 * 1000, // 30 minutes
  loader: async ({ context }) => {
    const { queryClient } = context;

    const resp = await validateSessionServerFn();

    if (resp.data.status === "error") {
      await signOutServerFn();
      throw redirect({ to: "/auth/sign-in" });
    }

    try {
      const [account, tenant, rolesByTenantId, meta] = await Promise.all([
        queryClient.ensureQueryData(
          getAccountByIdQueryOptions(resp.data.payload.account_id)
        ),
        queryClient.ensureQueryData(
          getTenantByIdQueryOptions(resp.data.payload.tenant_id)
        ),
        queryClient.ensureQueryData(getAccountRolesQueryOptions()),
        queryClient.ensureQueryData(getAccountsMetaQueryOptions()),
      ]);

      if (!account || !tenant || !meta) {
        throw redirect({ to: "/auth/sign-in" });
      }

      return {
        account,
        tenant,
        rolesByTenantId,
        meta,
      };
    } catch (error) {
      console.error(error);
      await signOutServerFn();
      throw redirect({ to: "/auth/sign-in" });
    }
  },
});

function RouteComponent() {
  const context = Route.useRouteContext();
  const data = Route.useLoaderData();

  const [
    { data: account, isLoading: accountIsLoading },
    { data: tenant, isLoading: tenantIsLoading },
    { data: rolesByTenantId, isLoading: rolesByTenantIdIsLoading },
    { data: meta, isLoading: metaIsLoading },
  ] = useSuspenseQueries({
    queries: [
      getAccountByIdQueryOptions(data.account.id),
      getTenantByIdQueryOptions(data.tenant.id),
      getAccountRolesQueryOptions(),
      getAccountsMetaQueryOptions(),
    ],
  });

  if (
    accountIsLoading ||
    tenantIsLoading ||
    rolesByTenantIdIsLoading ||
    metaIsLoading
  ) {
    return (
      <div className="h-dvh w-full flex">
        <div className="m-auto">
          <Loader2 className="w-10 h-10 animate-spin" />
        </div>
      </div>
    );
  }

  if (!account || !tenant || !meta) {
    return <Navigate to="/auth/sign-in" />;
  }

  return (
    <div className="h-dvh w-full flex">
      <Sidebar
        account={account}
        tenant={tenant}
        meta={meta}
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
