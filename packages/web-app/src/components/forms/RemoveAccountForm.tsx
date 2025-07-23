import { VALIDATE_SESSION_ROUTE } from "@pacetrack/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { Button } from "~/components/primitives/button";
import { client } from "~/utils/helpers/api-client";
import { getAccountsMetaQueryOptions } from "~/utils/server-fns/get-accounts-meta";

export const RemoveAccountForm = ({
  accountId,
  onMutate,
  onSuccess,
  onError,
}: {
  accountId: string;
  onMutate?: () => void;
  onSuccess: () => void;
  onError?: (error: Error) => void;
}) => {
  const router = useRouter();
  const qc = useQueryClient();

  const { isPending, mutate: handleRemove } = useMutation({
    mutationFn: async () => {
      const form = new FormData();
      form.append("account_id", accountId);

      const { data } = await client("SESSION_REMOVE_ACCOUNT_ROUTE", {
        body: form,
      });

      return data;
    },
    onMutate,
    onError,
    onSuccess: (data) => {
      if (data.status === "ok") {
        qc.invalidateQueries({ queryKey: [VALIDATE_SESSION_ROUTE.path] });
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

  return (
    <Button disabled={isPending} onClick={() => handleRemove()} type="button">
      {isPending ? "Removing..." : "Remove Account"}
    </Button>
  );
};
