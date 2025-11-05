import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Edit, Plus, Search, Workflow } from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/primitives/button";
import { Card } from "~/components/primitives/card";
import { IconButton } from "~/components/primitives/icon-button";
import { Input } from "~/components/primitives/input";
import { getPipelineTemplatesQueryOptions } from "~/utils/server-fns/get-pipeline-templates";

export const Route = createFileRoute("/_app/pipelines/")({
	component: RouteComponent,
});

function RouteComponent() {
	const [search, setSearch] = useState("");

	const { data: templates, isLoading } = useQuery(
		getPipelineTemplatesQueryOptions(search),
	);

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold">Pipeline Templates</h1>
					<p className="text-muted-foreground mt-1">
						Create and manage your pipeline templates
					</p>
				</div>
				<Link to="/pipelines/new">
					<Button>
						<Plus className="w-4 h-4 mr-2" />
						New Template
					</Button>
				</Link>
			</div>

			<div className="relative">
				<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
				<Input
					placeholder="Search templates..."
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					className="pl-9"
				/>
			</div>

			{isLoading ? (
				<div className="text-center py-12 text-muted-foreground">
					Loading templates...
				</div>
			) : templates && templates.length > 0 ? (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{templates.map((template) => (
						<Card
							key={template.id}
							className="p-6 hover:shadow-lg transition-shadow"
						>
							<div className="flex items-start gap-3">
								<div className="p-2 bg-primary/10 rounded-lg">
									{template.icon ? (
										<span className="text-2xl">{template.icon}</span>
									) : (
										<Workflow className="w-6 h-6 text-primary" />
									)}
								</div>
								<div className="flex-1 min-w-0">
									<div className="flex items-start justify-between gap-2">
										<h3 className="font-semibold truncate">{template.name}</h3>
										<Link to="/pipelines/$id/edit" params={{ id: template.id }}>
											<IconButton
												size="sm"
												variant="ghost"
												title="Edit template"
											>
												<Edit className="w-4 h-4" />
											</IconButton>
										</Link>
									</div>
									{template.description && (
										<p className="text-sm text-muted-foreground mt-1 line-clamp-2">
											{template.description}
										</p>
									)}
									<div className="flex items-center gap-2 mt-3">
										<span
											className={`text-xs px-2 py-1 rounded-full ${
												template.status === "active"
													? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
													: template.status === "draft"
														? "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
														: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
											}`}
										>
											{template.status}
										</span>
									</div>
								</div>
							</div>
						</Card>
					))}
				</div>
			) : (
				<Card className="p-12 text-center flex flex-col items-center justify-center">
					<Workflow className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
					<h3 className="text-lg font-semibold mb-2">No templates yet</h3>
					<p className="text-muted-foreground mb-4">
						Create your first pipeline template to get started
					</p>
					<Link to="/pipelines/new">
						<Button>
							<Plus className="w-4 h-4 mr-2" />
							Create Template
						</Button>
					</Link>
				</Card>
			)}
		</div>
	);
}
