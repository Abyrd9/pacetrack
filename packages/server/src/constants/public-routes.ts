import {
  ACCOUNT_CONFIRM_EMAIL_CHANGE_ROUTE,
  FORGOT_PASSWORD_ROUTE,
  RESET_PASSWORD_ROUTE,
  RESET_PASSWORD_VALIDATE_ROUTE,
  SIGN_IN_ROUTE,
  SIGN_UP_ROUTE,
} from "@pacetrack/schema";

export const PUBLIC_API_ROUTES = [
  "/api/healthcheck",
  "/serve/*", // File serving route (no auth required)
  SIGN_IN_ROUTE.path,
  SIGN_UP_ROUTE.path,
  FORGOT_PASSWORD_ROUTE.path,
  RESET_PASSWORD_ROUTE.path,
  RESET_PASSWORD_VALIDATE_ROUTE.path,
  ACCOUNT_CONFIRM_EMAIL_CHANGE_ROUTE.path,
];

export const PUBLIC_WEB_ROUTES = [
  "/auth",
  "/auth/sign-in",
  "/auth/sign-up",
  "/auth/forgot-password",
];
