// src/routes/index.tsx
import { createFileRoute } from "@tanstack/react-router";
import { UhOhImage } from "~/components/UhOhImage";

export const Route = createFileRoute("/_app/")({
	component: IndexComponent,
});

function IndexComponent() {
	return (
		<div className="h-full bg-background text-foreground flex flex-col items-center justify-center">
			<UhOhImage image="empty" className="pb-3" />
		</div>
	);
}
