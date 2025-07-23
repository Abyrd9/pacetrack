import type { UserUpdateRouteResponse, User } from "@pacetrack/schema";
import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { useFetcher } from "react-router";
import { Avatar } from "~/components/primitives/avatar";
import { Dialog } from "~/components/primitives/dialog";
import { ImageUploader } from "~/components/primitives/image-uploader";
import { Card } from "~/components/primitives/card";

export function UpdateUserAvatarForm({ user, baseApiUrl }: { user?: User, baseApiUrl: string }) {
    const [isAvatarDialogOpen, setIsAvatarDialogOpen] = useState(false);

    const fetcher = useFetcher<UserUpdateRouteResponse>();
    const data = fetcher.data;
    const isSubmitting = ["submitting", "loading"].includes(fetcher.state);

  return <>
          {/* Display current avatar */}
          <div className="flex items-center gap-2.5">
          <Dialog
            open={isAvatarDialogOpen}
            onOpenChange={setIsAvatarDialogOpen}
          >
            <Dialog.Trigger asChild>
              <button type="button" className="relative group">
                <Avatar size="lg">
                  <Avatar.Image
                    src={`${baseApiUrl}/serve/${user?.image_url}`}
                  />
                  <Avatar.Fallback>
                    {user?.display_name?.charAt(0) ?? "U"}
                  </Avatar.Fallback>
                </Avatar>
                <div className="absolute inset-0 bg-black/50 w-full h-full flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <PlusIcon />
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
                  <fetcher.Form
                    method="post"
                    encType="multipart/form-data"
                    action="."
                    className="space-y-2"
                  >
                    <input type="hidden" name="action" value="update-profile" />
                    <input type="hidden" name="id" value={user?.id ?? ""} />
                    <ImageUploader
                      ratio="1:1"
                      onChange={(file) => {
                        if (!file) return;
                        const fd = new FormData();
                        fd.append("image_url", file);
                        fd.append("action", "update-profile");
                        fd.append("id", user?.id ?? "");
                        fetcher.submit(fd, {
                          method: "post",
                          encType: "multipart/form-data",
                          action: ".",
                        });
                        setIsAvatarDialogOpen(false);
                      }}
                    />
                  </fetcher.Form>
                </Dialog.Content>
              </Dialog.Overlay>
            </Dialog.Portal>
          </Dialog>

          <div className="space-y-1 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Current avatar</p>
            <p className="text-xs">Uploading a new image will replace it.</p>
          </div>
        </div>

        {isSubmitting && (
          <p className="text-sm text-muted-foreground">Uploading avatar…</p>
        )}

        {data?.status === "error" && data?.errors?.image_url && (
          <Card className="border-red-300 bg-red-50 text-red-700">
            <p>{data.errors.image_url}</p>
          </Card>
        )}
  </>;
}