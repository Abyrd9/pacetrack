ALTER TABLE "user_groups" RENAME TO "account_groups";--> statement-breakpoint
ALTER TABLE "user_to_user_group" RENAME TO "account_to_account_group";--> statement-breakpoint
ALTER TABLE "account_to_account_group" RENAME COLUMN "user_id" TO "account_id";--> statement-breakpoint
ALTER TABLE "account_to_account_group" RENAME COLUMN "user_group_id" TO "account_group_id";--> statement-breakpoint
ALTER TABLE "account_groups" DROP CONSTRAINT "user_groups_tenant_id_tenants_id_fk";
--> statement-breakpoint
ALTER TABLE "account_to_account_group" DROP CONSTRAINT "user_to_user_group_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "account_to_account_group" DROP CONSTRAINT "user_to_user_group_user_group_id_user_groups_id_fk";
--> statement-breakpoint
ALTER TABLE "account_groups" ADD CONSTRAINT "account_groups_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_to_account_group" ADD CONSTRAINT "account_to_account_group_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_to_account_group" ADD CONSTRAINT "account_to_account_group_account_group_id_account_groups_id_fk" FOREIGN KEY ("account_group_id") REFERENCES "public"."account_groups"("id") ON DELETE no action ON UPDATE no action;