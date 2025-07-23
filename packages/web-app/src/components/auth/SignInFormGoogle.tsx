import { useState } from "react";
import { Button } from "~/components/primitives/button";

export const GoogleSignInForm = () => {
	const [isSubmitting, _setIsSubmitting] = useState(false);

	return (
		<form>
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
		</form>
	);
};
