import { S3Client } from "bun";

/**
 * A small helper that creates S3 buckets for tests and tracks them so they can
 * be deleted (or at least fully emptied) afterwards.
 *
 * NOTE: Bun's native `S3Client` does not expose bucket–level operations such as
 * `createBucket` or `deleteBucket`. However, writing a file implicitly creates
 * the bucket if it does not already exist. Deleting every object in the bucket
 * (and leaving the empty bucket behind) is usually sufficient for test
 * isolation, especially when using disposable local MinIO instances. If you
 * *must* remove the bucket entirely, you can add your own logic for that – the
 * credentials gathered here will work with any S3-compatible SDK/CLI.
 */

/* -------------------------------------------------------------------------- */
/* Utils                                                                      */
/* -------------------------------------------------------------------------- */

function buildCredentials(bucket: string) {
  const isProduction = Bun.env.NODE_ENV === "production";

  const region = isProduction ? Bun.env.S3_REGION : "us-east-1";
  const endpoint = isProduction ? Bun.env.S3_ENDPOINT : "http://localhost:9000";
  const accessKeyId = isProduction ? Bun.env.S3_ACCESS_KEY : "minioadmin";
  const secretAccessKey = isProduction ? Bun.env.S3_SECRET_KEY : "minioadmin";

  return {
    bucket,
    region,
    endpoint,
    accessKeyId,
    secretAccessKey,
  } as const;
}

/* -------------------------------------------------------------------------- */
/* Public API                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Keeps track of every bucket that has been created via `createTestBucket` so
 * that we can clean them up later.
 */
const createdBuckets: Set<string> = new Set();

/**
 * Creates a bucket that can be safely used inside a test run. If `bucketName`
 * is omitted, a unique name will be generated automatically. The function
 * returns the name of the bucket that was created/ensured.
 */
export async function createTestBucket(bucketName?: string): Promise<string> {
  const name =
    bucketName ??
    `pacetrack-test-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const client = new S3Client(buildCredentials(name));

  // Writing a ".keep" file is enough to implicitly create the bucket when
  // using MinIO or another S3-compatible backend.
  await client.write(".keep", "");

  createdBuckets.add(name);
  return name;
}

/**
 * Empties – and, where possible, removes – every bucket that was registered
 * through `createTestBucket`.
 */
export async function removeAllTestBuckets(): Promise<void> {
  const errors: unknown[] = [];

  // Convert to array to avoid iterator issues under older TS targets
  for (const bucket of Array.from(createdBuckets)) {
    const creds = buildCredentials(bucket);

    try {
      // List every object (up to 1000 – more than enough for tests) and delete
      // them one by one.
      const listing = await S3Client.list(null, creds);
      if (listing.contents) {
        for (const { key } of listing.contents) {
          try {
            await S3Client.delete(key, creds);
          } catch (err) {
            console.error(
              `Failed to delete '${key}' in bucket '${bucket}':`,
              err
            );
            errors.push(err);
          }
        }
      }

      // Bun's S3 client currently has no explicit `deleteBucket` API. Leaving
      // an empty bucket behind is usually fine for ephemeral, containerised
      // test environments (for example MinIO running in Docker). If you **do**
      // need to remove the bucket itself, you can hook in an alternative SDK
      // call here that supports the operation.
    } catch (err) {
      console.error(`Error cleaning bucket '${bucket}':`, err);
      errors.push(err);
    }
  }

  // Reset the tracking set so the helper can be reused in subsequent tests.
  createdBuckets.clear();

  if (errors.length) {
    throw new Error(
      "Errors occurred while cleaning S3 buckets – see console for details"
    );
  }
}
