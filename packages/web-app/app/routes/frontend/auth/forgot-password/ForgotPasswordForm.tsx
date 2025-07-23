import { useZodForm } from "@abyrd9/zod-form-data";
import {
  ForgotPasswordRequestSchema,
  type ForgotPasswordRouteResponse,
} from "@pacetrack/schema";
import { SendIcon } from "lucide-react";
import { useFetcher } from "react-router";
import { Button } from "~/components/primitives/button";
import { Input, InputComposer } from "~/components/primitives/input";
import { Label } from "~/components/primitives/label";

export const ForgotPasswordForm = () => {
  const fetcher = useFetcher<ForgotPasswordRouteResponse>();
  const data = fetcher.data;

  const { fields } = useZodForm({
    schema: ForgotPasswordRequestSchema,
    errors: data?.errors,
  });

  const isSubmitting = ["submitting", "loading"].includes(fetcher.state);

  return (
    <fetcher.Form method="POST">
      <div className="pb-4">
        <Label htmlFor={fields.email.name}>Email address</Label>
        <Input
          type="email"
          name={fields.email.name}
          value={fields.email.value}
          onChange={(e) => fields.email.onChange(e.target.value)}
          className="w-full max-w-none"
          placeholder="john.doe@example.com"
        />
        {fields.email.error && (
          <InputComposer.Error>{fields.email.error}</InputComposer.Error>
        )}
      </div>
      <div className="pt-4">
        <Button
          color="primary"
          className="w-full space-x-2"
          isLoading={isSubmitting}
          disabled={isSubmitting}
          type="submit"
        >
          <Button.Loader className="flex w-full items-center justify-center space-x-2">
            <span>Reset Password</span>
            <SendIcon />
          </Button.Loader>
        </Button>
      </div>
    </fetcher.Form>
  );
};
