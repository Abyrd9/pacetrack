CREATE TABLE "items" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"item_template_id" text NOT NULL,
	"pipeline_instance_id" text NOT NULL,
	"current_step_id" text NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "item_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"version" integer DEFAULT 1 NOT NULL,
	"pipeline_template_id" text NOT NULL,
	"initial_step_id" text NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"deleted_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_item_template_id_item_templates_id_fk" FOREIGN KEY ("item_template_id") REFERENCES "public"."item_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_pipeline_instance_id_pipeline_instances_id_fk" FOREIGN KEY ("pipeline_instance_id") REFERENCES "public"."pipeline_instances"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_current_step_id_steps_id_fk" FOREIGN KEY ("current_step_id") REFERENCES "public"."steps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_created_by_accounts_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_templates" ADD CONSTRAINT "item_templates_pipeline_template_id_pipeline_templates_id_fk" FOREIGN KEY ("pipeline_template_id") REFERENCES "public"."pipeline_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_templates" ADD CONSTRAINT "item_templates_initial_step_id_step_templates_id_fk" FOREIGN KEY ("initial_step_id") REFERENCES "public"."step_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_templates" ADD CONSTRAINT "item_templates_created_by_accounts_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;