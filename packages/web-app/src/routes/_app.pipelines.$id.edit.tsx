import { parseZodFormData } from "@abyrd9/zod-form-data";
import { PIPELINE_TEMPLATE_UPDATE_ROUTE } from "@pacetrack/schema";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { PipelineTemplateForm } from "~/components/forms/PipelineTemplateForm";
import { Button } from "~/components/primitives/button";
import { client } from "~/utils/helpers/api-client";
import { getPipelineTemplateByIdQueryOptions } from "~/utils/server-fns/get-pipeline-template-by-id";

export const Route = createFileRoute("/_app/pipelines/$id/edit")({
	component: RouteComponent,
});

function RouteComponent() {
	const { id } = Route.useParams();
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	// Fetch the pipeline template and its steps
	const { data: pipelineData, isLoading } = useQuery(
		getPipelineTemplateByIdQueryOptions(id),
	);

	// Mutation for updating the pipeline (updates pipeline metadata only)
	const { mutate: updatePipeline, isPending: isUpdatingPipeline } = useMutation(
		{
			mutationFn: async (formData: FormData) => {
				const parsed = parseZodFormData(formData, {
					schema: PIPELINE_TEMPLATE_UPDATE_ROUTE.request,
				});

				if (!parsed.success) {
					throw new Error("Invalid form data");
				}

				// Update pipeline metadata (name, description, icon, iconColor)
				const { data } = await client("PIPELINE_TEMPLATE_UPDATE_ROUTE", {
					body: {
						id,
						name: parsed.data.name,
						description: parsed.data.description,
						icon: parsed.data.icon,
						iconColor: parsed.data.iconColor,
					},
				});

				// TODO: Handle step_templates separately
				// You would need to:
				// 1. Compare new step_templates with existing ones
				// 2. Create new steps
				// 3. Update existing steps
				// 4. Delete removed steps
				// This would involve calling step-template CRUD endpoints

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
		},
	);

	if (isLoading) {
		return (
			<div className="container max-w-4xl py-8">
				<div>Loading...</div>
			</div>
		);
	}

	if (!pipelineData) {
		return (
			<div className="container max-w-4xl py-8">
				<div>Pipeline not found</div>
			</div>
		);
	}

	return (
		<div className="container py-8">
			<div className="mb-6 max-w-4xl">
				<Button
					variant="transparent"
					onClick={() => navigate({ to: "/pipelines" })}
					className="mb-4"
				>
					<ArrowLeft className="w-4 h-4 mr-2" />
					Back to Pipelines
				</Button>
				<h1 className="text-3xl font-bold">Edit Pipeline Template</h1>
				<p className="text-muted-foreground mt-2">
					Update your pipeline template configuration and steps.
				</p>
			</div>

			<PipelineTemplateForm
				mode="edit"
				initialData={{
					pipeline: pipelineData,
					step_templates: pipelineData.step_templates || [],
				}}
				onSubmit={updatePipeline}
				isPending={isUpdatingPipeline}
			/>
		</div>
	);
}
