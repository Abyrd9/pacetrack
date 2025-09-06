import {
  ACCOUNT_GET_BY_ID_ROUTE,
  ACCOUNT_GET_ROUTE,
  type Account,
} from "@pacetrack/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { Avatar } from "~/components/primitives/avatar";
import { Card } from "~/components/primitives/card";
import { Dialog } from "~/components/primitives/dialog";
import { ImageUploader } from "~/components/primitives/image-uploader";
import { client } from "~/utils/helpers/api-client";

export function UpdateUserAvatarForm({
  account,
  baseApiUrl,
}: {
  account?: Account;
  baseApiUrl: string;
}) {
  const [isAvatarDialogOpen, setIsAvatarDialogOpen] = useState(false);
  const qc = useQueryClient();

  const {
    mutate: onSubmit,
    data,
    isPending,
  } = useMutation({
    mutationFn: async (form: FormData) => {
      const { data } = await client("ACCOUNT_UPDATE_ROUTE", {
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
        qc.invalidateQueries({
          queryKey: [ACCOUNT_GET_BY_ID_ROUTE.path, account?.id],
        });
        qc.invalidateQueries({ queryKey: [ACCOUNT_GET_ROUTE.path] });
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
                  src={`${baseApiUrl}/serve/${account?.image_url}`}
                />
                <Avatar.Fallback>
                  {account?.display_name?.charAt(0) ?? "U"}
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
                <ImageUploader
                  ratio="1:1"
                  onChange={(file) => {
                    if (!file) return;
                    const fd = new FormData();
                    fd.append("image", file);
                    fd.append("id", account?.id ?? "");
                    onSubmit(fd);
                    setIsAvatarDialogOpen(false);
                  }}
                />
              </Dialog.Content>
            </Dialog.Overlay>
          </Dialog.Portal>
        </Dialog>

        <div className="space-y-1 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Current avatar</p>
          <p className="text-xs">Uploading a new image will replace it.</p>
        </div>
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
