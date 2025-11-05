import { parseZodFormData } from "@abyrd9/zod-form-data";
import { PIPELINE_TEMPLATE_CREATE_ROUTE } from "@pacetrack/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { PipelineTemplateForm } from "~/components/forms/PipelineTemplateForm";
import { Button } from "~/components/primitives/button";
import { client } from "~/utils/helpers/api-client";

export const Route = createFileRoute("/_app/pipelines/new")({
	component: RouteComponent,
});

function RouteComponent() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	const { mutate, isPending } = useMutation({
		mutationFn: async (formData: FormData) => {
			const parsed = parseZodFormData(formData, {
				schema: PIPELINE_TEMPLATE_CREATE_ROUTE.request,
			});

			if (!parsed.success) {
				throw new Error("Invalid form data");
			}

			const { data } = await client("PIPELINE_TEMPLATE_CREATE_ROUTE", {
				body: parsed.data,
			});
			return data;
		},
		onSuccess: (data) => {
			if (data.status === "ok") {
				queryClient.invalidateQueries({
					queryKey: ["/api/pipeline-template/get"],
				});
				navigate({ to: "/pipelines" });
			}
		},
	});

	return (
		<div className="container max-w-4xl py-8">
			<div className="mb-6">
				<Button
					variant="transparent"
					onClick={() => navigate({ to: "/pipelines" })}
					className="mb-4"
				>
					<ArrowLeft className="w-4 h-4 mr-2" />
					Back to Pipelines
				</Button>
				<h1 className="text-3xl font-bold">Create Pipeline Template</h1>
				<p className="text-muted-foreground mt-2">
					Define your pipeline template with steps that will be used to create
					pipeline instances.
				</p>
			</div>

			<PipelineTemplateForm
				mode="create"
				onSubmit={mutate}
				isPending={isPending}
			/>
		</div>
	);
}
