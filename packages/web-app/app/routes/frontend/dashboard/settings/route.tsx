import {
  CHANGE_EMAIL_ROUTE_PATH,
  TENANT_DELETE_ROUTE_PATH,
  USER_GET_ROLES_ROUTE_PATH,
  USER_UPDATE_ROUTE_PATH,
  type ChangeEmailRouteResponse,
  type TenantDeleteRouteResponse,
  type UserGetRolesRouteResponse,
  type UserUpdateRouteResponse,
} from "@pacetrack/schema";
import {
  Form,
  data,
  useActionData,
  useLoaderData,
  useNavigation,
  useRouteLoaderData,
} from "react-router";
import { Button } from "~/components/primitives/button";
import { Input, InputError } from "~/components/primitives/input";
import { Label } from "~/components/primitives/label";
import { client } from "~/utils/helpers/api-client";
import type { Route } from "../+types/route";
import type { LayoutLoaderData } from "../route.root";
import { ChangeEmailForm } from "./ChangeEmailForm";
import { ManageTenantsForm } from "./ManageTenantsForm";
import { UpdateUserAvatarForm } from "./UpdateUserAvatarForm";

export async function loader({ request }: Route.LoaderArgs) {
  // Get user roles for all tenants
  const rolesResponse = await client<UserGetRolesRouteResponse>(
    USER_GET_ROLES_ROUTE_PATH,
    request,
    {
      method: "POST",
      body: JSON.stringify({}),
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  return data({
    rolesPerTenant:
      rolesResponse.data.status === "ok"
        ? rolesResponse.data.payload.roles
        : {},
  });
}

export async function action({ request }: Route.ActionArgs) {
  const form = await request.clone().formData();

  switch (form.get("action")) {
    case "update-profile": {
      const response = await client<UserUpdateRouteResponse>(
        USER_UPDATE_ROUTE_PATH,
        request,
        {
          method: "POST",
          body: form,
        }
      );
      return data(response.data);
    }
    case "update-password": {
      throw new Error("Not implemented");
    }
    case "change-email": {
      const response = await client<ChangeEmailRouteResponse>(
        CHANGE_EMAIL_ROUTE_PATH,
        request,
        {
          method: "POST",
          body: form,
        }
      );
      return data(response.data);
    }
    case "delete-tenant": {
      const response = await client<TenantDeleteRouteResponse>(
        TENANT_DELETE_ROUTE_PATH,
        request,
        {
          method: "POST",
          body: form,
        }
      );

      return data(response.data);
    }
    default: {
      throw new Error("Invalid action");
    }
  }
}

export default function SettingsRoute() {
  const layoutRouteData = useRouteLoaderData<LayoutLoaderData>(
    "routes/frontend/dashboard/route.root"
  );
  const { rolesPerTenant } = useLoaderData<typeof loader>();
  const action = useActionData<
    UserUpdateRouteResponse | TenantDeleteRouteResponse
  >();
  const navigation = useNavigation();

  const isSubmitting = navigation.state === "submitting";

  const user = layoutRouteData?.user;
  const baseApiUrl = layoutRouteData?.baseApiUrl;
  const tenants = layoutRouteData?.tenants || [];

  // Check if action is a user update response (has display_name errors)
  const userUpdateAction =
    action &&
    "errors" in action &&
    action.errors &&
    "display_name" in action.errors
      ? (action as UserUpdateRouteResponse)
      : null;

  return (
    <main className="container mx-auto max-w-xl space-y-6 py-8">
      <h1 className="text-2xl font-bold">Account Settings</h1>

      <UpdateUserAvatarForm user={user} baseApiUrl={baseApiUrl} />

      <Form method="post" encType="multipart/form-data" className="space-y-4">
        {/* action discriminator */}
        <input type="hidden" name="action" value="update-profile" />
        {/* user id needed by API */}
        <input type="hidden" name="id" value={user?.id ?? ""} />
        {/* Display name */}
        <div className="space-y-2">
          <Label htmlFor="display_name">Display name</Label>
          <div className="flex items-center gap-2">
            <Input
              id="display_name"
              name="display_name"
              defaultValue={user?.display_name ?? ""}
              placeholder="Your name"
            />
            <Button
              variant="ghost"
              type="submit"
              disabled={isSubmitting}
              className="h-[38px] w-full max-w-fit"
            >
              {isSubmitting ? "Saving…" : "Save changes"}
            </Button>
          </div>

          {userUpdateAction?.status === "error" &&
            userUpdateAction.errors?.display_name && (
              <InputError>{userUpdateAction.errors.display_name}</InputError>
            )}
        </div>
      </Form>

      {/* Change Email */}
      <ChangeEmailForm currentEmail={user?.email} />

      {/* Manage Tenants */}
      <ManageTenantsForm tenants={tenants} roles={rolesPerTenant} />
    </main>
  );
}
