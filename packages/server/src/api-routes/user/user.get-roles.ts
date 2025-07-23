import {
  USER_GET_ROLES_ROUTE_PATH,
  makeUserGetRolesRouteResponse,
  role_table,
  users_to_tenants_table,
  type Role,
} from "@pacetrack/schema";
import { eq } from "drizzle-orm";
import type { App } from "src";
import { db } from "src/db";

export function userGetRolesRoute(app: App) {
  app.post(USER_GET_ROLES_ROUTE_PATH, async (c) => {
    try {
      const userId = c.get("user_id");

      // Get all user-tenant relationships with roles
      const userRoles = await db
        .select({
          tenant_id: users_to_tenants_table.tenant_id,
          role: role_table,
        })
        .from(users_to_tenants_table)
        .innerJoin(
          role_table,
          eq(role_table.id, users_to_tenants_table.role_id)
        )
        .where(eq(users_to_tenants_table.user_id, userId));

      // Transform into a map of tenant_id -> permissions
      const rolesMap: Record<string, Role[]> = {};
      userRoles.forEach(({ tenant_id, role }) => {
        if (!rolesMap[tenant_id]) {
          rolesMap[tenant_id] = [];
        }
        rolesMap[tenant_id].push(role);
      });

      return c.json(
        makeUserGetRolesRouteResponse({
          key: USER_GET_ROLES_ROUTE_PATH,
          status: "ok",
          payload: { roles: rolesMap },
        }),
        200
      );
    } catch (error) {
      console.error(error);
      return c.json(
        makeUserGetRolesRouteResponse({
          key: USER_GET_ROLES_ROUTE_PATH,
          status: "error",
          errors: {
            global: "Something went wrong",
          },
        }),
        500
      );
    }
  });
}
