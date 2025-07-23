import {
  type Account,
  type Tenant,
  VALIDATE_SESSION_ROUTE,
} from "@pacetrack/schema";
import type { SessionGetAccountsMetaRouteResponse } from "@pacetrack/schema/src/routes-schema/session/session.get-accounts-meta.types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useRouter } from "@tanstack/react-router";
import {
  CheckCircleIcon,
  ChevronDownIcon,
  Edit2Icon,
  EllipsisIcon,
  LinkIcon,
  LogOut,
  PlusIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { client } from "~/utils/helpers/api-client";
import { cx } from "~/utils/helpers/cx";
import { LinkAccountForm } from "./forms/LinkAccountForm";
import { NewAccountForm } from "./forms/NewAccountForm";
import { NewTenantForm } from "./forms/NewTenantForm";
import { RemoveAccountForm } from "./forms/RemoveAccountForm";
import { Avatar } from "./primitives/avatar";
import { Button } from "./primitives/button";
import { Dialog } from "./primitives/dialog";
import { Popover } from "./primitives/popover";

function SidebarSettingsPopover({
  tenant,
  account,
  meta,
  baseApiUrl,
}: {
  tenant?: Tenant;
  account?: Account;
  meta?: SessionGetAccountsMetaRouteResponse["payload"];
  baseApiUrl?: string;
}) {
  const qc = useQueryClient();
  const router = useRouter();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openDialogState, setOpenDialogState] = useState<
    "link-account" | "new-account" | "new-tenant" | "remove-account" | null
  >(null);
  const [openAccountMenuId, setOpenAccountMenuId] = useState<string | null>(
    null
  );
  const [accountToRemove, setAccountToRemove] = useState<string | null>(null);

  // Close nested popover when any dialog opens
  useEffect(() => {
    if (openDialogState !== null) {
      setOpenAccountMenuId(null);
    }
  }, [openDialogState]);

  const { mutate: switchTenant } = useMutation({
    mutationFn: async (form: FormData) => {
      const resp = await client("SESSION_SWITCH_TENANT_ROUTE", {
        body: form,
      });

      return resp;
    },
    onSuccess: ({ data }) => {
      if (data.status === "ok") {
        qc.invalidateQueries({ queryKey: [VALIDATE_SESSION_ROUTE.path] });
        router.invalidate();
      }
    },
  });

  const tenantMeta = meta?.session
    .find(
      (m) =>
        m.account.id === account?.id &&
        m.tenants.find((t) => t.tenant.id === tenant?.id)
    )
    ?.tenants.find((t) => t.tenant.id === tenant?.id);

  const role = tenantMeta?.role;

  return (
    <>
      <Popover modal>
        <Popover.Trigger
          className={cx(
            "items-center justify-between gap-2.5 hover:bg-background-100/50 rounded-md p-2.5 w-full transition-colors duration-75 inline-flex data-[state=open]:bg-background-100/50"
          )}
        >
          <div className="flex items-center gap-2.5">
            <Avatar size="sm" square>
              <Avatar.Image
                src={`${baseApiUrl}/serve/${tenant?.image_url}fdjs`}
                alt={tenant?.name}
              />
              <Avatar.Fallback>{tenant?.name?.charAt(0)}</Avatar.Fallback>
            </Avatar>
            <span className="text-sm font-medium block truncate">
              {tenant?.name}
            </span>
          </div>
          <ChevronDownIcon />
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            className="px-1.5 py-2 origin-top-left min-w-[calc(var(--radix-popover-trigger-width)+3rem)] w-fit"
            side="bottom"
            sideOffset={5}
            align="start"
          >
            <div className="pt-1.5 pb-3 mb-2 pl-1.5 border-b border-background-100 flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5">
                <Avatar size="sm">
                  <Avatar.Image
                    src={`${baseApiUrl}/serve/${account?.image_url}`}
                  />
                  <Avatar.Fallback>
                    {account?.display_name?.charAt(0) ?? "U"}
                  </Avatar.Fallback>
                </Avatar>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-medium truncate">
                    {account?.display_name || "N/A"}
                  </span>
                  {role && (
                    <span className="text-[10px] font-semibold truncate text-muted-foreground-400">
                      {role?.name}
                    </span>
                  )}
                </div>
              </div>
              <div>
                <Popover.Close asChild>
                  <Link
                    className="rounded-md hover:bg-background-200 h-6 w-6 flex items-center justify-center"
                    to="/settings"
                    preload="intent"
                    preloadIntentProximity={50}
                  >
                    <Edit2Icon className="text-xs" />
                  </Link>
                </Popover.Close>
              </div>
            </div>
            <div>
              {meta?.session
                .sort((a, b) => a.account.email.localeCompare(b.account.email))
                .map((m, idx) => (
                  <div key={m.account.id}>
                    <div className="flex items-center justify-between gap-6 pl-1.5">
                      <span className="text-xs font-medium truncate text-foreground-500">
                        {m.account.email}
                      </span>
                      <Popover
                        modal
                        open={openAccountMenuId === m.account.id}
                        onOpenChange={(open) =>
                          setOpenAccountMenuId(open ? m.account.id : null)
                        }
                      >
                        <Popover.Trigger asChild>
                          <button
                            type="button"
                            className="p-1 rounded-md hover:bg-background-200 data-[state=open]:bg-background-200"
                          >
                            <EllipsisIcon />
                          </button>
                        </Popover.Trigger>
                        <Popover.Portal>
                          <Popover.Content
                            side="right"
                            align="start"
                            sideOffset={12}
                            className="origin-left"
                          >
                            <div className="p-1 flex flex-col space-y-0.5">
                              <button
                                type="button"
                                className="text-xs dark:text-muted text-muted-foreground font-medium hover:bg-background-200 w-full py-0.5 px-1 text-left rounded flex items-center justify-between space-x-2.5"
                                onClick={() => setOpenDialogState("new-tenant")}
                              >
                                <span>Add Workspace</span>
                                <PlusIcon className="text-xs" />
                              </button>
                              <button
                                type="button"
                                className="text-xs dark:text-muted text-muted-foreground font-medium hover:bg-background-200 w-full py-0.5 px-1 text-left rounded flex items-center justify-between space-x-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={
                                  idx === 0 && meta.session.length === 1
                                }
                                onClick={() => {
                                  setAccountToRemove(m.account.id);
                                  setOpenDialogState("remove-account");
                                }}
                              >
                                <span>Log out this Account</span>
                                <LogOut className="text-xs" />
                              </button>
                            </div>
                          </Popover.Content>
                        </Popover.Portal>
                      </Popover>
                    </div>

                    <div className="pt-1.5 pb-3 space-y-0.5">
                      {m.tenants.map((t) => (
                        <button
                          type="button"
                          key={t.tenant.id}
                          className="px-1.5 flex items-center justify-between gap-2 w-full hover:bg-background-200 rounded-md py-1.5"
                          onClick={() => {
                            const form = new FormData();
                            form.append("tenant_id", t.tenant.id);
                            switchTenant(form);
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <Avatar size="xxs" square>
                              <Avatar.Image
                                src={`${baseApiUrl}/serve/${t.tenant.image_url}`}
                                alt={t.tenant.name}
                              />
                              <Avatar.Fallback className="bg-background-200 border-background-300">
                                {t.tenant.name?.charAt(0)}
                              </Avatar.Fallback>
                            </Avatar>
                            <span className="text-sm font-medium truncate max-w-xs">
                              {t.tenant.name}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-semibold truncate bg-background-300 px-1 py-0.5 rounded-md text-muted-foreground-400">
                              {t.role.name}
                            </span>

                            <span
                              className={cx(
                                "text-sm font-medium truncate text-green-500",
                                {
                                  "opacity-0": tenant?.id !== t.tenant.id,
                                }
                              )}
                            >
                              <CheckCircleIcon />
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      className="w-full flex items-center justify-between gap-2 px-1.5 hover:bg-background-200 rounded-md py-1.5"
                      onClick={() => setOpenDialogState("new-tenant")}
                    >
                      <span className="text-xs font-medium truncate text-foreground-500">
                        New Workspace
                      </span>
                      <PlusIcon className="text-xs" />
                    </button>
                  </div>
                ))}
            </div>

            <div className="bg-background-300 rounded-md h-px w-full my-2" />
            <div className="space-y-1">
              <button
                type="button"
                className="text-xs dark:text-muted text-muted-foreground font-medium hover:bg-background-200 w-full py-1 px-2 text-left rounded flex items-center justify-between"
                onClick={() => setOpenDialogState("new-account")}
                disabled={!account?.user_id}
              >
                <span>New Account</span>
                <PlusIcon className="text-xs" />
              </button>
              <button
                type="button"
                className="text-xs dark:text-muted text-muted-foreground font-medium hover:bg-background-200 w-full py-1 px-2 text-left rounded flex items-center justify-between"
                onClick={() => setOpenDialogState("link-account")}
              >
                <span>Link Account</span>
                <LinkIcon className="text-xs" />
              </button>
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover>

      <Dialog
        open={openDialogState === "link-account"}
        onOpenChange={(open) => {
          if (!isSubmitting) {
            setOpenDialogState(open ? "link-account" : null);
          }
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay>
            <Dialog.Content>
              <Dialog.Title>Link Account</Dialog.Title>
              <Dialog.Description>
                Sign into an existing account to link it with your current
                account
              </Dialog.Description>
              <div className="mt-4">
                <LinkAccountForm
                  onMutate={() => setIsSubmitting(true)}
                  onSuccess={() => {
                    setIsSubmitting(false);
                    setOpenDialogState(null);
                  }}
                  onError={() => setIsSubmitting(false)}
                />
              </div>
            </Dialog.Content>
          </Dialog.Overlay>
        </Dialog.Portal>
      </Dialog>

      {account?.user_id && (
        <Dialog
          open={openDialogState === "new-account"}
          onOpenChange={(open) => {
            if (!isSubmitting) {
              setOpenDialogState(open ? "new-account" : null);
            }
          }}
        >
          <Dialog.Portal>
            <Dialog.Overlay>
              <Dialog.Content>
                <Dialog.Title>New Account</Dialog.Title>
                <Dialog.Description>Create a new account</Dialog.Description>
                <div className="mt-4">
                  <NewAccountForm
                    onMutate={() => setIsSubmitting(true)}
                    onSuccess={() => {
                      setIsSubmitting(false);
                      setOpenDialogState(null);
                    }}
                    onError={() => setIsSubmitting(false)}
                    userId={account.user_id}
                  />
                </div>
              </Dialog.Content>
            </Dialog.Overlay>
          </Dialog.Portal>
        </Dialog>
      )}

      <Dialog
        open={openDialogState === "new-tenant"}
        onOpenChange={(open) => {
          if (!isSubmitting) {
            setOpenDialogState(open ? "new-tenant" : null);
          }
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay>
            <Dialog.Content className="max-w-md">
              <Dialog.Title>Create New Workspace</Dialog.Title>
              <Dialog.Description>
                Create a new workspace to manage your projects and team members.
              </Dialog.Description>

              <NewTenantForm
                onMutate={() => setIsSubmitting(true)}
                onSuccess={() => {
                  setIsSubmitting(false);
                  setOpenDialogState(null);
                }}
                onError={() => setIsSubmitting(false)}
                account={account}
              />
            </Dialog.Content>
          </Dialog.Overlay>
        </Dialog.Portal>
      </Dialog>

      <Dialog
        open={openDialogState === "remove-account"}
        onOpenChange={(open) => {
          if (!isSubmitting) {
            setOpenDialogState(open ? "remove-account" : null);
            if (!open) setAccountToRemove(null);
          }
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay>
            <Dialog.Content>
              <Dialog.Title>Remove Account</Dialog.Title>
              <Dialog.Description>
                Remove this account from your session. If this is your only
                account, you will be logged out completely.
              </Dialog.Description>
              <div className="flex justify-end gap-2 mt-6">
                <Dialog.Close asChild>
                  <Button variant="outline">Cancel</Button>
                </Dialog.Close>

                {accountToRemove && (
                  <RemoveAccountForm
                    accountId={accountToRemove}
                    onMutate={() => setIsSubmitting(true)}
                    onSuccess={() => {
                      setIsSubmitting(false);
                      setOpenDialogState(null);
                      setAccountToRemove(null);
                    }}
                    onError={() => setIsSubmitting(false)}
                  />
                )}
              </div>
            </Dialog.Content>
          </Dialog.Overlay>
        </Dialog.Portal>
      </Dialog>
    </>
  );
}

export { SidebarSettingsPopover };
