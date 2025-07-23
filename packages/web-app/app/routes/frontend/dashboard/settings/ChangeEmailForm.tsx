import { useZodForm } from "@abyrd9/zod-form-data";
import {
  CHANGE_EMAIL_ROUTE_PATH,
  type ChangeEmailRouteResponse,
  ChangeEmailRequestSchema,
} from "@pacetrack/schema";
import { MailIcon, SendIcon } from "lucide-react";
import { useFetcher } from "react-router";
import { Button } from "~/components/primitives/button";
import { Input, InputError } from "~/components/primitives/input";
import { Label } from "~/components/primitives/label";

type ChangeEmailFormProps = {
  currentEmail?: string | null;
};

export function ChangeEmailForm({ currentEmail }: ChangeEmailFormProps) {
  const fetcher = useFetcher<ChangeEmailRouteResponse>();
  const data = fetcher.data;

  const { fields } = useZodForm({
    schema: ChangeEmailRequestSchema,
    errors: data?.errors,
  });

  const isSubmitting = ["submitting", "loading"].includes(fetcher.state);

  return (
    <div className="space-y-2">
      <h2 className="text-lg font-medium">Current Email</h2>
      {data?.status === "ok" ? (
        <p className="text-sm text-muted-foreground">
          A confirmation link has been sent to {data.payload?.email}. Please
          check your inbox.
        </p>
      ) : (
        <>
          {currentEmail && (
            <p className="bg-background-100 rounded-md p-2 px-4 text-sm w-fit flex items-center gap-2 mb-4">
              <MailIcon className="w-4 h-4" />
              <span>{currentEmail}</span>
            </p>
          )}
          <fetcher.Form method="POST" encType="multipart/form-data">
            <input type="hidden" name="action" value="change-email" />
            <div className="space-y-2 pb-4">
              <Label htmlFor={fields.email.name}>Update email address</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="email"
                  id={fields.email.name}
                  name={fields.email.name}
                  value={fields.email.value}
                  onChange={(e) => fields.email.onChange(e.target.value)}
                  placeholder="new.address@example.com"
                />
                <Button
                  variant="ghost"
                  isLoading={isSubmitting}
                  disabled={isSubmitting}
                  type="submit"
                  className="space-x-2 block w-full max-w-fit h-[38px]"
                >
                  <Button.Loader className="flex items-center space-x-2">
                    <span>Send confirmation</span>
                    <SendIcon />
                  </Button.Loader>
                </Button>
              </div>

              {fields.email.error && (
                <InputError>{fields.email.error}</InputError>
              )}
            </div>
          </fetcher.Form>
        </>
      )}
    </div>
  );
}
