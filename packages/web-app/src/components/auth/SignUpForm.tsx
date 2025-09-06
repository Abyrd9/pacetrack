import { useZodForm } from "@abyrd9/zod-form-data";
import { SIGN_UP_ROUTE } from "@pacetrack/schema";
import { useMutation } from "@tanstack/react-query";
import { Link, useRouter } from "@tanstack/react-router";
import { ArrowRightIcon, EyeIcon, EyeOffIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/primitives/button";
import { Input, InputComposer } from "~/components/primitives/input";
import { Label } from "~/components/primitives/label";
import { client } from "~/utils/helpers/api-client";
import { setCSRFToken } from "~/utils/helpers/csrf-client";

export const SignUpForm = () => {
  const router = useRouter();

  const {
    data,
    isPending,
    mutate: onSubmit,
  } = useMutation({
    mutationFn: async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      let element: HTMLFormElement | undefined;
      if (e.target instanceof HTMLFormElement) {
        element = e.target;
      } else if (e.currentTarget instanceof HTMLFormElement) {
        element = e.currentTarget;
      } else {
        throw new Error("Form element not found");
      }

      const form = new FormData(element);
      const { data } = await client("SIGN_UP_ROUTE", {
        method: "POST",
        body: form,
      });

      if (data.payload?.csrfToken) {
        setCSRFToken(data.payload.csrfToken);
      }

      return data;
    },
    onSuccess: (data) => {
      if (data.status === "ok") {
        if (data.payload?.csrfToken) setCSRFToken(data.payload.csrfToken);
        router.navigate({ to: "/", replace: true });
      }
    },
  });

  const { fields } = useZodForm({
    schema: SIGN_UP_ROUTE.request,
    errors: data?.errors,
  });

  const [showHiddenPassword, setShowHiddenPassword] = useState(false);

  return (
    <form onSubmit={onSubmit}>
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
        {data?.errors?.form && (
          <InputComposer.Error>{data.errors.form}</InputComposer.Error>
        )}
        {data?.errors?.global && (
          <InputComposer.Error>{data.errors.global}</InputComposer.Error>
        )}
      </div>
      <div className="pt-4">
        <Button
          color="primary"
          className="w-full space-x-2"
          isLoading={isPending}
          disabled={isPending}
          type="submit"
        >
          <Button.Loader className="flex w-full items-center justify-center space-x-2">
            <span>Sign up</span>
            <ArrowRightIcon className="text-base" />
          </Button.Loader>
        </Button>
      </div>

      <span className="pt-5 text-center text-sm w-full block">
        Already have an account?{" "}
        <Link className="text-primary underline" to="/auth/sign-in">
          Sign in
        </Link>
      </span>
    </form>
  );
};
