import type {
  AccountGetRouteResponse,
  TenantCreateRouteResponse,
  TenantGetByIdRouteResponse,
} from "@pacetrack/schema";
import {
  ACCOUNT_GET_ROUTE_PATH,
  TENANT_CREATE_ROUTE_PATH,
  TENANT_GET_BY_ID_ROUTE_PATH,
  TENANT_GET_ROUTE_PATH,
  USER_GET_BY_ID_ROUTE_PATH,
  VALIDATE_SESSION_ROUTE_PATH,
  type TenantGetRouteResponse,
  type UserGetByIdRouteResponse,
  type ValidateSessionRouteResponse,
} from "@pacetrack/schema";
import { Outlet, data, redirect, useLoaderData } from "react-router";
import { Sidebar } from "~/components/Sidebar";
import { client } from "~/utils/helpers/api-client";
import type { Route } from "./+types/route";

export type LayoutLoaderData = typeof loader;
export async function loader({ request }: Route.LoaderArgs) {
  const { data: json, response } = await client<ValidateSessionRouteResponse>(
    VALIDATE_SESSION_ROUTE_PATH,
    request,
    {
      method: "POST",
      body: JSON.stringify({}),
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  if (response.status === 401 || response.status === 500) {
    return redirect("/auth/sign-in");
  }

  const [userResponse, tenantResponse, tenantsResponse, accountsResponse] =
    await Promise.all([
      client<UserGetByIdRouteResponse>(USER_GET_BY_ID_ROUTE_PATH, request, {
        method: "POST",
        body: JSON.stringify({ userId: json.payload?.user_id }),
        headers: {
          "Content-Type": "application/json",
        },
      }),
      client<TenantGetByIdRouteResponse>(TENANT_GET_BY_ID_ROUTE_PATH, request, {
        method: "POST",
        body: JSON.stringify({ tenantId: json.payload?.tenant_id }),
        headers: {
          "Content-Type": "application/json",
        },
      }),
      client<TenantGetRouteResponse>(TENANT_GET_ROUTE_PATH, request),
      client<AccountGetRouteResponse>(ACCOUNT_GET_ROUTE_PATH, request),
    ]);

  console.log(userResponse.data.payload);
  console.log(tenantResponse.data.payload);
  console.log(tenantsResponse.data.payload);
  console.log(accountsResponse.data.payload);

  const notOk = [
    userResponse,
    tenantResponse,
    tenantsResponse,
    accountsResponse,
  ].some((response) => response.data.status === "error");
  if (notOk) {
    throw data("An Error Occured", { status: 500 });
  }

  if (
    !userResponse.data.payload ||
    !tenantResponse.data.payload ||
    !tenantsResponse.data.payload ||
    !accountsResponse.data.payload
  ) {
    throw data("An Error Occured", { status: 500 });
  }

  return data({
    session: json.payload?.session,
    user: userResponse.data.payload,
    tenant: tenantResponse.data.payload,
    tenants: tenantsResponse.data.payload.tenants,
    accounts: accountsResponse.data.payload?.accounts,
    baseApiUrl: import.meta.env.VITE_API_BASE_URL,
  });
}

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();

  switch (form.get("action")) {
    case "create-tenant":
      return await client<TenantCreateRouteResponse>(
        TENANT_CREATE_ROUTE_PATH,
        request,
        {
          method: "POST",
          body: form,
        }
      );
    default:
      return null;
  }
}

export default function Layout() {
  const data = useLoaderData<typeof loader>();
  const { user, tenant, tenants, accounts, baseApiUrl } = data ?? {};

  return (
    <div className="h-dvh w-full flex">
      <Sidebar
        key={tenant?.id}
        user={user}
        tenant={tenant}
        tenants={tenants}
        accounts={accounts}
        baseApiUrl={baseApiUrl}
      />
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-6 h-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
