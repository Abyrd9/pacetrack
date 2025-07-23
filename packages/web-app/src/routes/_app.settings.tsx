import { useZodForm } from "@abyrd9/zod-form-data";
import {
  ACCOUNT_CHANGE_EMAIL_ROUTE,
  ACCOUNT_GET_BY_ID_ROUTE,
  ACCOUNT_GET_ROUTE,
  type Role,
  type Tenant,
  VALIDATE_SESSION_ROUTE,
} from "@pacetrack/schema";
import {
  useMutation,
  useQueryClient,
  useSuspenseQueries,
} from "@tanstack/react-query";
import {
  createFileRoute,
  getRouteApi,
  useRouter,
} from "@tanstack/react-router";
import {
  ArrowLeftRightIcon,
  EditIcon,
  EllipsisVerticalIcon,
  PlusIcon,
  SendIcon,
  TrashIcon,
} from "lucide-react";
import { useState } from "react";
import { Avatar } from "~/components/primitives/avatar";
import { Button } from "~/components/primitives/button";
import { Dialog } from "~/components/primitives/dialog";
import { DropdownMenu } from "~/components/primitives/dropdown-menu";
import { IconButton } from "~/components/primitives/icon-button";
import { ImageUploader } from "~/components/primitives/image-uploader";
import { Input, InputError } from "~/components/primitives/input";
import { Label } from "~/components/primitives/label";
import { Tooltip } from "~/components/primitives/tooltip";
import { client } from "~/utils/helpers/api-client";
import { cx } from "~/utils/helpers/cx";
import { getAccountsMetaQueryOptions } from "~/utils/server-fns/get-accounts-meta";
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
  const router = useRouter();
  const context = Route.useRouteContext();
  const routeApi = getRouteApi("/_app");
  const data = routeApi.useLoaderData();

  const qc = useQueryClient();

  const [openDialogState, setOpenDialogState] = useState<
    "avatar" | "display_name" | "change_email" | null
  >(null);

  // Update Account
  const { mutate: onSubmitAccountUpdate, isPending: accountUpdateIsPending } =
    useMutation({
      mutationFn: async (form: FormData) => {
        const { data } = await client("ACCOUNT_UPDATE_ROUTE", {
          body: form,
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        return data;
      },
      onSuccess: (data) => {
        if (data.status === "ok") {
          const accountGetByIdKey = [ACCOUNT_GET_BY_ID_ROUTE.path, account?.id];
          qc.invalidateQueries({ queryKey: accountGetByIdKey });

          const accountGetRouteKey = [ACCOUNT_GET_ROUTE.path];
          qc.invalidateQueries({ queryKey: accountGetRouteKey });

          setOpenDialogState(null);
        }
      },
    });

  // Change Email
  const {
    mutate: onSubmitChangeEmail,
    data: changeEmailData,
    isPending: changeEmailIsPending,
  } = useMutation({
    mutationFn: async (form: FormData) => {
      const { data } = await client("ACCOUNT_CHANGE_EMAIL_ROUTE", {
        body: form,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      return data;
    },
  });

  // Switch Tenant
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
        qc.invalidateQueries({
          queryKey: getAccountsMetaQueryOptions().queryKey,
        });
        router.invalidate();
      }
    },
  });

  // Delete Tenant
  const [deleteTenantMessages, setDeleteTenantMessages] = useState<string[]>(
    []
  );
  const {
    data: deleteTenantData,
    mutate: deleteTenant,
    isPending: deleteTenantIsPending,
  } = useMutation({
    mutationFn: async (form: FormData) => {
      const resp = await client("TENANT_DELETE_ROUTE", {
        body: form,
      });

      return resp;
    },
    onSuccess: ({ data }) => {
      if (data.status === "ok") {
        const messages = data.payload?.messages ?? [];
        if (messages.length > 0) {
          if (messages.includes("Tenant deleted")) {
            // The tenant was successfully deleted
            qc.invalidateQueries({ queryKey: [VALIDATE_SESSION_ROUTE.path] });
            qc.invalidateQueries({
              queryKey: getAccountsMetaQueryOptions().queryKey,
            });
            router.invalidate();
          } else {
            setDeleteTenantMessages(messages);
          }
        }
      }
    },
  });

  const { fields } = useZodForm({
    schema: ACCOUNT_CHANGE_EMAIL_ROUTE.request,
    errors: changeEmailData?.errors,
  });

  const [
    { data: account },
    { data: tenant },
    { data: tenants },
    { data: meta },
  ] = useSuspenseQueries({
    queries: [
      getAccountByIdQueryOptions(data.account.id),
      getTenantByIdQueryOptions(data.tenant.id),
      getTenantsQueryOptions(),
      getAccountsMetaQueryOptions(data.meta),
    ],
  });

  if (!account || !tenant || !tenants) {
    return null;
  }

  const role = data.meta?.session
    .find(
      (m) =>
        m.account.id === account?.id &&
        m.tenants.find((t) => t.tenant.id === tenant?.id)
    )
    ?.tenants.find((t) => t.tenant.id === tenant?.id)?.role;

  return (
    <main className="container mx-auto max-w-xl space-y-10 py-8">
      <div>
        <h1 className="text-2xl font-bold">Account Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your account settings and preferences.
        </p>
      </div>

      <div>
        <div className="font-medium border-b border-background-100 pb-1 mb-2">
          Account Profile Settings
        </div>
        <div className="flex items-center gap-3">
          <Dialog
            open={
              (accountUpdateIsPending && openDialogState === "avatar") ||
              openDialogState === "avatar"
            }
            onOpenChange={(open) => {
              if (!accountUpdateIsPending) {
                setOpenDialogState(open ? "avatar" : null);
              }
            }}
          >
            <Dialog.Trigger asChild>
              <button type="button" className="relative group block">
                <Avatar size="lg">
                  <Avatar.Image
                    src={`${context.BASE_API_URL}/serve/${account?.image_url}`}
                  />
                  <Avatar.Fallback>
                    {account?.display_name
                      ? account?.display_name?.charAt(0)
                      : "U"}
                  </Avatar.Fallback>
                </Avatar>
                <div className="absolute inset-0 bg-black/50 min-w-[48px] w-full h-full flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <PlusIcon className="text-white" />
                </div>
              </button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay>
                <Dialog.Content>
                  <Dialog.Title>Update Avatar</Dialog.Title>
                  <Dialog.Description className="mb-4">
                    Upload a new avatar for your account.
                  </Dialog.Description>
                  <ImageUploader
                    ratio="1:1"
                    onChange={(file) => {
                      if (!file) return;
                      const fd = new FormData();
                      fd.append("image", file);
                      fd.append("id", account?.id ?? "");
                      onSubmitAccountUpdate(fd);
                      setOpenDialogState(null);
                    }}
                  />
                </Dialog.Content>
              </Dialog.Overlay>
            </Dialog.Portal>
          </Dialog>

          <div className="space-y-0.5 text-sm text-muted-foreground w-full pr-2.5">
            <div className="flex items-center gap-1.5 justify-between w-full">
              <p className="text-xs font-medium">Display Name:</p>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-900 w-fit">
                {role?.name}
              </span>
            </div>

            <span className="flex items-center gap-0.5 group">
              <p className="font-medium text-[13px] text-foreground">
                {account?.display_name || "N/A"}
              </p>
              <Dialog
                open={
                  (accountUpdateIsPending &&
                    openDialogState === "display_name") ||
                  openDialogState === "display_name"
                }
                onOpenChange={(open) => {
                  if (!accountUpdateIsPending) {
                    setOpenDialogState(open ? "display_name" : null);
                  }
                }}
              >
                <Tooltip delayDuration={200}>
                  <Tooltip.Trigger asChild>
                    <span>
                      <Dialog.Trigger asChild>
                        <IconButton
                          variant="transparent"
                          size="xss"
                          className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                        >
                          <EditIcon />
                        </IconButton>
                      </Dialog.Trigger>
                    </span>
                  </Tooltip.Trigger>
                  <Tooltip.Content
                    side="right"
                    align="center"
                    className="px-2 py-0.5"
                    sideOffset={8}
                  >
                    <span className="text-[10px]">Edit display name</span>
                  </Tooltip.Content>
                </Tooltip>

                <Dialog.Portal>
                  <Dialog.Overlay>
                    <Dialog.Content>
                      <Dialog.Title>Update Display Name</Dialog.Title>
                      <Dialog.Description className="mb-4">
                        Update your display name.
                      </Dialog.Description>
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const formData = new FormData(
                            e.target as HTMLFormElement
                          );
                          onSubmitAccountUpdate(formData);
                        }}
                      >
                        {/* user id needed by API */}
                        <input
                          type="hidden"
                          name="id"
                          value={account?.id ?? ""}
                        />
                        <Input
                          name="display_name"
                          defaultValue={account?.display_name ?? ""}
                          placeholder="Your name"
                        />
                        <div className="flex justify-end gap-2 mt-6">
                          <Dialog.Close asChild>
                            <Button disabled={accountUpdateIsPending}>
                              Cancel
                            </Button>
                          </Dialog.Close>
                          <Button
                            type="submit"
                            isLoading={accountUpdateIsPending}
                          >
                            <Button.Loader>
                              <span>Save changes</span>
                            </Button.Loader>
                          </Button>
                        </div>
                      </form>
                    </Dialog.Content>
                  </Dialog.Overlay>
                </Dialog.Portal>
              </Dialog>
            </span>
          </div>
        </div>
      </div>

      <div>
        <div className="font-medium border-b border-background-100 pb-1 mb-2">
          Current Account Email
        </div>
        <div className="flex items-center gap-3 justify-between">
          <p className="text-[13px]">{account?.email || "N/A"}</p>
          <Dialog
            open={
              (changeEmailIsPending && openDialogState === "change_email") ||
              openDialogState === "change_email"
            }
            onOpenChange={(open) => {
              if (!changeEmailIsPending) {
                setOpenDialogState(open ? "change_email" : null);
              }
            }}
          >
            <Dialog.Trigger asChild>
              <Button size="sm" className="py-1.5 px-2 text-[11px]">
                Change email
              </Button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay>
                <Dialog.Content>
                  <Dialog.Title>Change Email</Dialog.Title>
                  <Dialog.Description className="mb-4">
                    Update your email address.
                  </Dialog.Description>

                  <form
                    method="POST"
                    encType="multipart/form-data"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(
                        e.target as HTMLFormElement
                      );
                      onSubmitChangeEmail(formData);
                    }}
                  >
                    <input type="hidden" name="action" value="change-email" />
                    <div className="space-y-2">
                      <div className="pb-3">
                        <Label htmlFor={fields.email.name}>
                          Update email address
                        </Label>
                        <Input
                          type="email"
                          id={fields.email.name}
                          name={fields.email.name}
                          value={fields.email.value}
                          disabled={
                            changeEmailIsPending ||
                            changeEmailData?.status === "ok"
                          }
                          onChange={(e) =>
                            fields.email.onChange(e.target.value)
                          }
                          placeholder="new.address@example.com"
                        />

                        {changeEmailData?.status === "ok" && (
                          <p className="text-sm text-muted-foreground">
                            A confirmation link has been sent to{" "}
                            {changeEmailData.payload?.email}. Please check your
                            inbox.
                          </p>
                        )}

                        {fields.email.error && (
                          <InputError>{fields.email.error}</InputError>
                        )}
                      </div>

                      <div className="flex justify-end gap-2">
                        <Dialog.Close asChild>
                          <Button disabled={changeEmailIsPending}>
                            Cancel
                          </Button>
                        </Dialog.Close>
                        <Button
                          isLoading={changeEmailIsPending}
                          disabled={changeEmailIsPending}
                          type="submit"
                          className="space-x-2 block w-full max-w-fit"
                        >
                          <Button.Loader className="flex items-center space-x-2">
                            <span>Send confirmation</span>
                            <SendIcon className="text-xs" />
                          </Button.Loader>
                        </Button>
                      </div>
                    </div>
                  </form>
                </Dialog.Content>
              </Dialog.Overlay>
            </Dialog.Portal>
          </Dialog>
        </div>
      </div>

      <div>
        <div className="font-medium border-b border-background-100 pb-1 mb-3">
          Account & Tenant Management
        </div>
        <div className="space-y-4">
          {meta?.all
            .sort((a, b) => a.account.email.localeCompare(b.account.email))
            .map((m) => (
              <div
                key={m.account.id}
                className="border border-background-200 rounded-lg p-4 bg-background-50/30"
              >
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <Avatar size="xs">
                      <Avatar.Image
                        src={`${context.BASE_API_URL}/serve/${m.account.image_url}`}
                      />
                      <Avatar.Fallback>
                        {m.account.display_name?.charAt(0) ??
                          m.account.email.charAt(0).toUpperCase()}
                      </Avatar.Fallback>
                    </Avatar>
                    <span className="text-sm font-medium">
                      {m.account.email}
                    </span>
                  </div>
                  <IconButton size="xss" variant="ghost">
                    <EllipsisVerticalIcon />
                  </IconButton>
                </div>
                <div className="space-y-2">
                  {m.tenants.map((t) => (
                    <TenantRow
                      key={t.tenant.id}
                      tenant={t.tenant}
                      role={t.role}
                      isCurrent={tenant?.id === t.tenant.id}
                    />
                    // <div key={t.tenant.id}>
                    //   <div
                    //     className={cx(
                    //       "px-3 py-2.5 flex items-center justify-between gap-2 w-full rounded-md transition-colors",
                    //       tenant?.id === t.tenant.id
                    //         ? "bg-blue-50 border border-blue-200 dark:bg-blue-950/30 dark:border-blue-900"
                    //         : "bg-background-100/60 border border-transparent"
                    //     )}
                    //   >
                    //     <div className="flex items-center gap-2.5">
                    //       <Avatar size="xxs" square>
                    //         <Avatar.Image
                    //           src={`${context.BASE_API_URL}/serve/${t.tenant.image_url}`}
                    //           alt={t.tenant.name}
                    //         />
                    //         <Avatar.Fallback className="bg-background-200 border-background-300 text-[10px]">
                    //           {t.tenant.name?.charAt(0)}
                    //         </Avatar.Fallback>
                    //       </Avatar>
                    //       <span className="text-sm font-medium truncate">
                    //         {t.tenant.name}
                    //       </span>
                    //     </div>

                    //     <div className="flex items-center gap-2">
                    //       <span
                    //         className={cx(
                    //           "text-[10px] font-semibold px-1.5 py-0.5 rounded-md whitespace-nowrap",
                    //           tenant?.id === t.tenant.id
                    //             ? "bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100"
                    //             : "bg-background-300 text-muted-foreground-400"
                    //         )}
                    //       >
                    //         {t.role.name}
                    //       </span>

                    //       <DropdownMenu>
                    //         <DropdownMenu.Trigger>
                    //           <IconButton
                    //             color={
                    //               tenant?.id === t.tenant.id
                    //                 ? "#3b82f6"
                    //                 : undefined
                    //             }
                    //             size="xss"
                    //             variant={
                    //               tenant?.id === t.tenant.id
                    //                 ? "ghost"
                    //                 : undefined
                    //             }
                    //           >
                    //             <EllipsisVerticalIcon />
                    //           </IconButton>
                    //         </DropdownMenu.Trigger>
                    //         <DropdownMenu.Portal>
                    //           <DropdownMenu.Content
                    //             side="right"
                    //             align="start"
                    //             sideOffset={5}
                    //             alignOffset={-10}
                    //           >
                    //             <DropdownMenu.Item
                    //               className="flex items-center gap-2.5"
                    //               disabled={tenant?.id === t.tenant.id}
                    //               onClick={() => {
                    //                 if (tenant?.id !== t.tenant.id) {
                    //                   const form = new FormData();
                    //                   form.append("tenant_id", t.tenant.id);
                    //                   switchTenant(form);
                    //                 }
                    //               }}
                    //             >
                    //               <span className="text-xs">Switch tenant</span>
                    //               <ArrowLeftRightIcon className="text-xs" />
                    //             </DropdownMenu.Item>
                    //             <DropdownMenu.Item
                    //               className="flex items-center gap-2.5"
                    //               onClick={() => {
                    //                 const form = new FormData();
                    //                 form.append("tenant_id", t.tenant.id);
                    //                 deleteTenant(form);
                    //               }}
                    //             >
                    //               <span className="text-xs">Delete tenant</span>
                    //               <TrashIcon className="text-xs" />
                    //             </DropdownMenu.Item>
                    //           </DropdownMenu.Content>
                    //         </DropdownMenu.Portal>
                    //       </DropdownMenu>
                    //     </div>
                    //   </div>
                    //   {deleteTenantData?.data.status === "error" && (
                    //     <>
                    //       {deleteTenantData?.data.errors?.global && (
                    //         <InputError>
                    //           {deleteTenantData?.data.errors?.global}
                    //         </InputError>
                    //       )}
                    //       {deleteTenantData?.data.errors?.form && (
                    //         <InputError>
                    //           {deleteTenantData?.data.errors?.form}
                    //         </InputError>
                    //       )}
                    //     </>
                    //   )}
                    // </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      </div>

      <div>
        <div className="font-medium text-red-500 border-b border-red-500 pb-1 mb-2">
          Danger Zone
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="text-xs text-muted-foreground">
            Delete your account and all associated data.
          </div>
          <Dialog>
            <Dialog.Trigger asChild>
              <Button size="sm" className="py-1.5 px-2 text-[11px]">
                Delete Account
              </Button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay>
                <Dialog.Content>
                  <Dialog.Title>Delete Account</Dialog.Title>
                  <Dialog.Description>
                    Delete your account and all associated data. This action
                    cannot be undone.
                  </Dialog.Description>
                  <div className="flex justify-end gap-2 mt-6">
                    <Dialog.Close asChild>
                      <Button variant="outline">Cancel</Button>
                    </Dialog.Close>
                    <Button
                      isLoading={deleteTenantIsPending}
                      onClick={() => {
                        const form = new FormData();
                        form.append("account_id", account?.id ?? "");
                        form.append("bypassNonCriticalBlockers", "true");
                        deleteTenant(form);
                      }}
                    >
                      <Button.Loader>
                        <span>Delete Account</span>
                      </Button.Loader>
                    </Button>
                  </div>
                </Dialog.Content>
              </Dialog.Overlay>
            </Dialog.Portal>
          </Dialog>
        </div>
      </div>

      <Dialog
        open={deleteTenantMessages.length > 0}
        onOpenChange={(toggle) => {
          if (!toggle) setDeleteTenantMessages([]);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay>
            <Dialog.Content>
              <Dialog.Title>Delete Account</Dialog.Title>
              <Dialog.Description>
                {deleteTenantMessages.join("\n")}
              </Dialog.Description>
              <div className="flex justify-end gap-2 mt-6">
                <Dialog.Close asChild>
                  <Button variant="outline">Cancel</Button>
                </Dialog.Close>
                <Button onClick={() => deleteTenant(new FormData())}>
                  Delete Account
                </Button>
              </div>
            </Dialog.Content>
          </Dialog.Overlay>
        </Dialog.Portal>
      </Dialog>
    </main>
  );
}

function TenantRow({
  tenant,
  role,
  isCurrent,
}: {
  tenant: Tenant;
  role: Role;
  isCurrent: boolean;
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const context = Route.useRouteContext();

  // Switch Tenant
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
        qc.invalidateQueries({
          queryKey: getAccountsMetaQueryOptions().queryKey,
        });
        router.invalidate();
      }
    },
  });

  const { data: deleteTenantData, mutate: deleteTenant } = useMutation({
    mutationFn: async (form: FormData) => {
      const resp = await client("TENANT_DELETE_ROUTE", {
        body: form,
      });

      return resp;
    },
    onSuccess: ({ data }) => {
      if (data.status === "ok") {
        const messages = data.payload?.messages ?? [];
        if (messages.length > 0) {
          if (messages.includes("Tenant deleted")) {
            // The tenant was successfully deleted
            qc.invalidateQueries({ queryKey: [VALIDATE_SESSION_ROUTE.path] });
            qc.invalidateQueries({
              queryKey: getAccountsMetaQueryOptions().queryKey,
            });
            router.invalidate();
          }
        }
      }
    },
  });

  const { data: deleteAccountData, mutate: deleteAccount } = useMutation({
    mutationFn: async (form: FormData) => {
      const resp = await client("ACCOUNT_DELETE_ROUTE", {
        body: form,
      });

      return resp;
    },
    onSuccess: ({ data }) => {
      if (data.status === "ok") {
        qc.invalidateQueries({ queryKey: [VALIDATE_SESSION_ROUTE.path] });
        qc.invalidateQueries({
          queryKey: getAccountsMetaQueryOptions().queryKey,
        });
        router.invalidate();
      }
    },
  });

  return (
    <div>
      <div
        className={cx(
          "px-3 py-2.5 flex items-center justify-between gap-2 w-full rounded-md transition-colors",
          isCurrent
            ? "bg-blue-50 border border-blue-200 dark:bg-blue-950/30 dark:border-blue-900"
            : "bg-background-100/60 border border-transparent"
        )}
      >
        <div className="flex items-center gap-2.5">
          <Avatar size="xxs" square>
            <Avatar.Image
              src={`${context.BASE_API_URL}/serve/${tenant.image_url}`}
              alt={tenant.name}
            />
            <Avatar.Fallback className="bg-background-200 border-background-300 text-[10px]">
              {tenant.name?.charAt(0)}
            </Avatar.Fallback>
          </Avatar>
          <span className="text-sm font-medium truncate">{tenant.name}</span>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={cx(
              "text-[10px] font-semibold px-1.5 py-0.5 rounded-md whitespace-nowrap",
              isCurrent
                ? "bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100"
                : "bg-background-300 text-muted-foreground-400"
            )}
          >
            {role.name}
          </span>

          <DropdownMenu>
            <DropdownMenu.Trigger>
              <IconButton
                color={isCurrent ? "#3b82f6" : undefined}
                size="xss"
                variant={isCurrent ? "ghost" : undefined}
              >
                <EllipsisVerticalIcon />
              </IconButton>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                side="right"
                align="start"
                sideOffset={5}
                alignOffset={-10}
              >
                <DropdownMenu.Item
                  className="flex items-center gap-2.5"
                  disabled={isCurrent}
                  onClick={() => {
                    if (!isCurrent) {
                      const form = new FormData();
                      form.append("tenant_id", tenant.id);
                      switchTenant(form);
                    }
                  }}
                >
                  <span className="text-xs">Switch tenant</span>
                  <ArrowLeftRightIcon className="text-xs" />
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  className="flex items-center gap-2.5"
                  onClick={() => {
                    const form = new FormData();
                    form.append("tenant_id", tenant.id);
                    deleteTenant(form);
                  }}
                >
                  <span className="text-xs">Delete tenant</span>
                  <TrashIcon className="text-xs" />
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu>
        </div>
      </div>
      {deleteTenantData?.data.status === "error" && (
        <>
          {deleteTenantData?.data.errors?.global && (
            <InputError>{deleteTenantData?.data.errors?.global}</InputError>
          )}
          {deleteTenantData?.data.errors?.form && (
            <InputError>{deleteTenantData?.data.errors?.form}</InputError>
          )}
        </>
      )}
    </div>
  );
}
