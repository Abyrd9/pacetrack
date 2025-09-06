import { useSuspenseQueries } from "@tanstack/react-query";
import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import { ChangeEmailForm } from "~/components/forms/ChangeEmailForm";
import { ManageTenantsForm } from "~/components/forms/ManageTenantsForm";
import { UpdateUserAvatarForm } from "~/components/forms/UpdateUserAvatarForm";
import { UpdateUserForm } from "~/components/forms/UpdateUserForm";
import { getTenantByIdQueryOptions } from "~/utils/server-fns/get-tenant-by-id";
import { getTenantsQueryOptions } from "~/utils/server-fns/get-tenants";
import { getAccountByIdQueryOptions } from "~/utils/server-fns/get-user-by-id";
import { getAccountRolesQueryOptions } from "~/utils/server-fns/get-user-roles";

export const Route = createFileRoute("/_app/settings")({
  component: RouteComponent,
  loader: async ({ context }) => {
    console.log("LOADER IS CALLED (SETTINGS)");
    await context.queryClient.ensureQueryData(getAccountRolesQueryOptions());
  },
});

function RouteComponent() {
  const context = Route.useRouteContext();
  const routeApi = getRouteApi("/_app");
  const data = routeApi.useLoaderData();

  const [
    { data: account },
    { data: tenant },
    { data: tenants },
    { data: rolesPerTenant },
  ] = useSuspenseQueries({
    queries: [
      getAccountByIdQueryOptions(data.account.id),
      getTenantByIdQueryOptions(data.tenant.id),
      getTenantsQueryOptions(),
      getAccountRolesQueryOptions(),
    ],
  });

  if (!account || !tenant || !tenants || !rolesPerTenant) {
    return null;
  }

  return (
    <main className="container mx-auto max-w-xl space-y-6 py-8">
      <h1 className="text-2xl font-bold">Account Settings</h1>

      <UpdateUserAvatarForm
        account={account}
        baseApiUrl={context.BASE_API_URL}
      />
      <UpdateUserForm account={account} />
      <ChangeEmailForm currentEmail={account?.email} />
      <ManageTenantsForm
        tenant={tenant}
        tenants={tenants}
        roles={rolesPerTenant}
        baseApiUrl={context.BASE_API_URL}
      />
    </main>
  );
}
