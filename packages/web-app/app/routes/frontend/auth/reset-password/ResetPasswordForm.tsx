import { useZodForm } from "@abyrd9/zod-form-data";
import {
  ResetPasswordRequestSchema,
  type ResetPasswordRouteResponse,
} from "@pacetrack/schema";
import { EyeIcon, EyeOffIcon, SaveIcon } from "lucide-react";
import { useState } from "react";
import { useFetcher } from "react-router";
import { Button } from "~/components/primitives/button";
import { Input, InputComposer } from "~/components/primitives/input";
import { Label } from "~/components/primitives/label";

type ResetPasswordFormProps = {
  email: string;
  code: string;
  error?: string;
};

export const ResetPasswordForm = ({
  email,
  code,
  error,
}: ResetPasswordFormProps) => {
  const fetcher = useFetcher<ResetPasswordRouteResponse>();
  const data = fetcher.data;

  const { fields } = useZodForm({
    schema: ResetPasswordRequestSchema,
    errors: data?.errors,
    defaultValues: {
      email,
      code,
    },
  });

  const isSubmitting = ["submitting", "loading"].includes(fetcher.state);

  const [showHiddenPassword, setShowHiddenPassword] = useState(false);

  return (
    <fetcher.Form method="POST">
      <input
        type="hidden"
        name={fields.email.name}
        value={fields.email.value}
      />
      <input type="hidden" name={fields.code.name} value={fields.code.value} />
      <div className="pb-4">
        <Label htmlFor={fields.password.name}>Password</Label>
        <InputComposer className="space-x-2">
          <InputComposer.Input
            type={showHiddenPassword ? "text" : "password"}
            name={fields.password.name}
            value={fields.password.value}
            onChange={(e) => fields.password.onChange(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowHiddenPassword((show) => !show)}
          >
            {showHiddenPassword ? <EyeIcon /> : <EyeOffIcon />}
          </button>
        </InputComposer>
        {fields.password.error && (
          <InputComposer.Error>{fields.password.error}</InputComposer.Error>
        )}
      </div>
      <div className="pb-2">
        <Label htmlFor={fields.passwordConfirmation.name}>
          Confirm password
        </Label>
        <Input
          type="password"
          name={fields.passwordConfirmation.name}
          value={fields.passwordConfirmation.value}
          onChange={(e) => fields.passwordConfirmation.onChange(e.target.value)}
          className="w-full max-w-none"
        />
        {fields.passwordConfirmation.error && (
          <InputComposer.Error>
            {fields.passwordConfirmation.error}
          </InputComposer.Error>
        )}
      </div>

      <div className="pt-4">
        <Button
          color="primary"
          className="w-full space-x-2"
          isLoading={isSubmitting}
          disabled={isSubmitting || Boolean(error)}
          type="submit"
        >
          <Button.Loader className="flex w-full items-center justify-center space-x-2">
            <span>Update Password</span>
            <SaveIcon className="text-base" />
          </Button.Loader>
        </Button>
        {fields.code.error && (
          <InputComposer.Error className="pt-1.5">
            {fields.code.error}
          </InputComposer.Error>
        )}
      </div>
    </fetcher.Form>
  );
};
