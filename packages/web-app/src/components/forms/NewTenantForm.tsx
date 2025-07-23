import { useZodForm } from "@abyrd9/zod-form-data";
import {
  type Account,
  TENANT_CREATE_ROUTE,
  VALIDATE_SESSION_ROUTE,
} from "@pacetrack/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "~/components/primitives/button";
import { ImageUploader } from "~/components/primitives/image-uploader";
import { Input, InputError } from "~/components/primitives/input";
import { Label } from "~/components/primitives/label";
import { client } from "~/utils/helpers/api-client";
import { getAccountsMetaQueryOptions } from "~/utils/server-fns/get-accounts-meta";
import { getTenantsQueryOptions } from "~/utils/server-fns/get-tenants";
import { getAccountRolesQueryOptions } from "~/utils/server-fns/get-user-roles";

type NewTenantFormProps = {
  onMutate?: () => void;
  onSuccess: () => void;
  onError?: (error: Error) => void;
  account?: Account;
};

export function NewTenantForm({
  onMutate,
  onSuccess,
  onError,
  account,
}: NewTenantFormProps) {
  const router = useRouter();
  const qc = useQueryClient();
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const {
    data,
    isPending,
    mutate: onSubmit,
  } = useMutation({
    mutationFn: async (form: FormData) => {
      const { data } = await client("SESSION_CREATE_TENANT_ROUTE", {
        body: form,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      return data;
    },
    onMutate,
    onError,
    onSuccess: (data) => {
      if (data?.status === "ok") {
        qc.invalidateQueries({ queryKey: [VALIDATE_SESSION_ROUTE.path] });
        qc.invalidateQueries({ queryKey: getTenantsQueryOptions().queryKey });
        qc.invalidateQueries({
          queryKey: getAccountRolesQueryOptions().queryKey,
        });
        qc.invalidateQueries({
          queryKey: getAccountsMetaQueryOptions().queryKey,
        });

        router.invalidate();

        fields.name.onChange("");
        fields.image.onChange(undefined);
        setLogoFile(null);

        onSuccess();
      } else {
        onError?.(new Error(data?.errors?.global ?? "Something went wrong"));
      }
    },
  });

  const { fields, reset } = useZodForm({
    schema: TENANT_CREATE_ROUTE.request,
    errors: data?.errors,
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append("name", fields.name.value);
    formData.append("action", "create-tenant");

    // Add account_id if available
    if (account?.id) {
      formData.append("account_id", account.id);
    }

    // Add logo file if selected
    if (logoFile) {
      formData.append("image", logoFile);
    }

    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
      <div className="space-y-2">
        <Label htmlFor="name">Workspace Name</Label>
        <Input
          id={fields.name.name}
          name={fields.name.name}
          type="text"
          placeholder="Enter workspace name"
          required
          value={fields.name.value}
          onChange={(e) => fields.name.onChange(e.target.value)}
        />
        {fields.name.error && <InputError>{fields.name.error}</InputError>}
      </div>

      <div className="space-y-2">
        <Label>Workspace Logo (optional)</Label>
        <ImageUploader value={logoFile} onChange={setLogoFile} ratio="1:1" />
        {fields.image.error && <InputError>{fields.image.error}</InputError>}
      </div>

      {/* Hidden input for account_id */}
      {account?.id && (
        <input type="hidden" name="account_id" value={account.id} />
      )}

      <Button
        className="mt-6 w-full"
        name="action"
        value="create-tenant"
        type="submit"
        isLoading={isPending}
      >
        <Button.Loader>Create Workspace</Button.Loader>
      </Button>
    </form>
  );
}
