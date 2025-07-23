DO $$ BEGIN
 ALTER TABLE "tenants" DROP CONSTRAINT IF EXISTS "tenants_membership_id_memberships_id_fk";
EXCEPTION
 WHEN undefined_object THEN NULL;
END $$;
--> statement-breakpoint
ALTER TABLE "tenants" DROP COLUMN IF EXISTS "membership_id";--> statement-breakpoint
DROP TABLE IF EXISTS "memberships" CASCADE;