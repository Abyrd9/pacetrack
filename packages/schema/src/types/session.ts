import { z } from "zod/v4";

export const SessionSchema = z.object({
	id: z.string(),
	user_id: z.string(),
	account_id: z.string(),
	tenant_id: z.string(),
	role_id: z.string(),
	expires_at: z.number(),
	created_at: z.number(),
	last_activity: z.number(),
	ip_address: z.string().nullable(),
	user_agent: z.string().nullable(),
	revoked_at: z.number().nullable(),
});

export type Session = z.infer<typeof SessionSchema>;
