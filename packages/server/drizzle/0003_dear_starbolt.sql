ALTER TABLE "account_to_tenant" RENAME TO "account_metadata";--> statement-breakpoint
ALTER TABLE "account_metadata" DROP CONSTRAINT "account_to_tenant_account_id_accounts_id_fk";
--> statement-breakpoint
ALTER TABLE "account_metadata" DROP CONSTRAINT "account_to_tenant_tenant_id_tenants_id_fk";
--> statement-breakpoint
ALTER TABLE "account_metadata" DROP CONSTRAINT "account_to_tenant_role_id_roles_id_fk";
--> statement-breakpoint
ALTER TABLE "account_metadata" ADD COLUMN "user_id" text;--> statement-breakpoint
UPDATE "account_metadata" SET "user_id" = "accounts"."user_id" FROM "accounts" WHERE "account_metadata"."account_id" = "accounts"."id";--> statement-breakpoint
ALTER TABLE "account_metadata" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "account_metadata" ADD CONSTRAINT "account_metadata_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_metadata" ADD CONSTRAINT "account_metadata_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_metadata" ADD CONSTRAINT "account_metadata_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_metadata" ADD CONSTRAINT "account_metadata_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;