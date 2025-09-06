import { beforeAll, describe, expect, test } from "bun:test";
import {
  ACCOUNT_DELETE_ROUTE,
  type AccountDeleteRouteResponse,
  account_table,
} from "@pacetrack/schema";
import { eq } from "drizzle-orm";
import { serializeSigned } from "hono/utils/cookie";
import { getSessionClient } from "src/utils/helpers/auth/auth-session";
import { generateCSRFToken } from "src/utils/helpers/csrf/csrf";
import { createTestAccount } from "src/utils/test-helpers/create-test-account";
import { resetDb } from "src/utils/test-helpers/reset-db";
import {
  makeAuthenticatedRequest,
  setTestSession,
} from "src/utils/test-helpers/set-test-session";
import app from "../..";
import { db } from "../../db";

beforeAll(async () => {
  await resetDb();
});

describe("Account Delete Route", () => {
  test("deletes account when current user has manage_accounts permission", async () => {
    await resetDb();
    const { cookie, csrfToken, tenant } = await setTestSession();
    const { account: accountToDelete } = await createTestAccount({
      tenantId: tenant.id,
      email: "delete-me@test.com",
    });

    const response = await app.request(ACCOUNT_DELETE_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        accountId: accountToDelete.id,
      }),
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as AccountDeleteRouteResponse;
    expect(body.status).toBe("ok");

    // Verify account is soft deleted
    const deletedAccount = await db.query.account_table.findFirst({
      where: eq(account_table.id, accountToDelete.id),
    });
    expect(deletedAccount?.deleted_at).toBeDefined();
  });

  // TODO: You can delete your own account, but we need to fall back to other accounts when you do
  // test("returns 400 when trying to delete yourself", async () => {
  // 	await resetDb();
  // 	const { cookie, csrfToken, account } = await setTestSession();

  // 	const response = await app.request(ACCOUNT_DELETE_ROUTE.path, {
  // 		method: "POST",
  // 		headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
  // 			"Content-Type": "application/json",
  // 		}),
  // 		body: JSON.stringify({
  // 			accountId: account.id,
  // 		}),
  // 	});

  // 	expect(response.status).toBe(400);
  // 	const body = (await response.json()) as AccountDeleteRouteResponse;
  // 	expect(body.status).toBe("error");
  // 	expect(body.errors?.global).toBe("You cannot delete yourself");
  // });

  test("returns 403 when user lacks manage_accounts permission", async () => {
    await resetDb();
    const { tenant } = await setTestSession();
    const { account: accountToDelete } = await createTestAccount({
      tenantId: tenant.id,
      email: "no-permission@test.com",
    });

    // Create a user without manage_users permission in the same tenant
    const { account: regularAccount, role: regularRole } =
      await createTestAccount({
        tenantId: tenant.id,
        email: "regular@test.com",
        roleKind: "member",
      });

    // Create a session for the regular user manually
    const { sessionId, sessionSecretHash, sessionToken } =
      await getSessionClient().createSessionToken();

    const session = await getSessionClient().create({
      sessionId,
      sessionSecretHash,
      userId: regularAccount.id,
      accountId: regularAccount.id,
      tenantId: tenant.id,
      roleId: regularRole.id,
    });

    const csrfToken2 = await generateCSRFToken(sessionToken);
    const cookie2 = await serializeSigned(
      "pacetrack-session",
      sessionToken,
      Bun.env.SESSION_SECRET || "",
      {
        httpOnly: true,
        sameSite: "Lax",
        expires: new Date(session.expires_at),
        path: "/",
      }
    );

    const response = await app.request(ACCOUNT_DELETE_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie2, csrfToken2, "POST", {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        accountId: accountToDelete.id,
      }),
    });

    const body = (await response.json()) as AccountDeleteRouteResponse;
    expect(response.status).toBe(403);
    expect(body.status).toBe("error");
    expect(body.errors?.global).toBe("You are not authorized");
  });

  test("returns 400 when target account not found in tenant", async () => {
    await resetDb();
    const { cookie, csrfToken } = await setTestSession();

    const response = await app.request(ACCOUNT_DELETE_ROUTE.path, {
      method: "POST",
      headers: makeAuthenticatedRequest(cookie, csrfToken, "POST", {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        accountId: "non-existent-account-id",
      }),
    });

    expect(response.status).toBe(400);
    const body = (await response.json()) as AccountDeleteRouteResponse;
    expect(body.status).toBe("error");
    expect(body.errors?.global).toBe("Account not found in tenant");
  });
});
