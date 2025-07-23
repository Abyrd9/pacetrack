import { account_metadata_table } from "@pacetrack/schema";
import { and, eq, isNull } from "drizzle-orm";
import { serializeSigned } from "hono/utils/cookie";
import { db } from "src/db";
import { getSessionClient } from "../helpers/auth/auth-session";
import { generateCSRFToken } from "../helpers/csrf/csrf";

/**
 * Create a test session for a user in a specific tenant context.
 * Useful for testing operations that need to be performed in an org tenant.
 */
export async function setTestSessionInTenant(
  userId: string,
  tenantId: string,
  accountId?: string
) {
  if (!process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET is not set");
  }

  // Get user
  const user = await db.query.user_table.findFirst({
    where: (users, { eq }) => eq(users.id, userId),
  });

  if (!user) {
    throw new Error(`User ${userId} not found`);
  }

  // Get tenant
  const tenant = await db.query.tenant_table.findFirst({
    where: (tenants, { eq }) => eq(tenants.id, tenantId),
  });

  if (!tenant) {
    throw new Error(`Tenant ${tenantId} not found`);
  }

  // If accountId not provided, find the first account for this user in this tenant
  let finalAccountId = accountId;
  if (!finalAccountId) {
    const metadata = await db.query.account_metadata_table.findFirst({
      where: and(
        eq(account_metadata_table.user_id, userId),
        eq(account_metadata_table.tenant_id, tenantId),
        isNull(account_metadata_table.deleted_at)
      ),
    });

    if (!metadata) {
      throw new Error(
        `No account found for user ${userId} in tenant ${tenantId}`
      );
    }

    finalAccountId = metadata.account_id;
  }

  // Get the account
  const account = await db.query.account_table.findFirst({
    where: (accounts, { eq }) => eq(accounts.id, finalAccountId),
  });

  if (!account) {
    throw new Error(`Account ${finalAccountId} not found`);
  }

  // Get the role for this account in this tenant
  const metadata = await db.query.account_metadata_table.findFirst({
    where: and(
      eq(account_metadata_table.account_id, finalAccountId),
      eq(account_metadata_table.tenant_id, tenantId),
      isNull(account_metadata_table.deleted_at)
    ),
  });

  if (!metadata) {
    throw new Error(
      `Account ${finalAccountId} is not a member of tenant ${tenantId}`
    );
  }

  const role = await db.query.role_table.findFirst({
    where: (roles, { eq }) => eq(roles.id, metadata.role_id),
  });

  if (!role) {
    throw new Error(`Role ${metadata.role_id} not found`);
  }

  // Create session token
  const { sessionId, sessionSecretHash, sessionToken } =
    await getSessionClient().createSessionToken();

  // Create session in the specified tenant context
  const session = await getSessionClient().create({
    sessionId,
    sessionSecretHash,
    userId: user.id,
    accountId: finalAccountId,
    tenantId: tenantId,
    roleId: metadata.role_id,
  });

  // Generate CSRF token for this session
  const csrfToken = await generateCSRFToken(sessionToken);

  const cookie = await serializeSigned(
    "pacetrack-session",
    sessionToken,
    process.env.SESSION_SECRET,
    {
      httpOnly: true,
      sameSite: "Lax",
      expires: new Date(session.expires_at),
      path: "/",
    }
  );

  return {
    user,
    account,
    tenant,
    role,
    cookie,
    csrfToken,
    session,
  };
}
