import { beforeAll, describe, expect, test } from "bun:test";
import { resetDb } from "src/utils/test-helpers/reset-db";
import { setTestSession } from "src/utils/test-helpers/set-test-session";
import app from "../..";
import { getS3Client } from "../../utils/helpers/s3";

beforeAll(async () => {
  await resetDb();
});

describe("Serve Route", () => {
  test("successfully serves a file from S3", async () => {
    await resetDb();
    const { tenant } = await setTestSession();

    // Upload a test file to S3
    const s3 = await getS3Client();
    const testContent = "test image content";
    const testBuffer = Buffer.from(testContent);
    const filePath = `tenant-${tenant.id}/test-image.png`;

    const file = await s3.file(filePath);
    await file.write(testBuffer);

    // Request the file through the serve route
    const response = await app.request(
      `/serve/tenant-${tenant.id}/test-image.png`
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
    expect(response.headers.get("Cache-Control")).toBe(
      "public, max-age=604800"
    );
    expect(response.headers.get("ETag")).toBe('"test-image.png"');

    const body = await response.text();
    expect(body).toBe(testContent);

    // Cleanup
    await file.delete();
  });

  test("returns 404 when file does not exist", async () => {
    await resetDb();
    const { tenant } = await setTestSession();

    const response = await app.request(
      `/serve/tenant-${tenant.id}/non-existent.png`
    );

    expect(response.status).toBe(404);
    expect(await response.text()).toBe("File not found");
  });

  test("returns 400 for invalid tenant folder format", async () => {
    await resetDb();

    const response = await app.request("/serve/invalid-folder/test.png");

    expect(response.status).toBe(400);
    expect(await response.text()).toBe("Invalid tenant folder");
  });

  test("returns 400 for path traversal attempt in tenant folder", async () => {
    await resetDb();

    // Try with a tenant folder that contains path traversal
    const response = await app.request("/serve/tenant-abc..def/test.png");

    expect(response.status).toBe(400);
    expect(await response.text()).toBe("Invalid tenant folder");
  });

  test("returns 400 for path traversal attempt in filename", async () => {
    await resetDb();
    const { tenant } = await setTestSession();

    // Filename with path traversal characters
    const response = await app.request(
      `/serve/tenant-${tenant.id}/..%2Fpasswd`
    );

    expect(response.status).toBe(400);
    expect(await response.text()).toBe("Invalid filename");
  });

  test("returns 400 for disallowed file extension", async () => {
    await resetDb();
    const { tenant } = await setTestSession();

    const response = await app.request(
      `/serve/tenant-${tenant.id}/malicious.exe`
    );

    expect(response.status).toBe(400);
    expect(await response.text()).toBe("Invalid filename");
  });

  test("returns 400 for overly long filename", async () => {
    await resetDb();
    const { tenant } = await setTestSession();

    const longFilename = "a".repeat(300) + ".png";
    const response = await app.request(
      `/serve/tenant-${tenant.id}/${longFilename}`
    );

    expect(response.status).toBe(400);
    expect(await response.text()).toBe("Invalid filename");
  });

  test("returns correct content type for different image formats", async () => {
    await resetDb();
    const { tenant } = await setTestSession();
    const s3 = await getS3Client();

    const imageTypes = [
      { ext: "png", contentType: "image/png" },
      { ext: "jpg", contentType: "image/jpeg" },
      { ext: "jpeg", contentType: "image/jpeg" },
      { ext: "gif", contentType: "image/gif" },
      { ext: "webp", contentType: "image/webp" },
      { ext: "svg", contentType: "image/svg+xml" },
    ];

    for (const { ext, contentType } of imageTypes) {
      const filename = `test-image.${ext}`;
      const filePath = `tenant-${tenant.id}/${filename}`;
      const file = await s3.file(filePath);
      await file.write(Buffer.from("test"));

      const response = await app.request(
        `/serve/tenant-${tenant.id}/${filename}`
      );

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe(contentType);

      await file.delete();
    }
  });

  test("returns 404 when URL pattern doesn't match (missing components)", async () => {
    await resetDb();

    // These URLs don't match the route pattern /serve/:tenantFolder/:filename
    // so Hono returns 404 before the route handler is even called
    const response1 = await app.request("/serve//test.png");
    expect(response1.status).toBe(404);

    const { tenant } = await setTestSession();
    const response2 = await app.request(`/serve/tenant-${tenant.id}/`);
    expect(response2.status).toBe(404);
  });
});
