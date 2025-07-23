import type { Role, Tenant } from "@pacetrack/schema";
import { useState } from "react";
import { Form, useFetcher } from "react-router";
import { Button } from "~/components/primitives/button";
import { Dialog } from "~/components/primitives/dialog";

interface ManageTenantsFormProps {
  tenants: Tenant[];
  roles: Record<string, Role[]>; // tenantId -> roles[]
}

export function ManageTenantsForm({ tenants, roles }: ManageTenantsFormProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tenantToDelete, setTenantToDelete] = useState<Tenant | null>(null);
  const fetcher = useFetcher();

  const canDeleteTenant = (tenant: Tenant) => {
    // Can't delete personal tenants
    if (tenant.kind === "personal") return false;

    // Check if user has manage_settings permission
    const rolesForTenant = roles[tenant.id] || [];
    return rolesForTenant.some((role) =>
      role.allowed.includes("manage_settings")
    );
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

    fetcher.submit(form, {
      method: "POST",
    });

    setDeleteDialogOpen(false);
    setTenantToDelete(null);
  };

  const deletableTenants = tenants.filter(canDeleteTenant);

  if (deletableTenants.length === 0) {
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
        {deletableTenants.map((tenant) => (
          <div
            key={tenant.id}
            className="flex items-center justify-between p-4 border rounded-lg"
          >
            <div>
              <div className="font-medium">{tenant.name}</div>
              <div className="text-sm text-muted-foreground">
                Created{" "}
                {tenant.created_at
                  ? new Date(tenant.created_at).toLocaleDateString()
                  : "Unknown date"}
              </div>
            </div>

            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
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
                        disabled={fetcher.state === "submitting"}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        {fetcher.state === "submitting"
                          ? "Deleting..."
                          : "Delete"}
                      </Button>
                    </div>
                  </Dialog.Content>
                </Dialog.Overlay>
              </Dialog.Portal>
            </Dialog>
          </div>
        ))}
      </div>

      {/* Hidden form for delete action */}
      <Form method="post" className="hidden">
        <input type="hidden" name="action" value="delete-tenant" />
      </Form>
    </div>
  );
}
