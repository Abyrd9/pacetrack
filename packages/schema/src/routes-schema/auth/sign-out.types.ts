import { z } from "zod/v4";
import type { RouteResponse } from "../../types/generics";

export const SignOutSuccessSchema = z.object({
	status: z.literal("ok"),
});

export type SignOutRouteResponse = RouteResponse<
	typeof SignOutSuccessSchema,
	never
>;

export const makeSignOutRouteResponse = (args: SignOutRouteResponse) => args;

export const SIGN_OUT_ROUTE_PATH = "/api/auth/sign-out";
