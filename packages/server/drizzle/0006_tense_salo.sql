CREATE TYPE "public"."pipeline_instance_status" AS ENUM('active', 'paused', 'completed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."pipeline_template_status" AS ENUM('draft', 'active', 'archived');--> statement-breakpoint
CREATE TABLE "pipeline_instances" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"status" "pipeline_instance_status" DEFAULT 'active' NOT NULL,
	"pipeline_template_id" text NOT NULL,
	"tenant_id" text NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"deleted_at" timestamp,
	"updated_at" timestamp,
	"status_updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "steps" (
	"id" text PRIMARY KEY NOT NULL,
	"step_template_id" text NOT NULL,
	"pipeline_instance_id" text NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"deleted_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "pipeline_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"version" integer DEFAULT 1 NOT NULL,
	"status" "pipeline_template_status" DEFAULT 'draft' NOT NULL,
	"icon" text,
	"tenant_id" text NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"deleted_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "step_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"version" integer DEFAULT 1 NOT NULL,
	"order" integer NOT NULL,
	"target_duration_days" integer,
	"color" text,
	"icon" text,
	"pipeline_template_id" text NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"deleted_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "account_groups" DROP CONSTRAINT "account_groups_parent_group_id_account_groups_id_fk";
--> statement-breakpoint
ALTER TABLE "pipeline_instances" ADD CONSTRAINT "pipeline_instances_pipeline_template_id_pipeline_templates_id_fk" FOREIGN KEY ("pipeline_template_id") REFERENCES "public"."pipeline_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_instances" ADD CONSTRAINT "pipeline_instances_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_instances" ADD CONSTRAINT "pipeline_instances_created_by_accounts_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "steps" ADD CONSTRAINT "steps_step_template_id_step_templates_id_fk" FOREIGN KEY ("step_template_id") REFERENCES "public"."step_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "steps" ADD CONSTRAINT "steps_pipeline_instance_id_pipeline_instances_id_fk" FOREIGN KEY ("pipeline_instance_id") REFERENCES "public"."pipeline_instances"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "steps" ADD CONSTRAINT "steps_created_by_accounts_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_templates" ADD CONSTRAINT "pipeline_templates_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_templates" ADD CONSTRAINT "pipeline_templates_created_by_accounts_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "step_templates" ADD CONSTRAINT "step_templates_pipeline_template_id_pipeline_templates_id_fk" FOREIGN KEY ("pipeline_template_id") REFERENCES "public"."pipeline_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "step_templates" ADD CONSTRAINT "step_templates_created_by_accounts_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;