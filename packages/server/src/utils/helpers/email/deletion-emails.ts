import type { Account } from "@pacetrack/schema";
import { resend } from "../resend";

/**
 * Send email notification when a tenant is deleted.
 * Notifies all affected members.
 */
export async function sendTenantDeletedEmail(
  email: string,
  tenantName: string,
  deletedBy: string
): Promise<void> {
  try {
    await resend.emails.send({
      from: "info@pacetrack.com",
      to: email,
      subject: `Tenant "${tenantName}" has been deleted`,
      html: `
        <h2>Tenant Deleted</h2>
        <p>The tenant <strong>${tenantName}</strong> has been deleted by an administrator.</p>
        <p>You no longer have access to this workspace and all associated data.</p>
        <p>If you believe this was done in error, please contact the workspace administrator.</p>
        <br />
        <p style="color: #666; font-size: 12px;">
          This action was performed by user ID: ${deletedBy}
        </p>
      `,
    });
  } catch (error) {
    console.error("Failed to send tenant deleted email:", error);
    // Don't throw - email failure shouldn't block deletion
  }
}

/**
 * Send email notification when an account is removed from a tenant.
 * Sent to the account that was removed.
 */
export async function sendAccountRemovedEmail(
  email: string,
  tenantName: string,
  wasVoluntary: boolean
): Promise<void> {
  try {
    await resend.emails.send({
      from: "info@pacetrack.com",
      to: email,
      subject: wasVoluntary
        ? `You have left "${tenantName}"`
        : `You have been removed from "${tenantName}"`,
      html: wasVoluntary
        ? `
            <h2>You Left a Workspace</h2>
            <p>You have successfully left the workspace <strong>${tenantName}</strong>.</p>
            <p>You no longer have access to this workspace.</p>
            <p>If you need to rejoin, please contact the workspace administrator for a new invitation.</p>
          `
        : `
            <h2>Removed from Workspace</h2>
            <p>You have been removed from the workspace <strong>${tenantName}</strong> by an administrator.</p>
            <p>You no longer have access to this workspace and its resources.</p>
            <p>If you believe this was done in error, please contact the workspace administrator.</p>
          `,
    });
  } catch (error) {
    console.error("Failed to send account removed email:", error);
    // Don't throw - email failure shouldn't block deletion
  }
}

/**
 * Send confirmation email when a user deletes their entire account.
 * Sent to all email addresses associated with the user.
 */
export async function sendUserDeletedEmail(
  email: string,
  accountCount: number,
  tenantCount: number
): Promise<void> {
  try {
    await resend.emails.send({
      from: "info@pacetrack.com",
      to: email,
      subject: "Your Pacetrack account has been deleted",
      html: `
        <h2>Account Deleted</h2>
        <p>Your Pacetrack account has been permanently deleted as requested.</p>
        <h3>What was deleted:</h3>
        <ul>
          <li><strong>${accountCount}</strong> email account(s)</li>
          <li><strong>${tenantCount}</strong> personal workspace(s)</li>
          <li>All associated subscriptions have been cancelled</li>
          <li>All active sessions have been terminated</li>
        </ul>
        <p>Your data has been soft-deleted and may be recoverable for a limited time if you contact support immediately.</p>
        <p>If you did not initiate this deletion, please contact support@pacetrack.com immediately.</p>
        <br />
        <p style="color: #666; font-size: 12px;">
          Thank you for using Pacetrack.
        </p>
      `,
    });
  } catch (error) {
    console.error("Failed to send user deleted email:", error);
    // Don't throw - email failure shouldn't block deletion
  }
}

/**
 * Send notification emails to all members of a deleted tenant.
 * This is a batch operation that sends emails to multiple users.
 */
export async function notifyTenantMembers(
  members: Array<{ account: Account | null }>,
  tenantName: string,
  deletedBy: string
): Promise<void> {
  const emails = members
    .map((m) => m.account?.email)
    .filter((email): email is string => Boolean(email));

  // Send emails in parallel (but don't wait for all to complete)
  const emailPromises = emails.map((email) =>
    sendTenantDeletedEmail(email, tenantName, deletedBy)
  );

  // Fire and forget - we don't want to block on email delivery
  Promise.allSettled(emailPromises).catch((error) => {
    console.error("Error sending tenant deletion notifications:", error);
  });
}

/**
 * Send notification emails to all email addresses associated with a deleted user.
 */
export async function notifyUserDeletion(
  accounts: Account[],
  personalTenantCount: number
): Promise<void> {
  const emails = accounts
    .map((a) => a.email)
    .filter((email): email is string => Boolean(email));

  // Send emails in parallel
  const emailPromises = emails.map((email) =>
    sendUserDeletedEmail(email, accounts.length, personalTenantCount)
  );

  // Fire and forget - we don't want to block on email delivery
  Promise.allSettled(emailPromises).catch((error) => {
    console.error("Error sending user deletion notifications:", error);
  });
}
