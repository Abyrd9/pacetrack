import { z } from "zod/v4";

export const SessionSchema = z.object({
  id: z.string(),
  secret_hash: z.string(),

  // metadata
  user_id: z.string(),
  account_id: z.string(),
  tenant_id: z.string(),
  role_id: z.string(),
  active_accounts: z.array(
    z.object({
      account_id: z.string(),
      tenant_id: z.string(),
      role_id: z.string(),
    })
  ),

  // device metadata
  user_agent: z.string().optional(),
  ip_address: z.string().optional(),
  device_fingerprint: z.string().optional(),

  // timestamped metadata
  expires_at: z.number(),
  created_at: z.number(),
  last_verified_at: z.number(),
  revoked_at: z.number().nullable(),
});

export const SessionSchemaWithToken = SessionSchema.extend({
  token: z.string(),
});

export const PublicSessionWithTokenSchema = SessionSchema.omit({
  secret_hash: true,
});

export type Session = z.infer<typeof SessionSchema>;
export type SessionWithToken = z.infer<typeof SessionSchemaWithToken>;
export type PublicSessionWithToken = z.infer<
  typeof PublicSessionWithTokenSchema
>;
