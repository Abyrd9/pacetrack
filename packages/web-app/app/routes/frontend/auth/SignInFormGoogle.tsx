import { useFetcher } from "react-router";
import { Button } from "~/components/primitives/button";

export const GoogleSignInForm = () => {
  const fetcher = useFetcher();

  const isSubmitting = ["submitting", "loading"].includes(fetcher.state);

  return (
    <fetcher.Form method="POST">
      <Button
        className="w-full"
        isLoading={isSubmitting}
        disabled={isSubmitting}
        type="submit"
      >
        <Button.Loader className="flex w-full items-center justify-center space-x-2">
          {/* Google Logo */}
          <span>Continue with Google</span>
        </Button.Loader>
      </Button>
    </fetcher.Form>
  );
};
