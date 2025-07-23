import {
  type Account,
  account_metadata_table,
  account_table,
  type User,
  user_table,
} from "@pacetrack/schema";
import { count, eq, sql } from "drizzle-orm";
import { db } from "src/db";

export type LinkAccountOptions = {
  accountToLink: Account;
  userToLinkTo: User;
  currentUserId: string;
};

/**
 * Links an account to a user, handling user merging if necessary.
 * Returns the target user ID that the account now belongs to.
 */
export async function linkAccountToUser({
  accountToLink,
  userToLinkTo,
  currentUserId,
}: LinkAccountOptions): Promise<string> {
  // If account already belongs to current user, nothing to do
  if (userToLinkTo.id === currentUserId) {
    return currentUserId;
  }

  // Get current user to compare creation dates
  const currentUser = await db
    .select()
    .from(user_table)
    .where(eq(user_table.id, currentUserId))
    .limit(1);

  if (!currentUser[0]) {
    throw new Error("Current user not found");
  }

  // Determine which user was created earliest
  const earliestUser =
    (currentUser[0].created_at ?? new Date(0)) <
    (userToLinkTo.created_at ?? new Date(0))
      ? currentUser[0]
      : userToLinkTo;
  const latestUser =
    (currentUser[0].created_at ?? new Date(0)) <
    (userToLinkTo.created_at ?? new Date(0))
      ? userToLinkTo
      : currentUser[0];

  // Move the account from the latest user to the earliest user
  const targetUserId = earliestUser.id;

  await db
    .update(account_table)
    .set({
      user_id: targetUserId,
    })
    .where(eq(account_table.id, accountToLink.id));

  // Update ALL account_metadata entries for this account to point to the target user
  await db
    .update(account_metadata_table)
    .set({
      user_id: targetUserId,
      updated_at: sql`now()`,
    })
    .where(eq(account_metadata_table.account_id, accountToLink.id));

  // If the current user is the "latest" user, move ALL their accounts to the earliest user
  if (currentUserId === latestUser.id) {
    await db
      .update(account_table)
      .set({
        user_id: targetUserId,
      })
      .where(eq(account_table.user_id, currentUserId));

    // Also update all account_metadata for current user's accounts
    await db
      .update(account_metadata_table)
      .set({
        user_id: targetUserId,
        updated_at: sql`now()`,
      })
      .where(eq(account_metadata_table.user_id, currentUserId));
  }

  // If the latest user has no other accounts, soft delete them
  const possibleOtherAccounts = await db
    .select({
      count: count(),
    })
    .from(account_table)
    .where(eq(account_table.user_id, latestUser.id));

  if (possibleOtherAccounts[0].count === 0) {
    await db
      .update(user_table)
      .set({
        deleted_at: sql`now()`,
      })
      .where(eq(user_table.id, latestUser.id));
  }

  return targetUserId;
}
