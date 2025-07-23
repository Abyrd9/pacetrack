import { useZodForm } from "@abyrd9/zod-form-data";
import { SignInRequestSchema, type SignInRouteResponse } from "@pacetrack/schema";
import { ArrowRightIcon, EyeIcon, EyeOffIcon } from "lucide-react";
import { useState } from "react";
import { Link, useFetcher } from "react-router";
import { Button } from "~/components/primitives/button";
import { Input, InputComposer } from "~/components/primitives/input";
import { Label } from "~/components/primitives/label";

export const SignInForm = () => {
  const fetcher = useFetcher<SignInRouteResponse>();
  const data = fetcher.data;

  const { fields } = useZodForm({
    schema: SignInRequestSchema,
    errors: data?.errors,
  });

  const isSubmitting = ["submitting", "loading"].includes(fetcher.state);

  const [showHiddenPassword, setShowHiddenPassword] = useState(false);

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
      <div className="pb-2">
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
        {(data?.errors?.form || data?.errors?.global) && (
          <InputComposer.Error>{data?.errors.form || data?.errors.global}</InputComposer.Error>
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
            <span>Sign in</span>
            <ArrowRightIcon className="text-base" />
          </Button.Loader>
        </Button>

        <div className="w-full flex justify-center pt-3">
          <Link
            to="/auth/forgot-password"
            className="text-xs text-primary underline"
          >
            Forgot your password?
          </Link>
        </div>

        <span className="pt-5 text-center text-sm w-full block">
          Don&apos;t have an account?{" "}
          <Link className="text-primary underline" to="/auth/sign-up">
            Sign up
          </Link>
        </span>
      </div>
    </fetcher.Form>
  );
};
