import { useZodForm } from "@abyrd9/zod-form-data";
import { VALIDATE_SESSION_ROUTE } from "@pacetrack/schema";
import { ACCOUNT_LINK_ROUTE } from "@pacetrack/schema/src/routes-schema/acount/account.link.types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/primitives/button";
import { Input, InputComposer } from "~/components/primitives/input";
import { Label } from "~/components/primitives/label";
import { client } from "~/utils/helpers/api-client";
import { getAccountsMetaQueryOptions } from "~/utils/server-fns/get-accounts-meta";
import { getTenantsQueryOptions } from "~/utils/server-fns/get-tenants";
import { getAccountRolesQueryOptions } from "~/utils/server-fns/get-user-roles";

export const LinkAccountForm = ({
  onMutate,
  onSuccess,
  onError,
}: {
  onMutate?: () => void;
  onSuccess: () => void;
  onError?: (error: Error) => void;
}) => {
  const router = useRouter();
  const qc = useQueryClient();

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
      const { data } = await client("SESSION_LINK_ACCOUNT_ROUTE", {
        body: form,
      });

      return data;
    },
    onMutate,
    onError,
    onSuccess: (data) => {
      if (data.status === "ok") {
        qc.invalidateQueries({ queryKey: [VALIDATE_SESSION_ROUTE.path] });
        qc.invalidateQueries({ queryKey: getTenantsQueryOptions().queryKey });
        qc.invalidateQueries({
          queryKey: getAccountRolesQueryOptions().queryKey,
        });
        qc.invalidateQueries({
          queryKey: getAccountsMetaQueryOptions().queryKey,
        });

        router.invalidate();
        onSuccess();
      } else {
        onError?.(new Error(data?.errors?.global ?? "Something went wrong"));
      }
    },
  });

  const { fields } = useZodForm({
    schema: ACCOUNT_LINK_ROUTE.request,
    errors: data?.errors,
  });

  const [showHiddenPassword, setShowHiddenPassword] = useState(false);

  return (
    <>
      <div className="pb-2">
        <Button className="w-full" type="submit">
          <Button.Loader className="flex w-full items-center justify-center space-x-2">
            {/* Google Logo */}
            <span>Continue with Google</span>
          </Button.Loader>
        </Button>
      </div>
      <div className="my-4 w-2/3 h-px bg-background-300 mx-auto" />
      <form method="POST" onSubmit={onSubmit}>
        <div className="pb-4">
          <Label htmlFor={fields.email.name}>Email</Label>
          <Input
            type="email"
            name={fields.email.name}
            value={fields.email.value}
            onChange={(e) => fields.email.onChange(e.target.value)}
            className="w-full max-w-none"
            placeholder="Enter your email"
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
              placeholder="********"
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
            <InputComposer.Error>
              {data?.errors.form || data?.errors.global}
            </InputComposer.Error>
          )}
        </div>

        <Button
          className="w-full space-x-2 mt-4"
          isLoading={isPending}
          disabled={isPending}
          type="submit"
        >
          <Button.Loader className="flex w-full items-center justify-center space-x-2">
            <span>Link Account</span>
          </Button.Loader>
        </Button>
      </form>
    </>
  );
};
