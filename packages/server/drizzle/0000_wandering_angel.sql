CREATE TYPE "public"."users_to_tenants_state" AS ENUM('invited', 'accepted', 'rejected', 'expired');--> statement-breakpoint
CREATE TYPE "public"."role_kind" AS ENUM('owner', 'billing_admin', 'tenant_admin', 'user');--> statement-breakpoint
CREATE TYPE "public"."tenant_kind" AS ENUM('personal', 'org');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"deleted_by" text,
	"created_by" text NOT NULL,
	"customer_id" text,
	"subscription_id" text,
	"created_at" timestamp DEFAULT now(),
	"deleted_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "user_groups" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"image_url" text,
	"tenant_id" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"deleted_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "user_invites" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"tenant_id" text NOT NULL,
	"state" "users_to_tenants_state" DEFAULT 'invited' NOT NULL,
	"code" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp,
	CONSTRAINT "user_invites_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"kind" "role_kind" NOT NULL,
	"allowed" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"deleted_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"tenant_id" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now(),
	"revoked_at" timestamp,
	"last_activity" timestamp
);
--> statement-breakpoint
CREATE TABLE "resources" (
	"id" text PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"type" text NOT NULL,
	"tenant_id" text NOT NULL,
	"created_by_id" text NOT NULL,
	"deleted_by_id" text,
	"created_at" timestamp DEFAULT now(),
	"deleted_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"action" text NOT NULL,
	"table_name" text NOT NULL,
	"record_id" text NOT NULL,
	"old_values" jsonb,
	"new_values" jsonb,
	"user_id" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"image_url" text,
	"kind" "tenant_kind" DEFAULT 'org' NOT NULL,
	"account_id" text NOT NULL,
	"deleted_by" text,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"deleted_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "users_to_user_groups" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"user_group_id" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"deleted_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password" text,
	"display_name" text,
	"image_url" text,
	"created_at" timestamp DEFAULT now(),
	"deleted_at" timestamp,
	"updated_at" timestamp,
	"reset_password_token" text,
	"reset_password_expires" timestamp,
	"pending_email" text,
	"pending_email_token" text,
	"pending_email_expires" timestamp,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "users_to_tenants" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"tenant_id" text NOT NULL,
	"role_id" text NOT NULL,
	"is_primary_contact" boolean DEFAULT false NOT NULL,
	"is_billing_contact" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"deleted_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_groups" ADD CONSTRAINT "user_groups_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_deleted_by_id_users_id_fk" FOREIGN KEY ("deleted_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users_to_user_groups" ADD CONSTRAINT "users_to_user_groups_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users_to_user_groups" ADD CONSTRAINT "users_to_user_groups_user_group_id_user_groups_id_fk" FOREIGN KEY ("user_group_id") REFERENCES "public"."user_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users_to_tenants" ADD CONSTRAINT "users_to_tenants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users_to_tenants" ADD CONSTRAINT "users_to_tenants_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users_to_tenants" ADD CONSTRAINT "users_to_tenants_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;