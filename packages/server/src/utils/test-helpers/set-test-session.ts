import {
  account_metadata_table,
  account_table,
  DEFAULT_ROLES,
  role_table,
  tenant_table,
  type User,
  user_table,
} from "@pacetrack/schema";
import { eq } from "drizzle-orm";
import { serializeSigned } from "hono/utils/cookie";
import { db } from "src/db";
import { getSessionClient } from "../helpers/auth/auth-session";
import { generateCSRFToken } from "../helpers/csrf/csrf";

let testUserCounter = 0;

export async function setTestSession(
  passedInUser?: Partial<Pick<User, "id">>,
  passedInEmail?: string,
  passedInPassword?: string
) {
  return await db.transaction(async (tx) => {
    if (!process.env.SESSION_SECRET)
      throw new Error("SESSION_SECRET is not set");

    const email = passedInEmail ?? `test${testUserCounter++}@test.com`;
    const password = passedInPassword ?? "password123";
    const hashed = await Bun.password.hash(password);

    let user: User | undefined;

    if (passedInUser?.id) {
      // Check for existing user
      user = await tx.query.user_table.findFirst({
        where: eq(user_table.id, passedInUser.id),
      });
    }

    if (!user) {
      // Create User (top-level identity)
      const resp = await tx.insert(user_table).values({}).returning();

      user = resp[0];
    }

    // Create Account (email/credentials) linked to User
    const [account] = await tx
      .insert(account_table)
      .values({
        user_id: user.id,
        email,
        password: hashed,
      })
      .returning();

    // Now create a personal tenant
    const [tenant] = await tx
      .insert(tenant_table)
      .values({
        name: "Personal",
        created_by: user.id,
        kind: "personal",
      })
      .returning();

    // Create the Owner role for this tenant
    const [role] = await tx
      .insert(role_table)
      .values({
        name: DEFAULT_ROLES.OWNER.name,
        kind: DEFAULT_ROLES.OWNER.kind,
        allowed: DEFAULT_ROLES.OWNER.allowed,
      })
      .returning();

    // Add the account to the tenant with the Owner role
    await tx.insert(account_metadata_table).values({
      user_id: user.id,
      account_id: account.id,
      tenant_id: tenant.id,
      role_id: role.id,
    });

    const { sessionId, sessionSecretHash, sessionToken } =
      await getSessionClient().createSessionToken();

    const session = await getSessionClient().create({
      sessionId,
      sessionSecretHash,
      userId: user.id,
      accountId: account.id,
      tenantId: tenant.id,
      roleId: role.id,
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
      csrfToken, // Include CSRF token for tests
    };
  });
}

/**
 * Helper function to make authenticated requests with CSRF tokens
 * Use this for state-changing operations (POST, PUT, DELETE)
 */
export function makeAuthenticatedRequest(
  cookie: string,
  csrfToken: string,
  method = "GET",
  headers: Record<string, string> = {}
) {
  const baseHeaders: Record<string, string> = {
    Cookie: cookie,
    ...headers,
  };

  // Add CSRF token for state-changing operations
  if (method !== "GET") {
    baseHeaders["x-csrf-token"] = csrfToken;
  }

  return baseHeaders;
}
