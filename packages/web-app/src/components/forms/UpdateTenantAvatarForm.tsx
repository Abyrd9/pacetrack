import {
  TENANT_GET_BY_ID_ROUTE,
  TENANT_GET_ROUTE,
  type Tenant,
} from "@pacetrack/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getRouteApi, useRouter } from "@tanstack/react-router";
import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { Avatar } from "~/components/primitives/avatar";
import { Card } from "~/components/primitives/card";
import { Dialog } from "~/components/primitives/dialog";
import { ImageUploader } from "~/components/primitives/image-uploader";
import { client } from "~/utils/helpers/api-client";

export function UpdateTenantAvatarForm({
  tenant,
  baseApiUrl,
}: {
  tenant?: Tenant;
  baseApiUrl: string;
}) {
  const qc = useQueryClient();
  const [isAvatarDialogOpen, setIsAvatarDialogOpen] = useState(false);

  const router = useRouter();
  const routeApi = getRouteApi("/_app");
  const appRouteData = routeApi.useLoaderData();

  const {
    mutate: onSubmit,
    data,
    isPending,
  } = useMutation({
    mutationFn: async (form: FormData) => {
      const { data } = await client("TENANT_UPDATE_ROUTE", {
        method: "POST",
        body: form,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      return data;
    },
    onSuccess: (data) => {
      if (data.status === "ok") {
        qc.invalidateQueries({ queryKey: [TENANT_GET_ROUTE.path] });
        qc.invalidateQueries({
          queryKey: [TENANT_GET_BY_ID_ROUTE.path, tenant?.id],
        });
      }
    },
  });

  return (
    <>
      {/* Display current avatar */}
      <div className="flex items-center gap-2.5">
        <Dialog open={isAvatarDialogOpen} onOpenChange={setIsAvatarDialogOpen}>
          <Dialog.Trigger asChild>
            <button type="button" className="relative group">
              <Avatar size="lg">
                <Avatar.Image
                  src={`${baseApiUrl}/serve/${tenant?.image_url}`}
                />
                <Avatar.Fallback>
                  {tenant?.name?.charAt(0) ?? "U"}
                </Avatar.Fallback>
              </Avatar>
              <div className="absolute inset-0 bg-black/50 w-full h-full flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200">
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

                {/* Show remove option if current avatar exists */}
                {tenant?.image_url && (
                  <div className="mb-6">
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex items-center gap-3">
                        <Avatar size="lg">
                          <Avatar.Image
                            src={`${baseApiUrl}/serve/${tenant.image_url}`}
                          />
                          <Avatar.Fallback>
                            {tenant?.name?.charAt(0) ?? "U"}
                          </Avatar.Fallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            Current avatar
                          </p>
                          <p className="text-xs text-slate-500">
                            Click remove to delete this image
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const fd = new FormData();
                          fd.append("image", "REMOVE");
                          fd.append("id", tenant?.id ?? "");
                          onSubmit(fd);
                          setIsAvatarDialogOpen(false);
                        }}
                        className="px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors duration-200"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}

                <ImageUploader
                  ratio="1:1"
                  onChange={(file) => {
                    if (!file) return;
                    const fd = new FormData();
                    fd.append("image", file);
                    fd.append("id", tenant?.id ?? "");
                    onSubmit(fd);
                    setIsAvatarDialogOpen(false);
                  }}
                />
              </Dialog.Content>
            </Dialog.Overlay>
          </Dialog.Portal>
        </Dialog>
      </div>

      {isPending && (
        <p className="text-sm text-muted-foreground">Uploading avatar…</p>
      )}

      {data?.status === "error" && data?.errors?.image && (
        <Card className="border-red-300 bg-red-50 text-red-700">
          <p>{data.errors.image}</p>
        </Card>
      )}
    </>
  );
}
