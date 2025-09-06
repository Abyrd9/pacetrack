import {
  ACCOUNT_GET_ROLES_ROUTE,
  type Role,
  TENANT_GET_ROUTE,
  type Tenant,
  VALIDATE_SESSION_ROUTE,
} from "@pacetrack/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "~/components/primitives/button";
import { Dialog } from "~/components/primitives/dialog";
import { client } from "~/utils/helpers/api-client";
import { UpdateTenantAvatarForm } from "./UpdateTenantAvatarForm";

interface ManageTenantsFormProps {
  tenant: Tenant;
  tenants: Tenant[];
  roles: Record<string, Role>; // tenantId -> role
  baseApiUrl: string;
}

export function ManageTenantsForm({
  tenant,
  tenants,
  roles,
  baseApiUrl,
}: ManageTenantsFormProps) {
  const router = useRouter();
  const qc = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tenantToDelete, setTenantToDelete] = useState<Tenant | null>(null);

  const { mutate: onSubmit, isPending } = useMutation({
    mutationFn: async (form: FormData) => {
      const { data } = await client("TENANT_DELETE_ROUTE", {
        method: "POST",
        body: form,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      return data;
    },
    onSuccess: (data, variables) => {
      if (data.status === "ok") {
        console.log(
          "ON SUCCESS",
          data,
          variables,
          tenant,
          tenantToDelete,
          variables.get("tenantId")
        );
        setDeleteDialogOpen(false);
        setTenantToDelete(null);

        // If the tenant we're deleting is the current tenant, we need to invalidate the page
        const tenantToDeleteId = variables.get("tenantId");
        if (tenantToDeleteId === tenant.id) {
          console.log("INVALIDATING ROUTE");
          router.invalidate();
        }

        qc.invalidateQueries({ queryKey: [VALIDATE_SESSION_ROUTE.path] });
        qc.setQueryData([TENANT_GET_ROUTE.path], (old: Tenant[]) =>
          old.filter((t) => t.id !== tenantToDeleteId)
        );
        qc.invalidateQueries({ queryKey: [TENANT_GET_ROUTE.path] });
        qc.invalidateQueries({ queryKey: [ACCOUNT_GET_ROLES_ROUTE.path] });
      }
    },
  });

  const tenantsToShow: Tenant[] = [];
  for (const tenant of tenants) {
    if (tenant.kind === "personal") {
      tenantsToShow.push(tenant);
      continue;
    }

    const roleForTenant = roles[tenant.id];
    if (!roleForTenant || !roleForTenant.allowed.includes("manage_settings")) {
      continue;
    }

    tenantsToShow.push(tenant);
  }

  // Sort: personal tenants first, then others alphabetically by name
  tenantsToShow.sort((a, b) => {
    // Personal tenants always come first
    if (a.kind === "personal" && b.kind !== "personal") return -1;
    if (a.kind !== "personal" && b.kind === "personal") return 1;

    // If both are the same kind, sort alphabetically by name
    return a.name.localeCompare(b.name);
  });

  const canDeleteTenant = (tenant: Tenant) => {
    if (tenant.kind === "personal") return false;
    const roleForTenant = roles[tenant.id];
    if (!roleForTenant || !roleForTenant.allowed.includes("manage_settings")) {
      return false;
    }
    return true;
  };

  const handleDeleteClick = (tenant: Tenant) => {
    setTenantToDelete(tenant);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!tenantToDelete) return;

    const form = new FormData();
    form.append("action", "delete-tenant");
    form.append("tenantId", tenantToDelete.id);

    onSubmit(form);
  };

  if (tenantsToShow.length === 0) {
    return null; // Don't show anything if user can't delete any tenants
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Manage Organizations</h2>
        <p className="text-sm text-muted-foreground">
          Delete organizations you own. This action cannot be undone.
        </p>
      </div>

      <div className="space-y-3">
        {tenantsToShow.map((tenant) => (
          <div
            key={tenant.id}
            className="flex items-center justify-between p-4 border rounded-lg"
          >
            <div className="flex items-center gap-2">
              <UpdateTenantAvatarForm tenant={tenant} baseApiUrl={baseApiUrl} />

              <div>
                <div className="font-medium">{tenant.name}</div>
                <div className="text-sm text-muted-foreground">
                  Created{" "}
                  {tenant.created_at
                    ? new Date(tenant.created_at).toLocaleDateString()
                    : "Unknown date"}
                </div>
              </div>
            </div>

            {canDeleteTenant(tenant) && (
              <Dialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
              >
                <Dialog.Trigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteClick(tenant)}
                    className="text-red-600 border-red-600 hover:bg-red-50"
                  >
                    Delete
                  </Button>
                </Dialog.Trigger>
                <Dialog.Portal>
                  <Dialog.Overlay>
                    <Dialog.Content>
                      <Dialog.Title>Delete Organization</Dialog.Title>
                      <Dialog.Description>
                        Are you sure you want to delete "{tenant.name}"? This
                        action cannot be undone and will permanently remove the
                        organization and all its data.
                      </Dialog.Description>

                      <div className="flex justify-end gap-2 mt-6">
                        <Button
                          variant="outline"
                          onClick={() => setDeleteDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="default"
                          onClick={handleDeleteConfirm}
                          disabled={isPending}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          {isPending ? "Deleting..." : "Delete"}
                        </Button>
                      </div>
                    </Dialog.Content>
                  </Dialog.Overlay>
                </Dialog.Portal>
              </Dialog>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
