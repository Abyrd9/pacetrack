import type { App } from "src";
import { getS3Client } from "src/utils/helpers/s3";

// Security constants for file upload validation
// These prevent various file-based attacks like path traversal and malicious file uploads
const ALLOWED_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"];
const MAX_FILENAME_LENGTH = 255;

/**
 * Validates a filename for security
 *
 * Checks for:
 * - Filename length limits
 * - Path traversal attempts (../, /, \)
 * - Allowed file extensions only
 *
 * @param filename - The filename to validate
 * @returns True if the filename is safe
 */
function isValidFilename(filename: string): boolean {
  // Check filename length to prevent overly long names
  if (filename.length > MAX_FILENAME_LENGTH) return false;

  // Check for path traversal attempts
  // These characters could be used to access files outside the intended directory
  if (
    filename.includes("..") ||
    filename.includes("/") ||
    filename.includes("\\")
  )
    return false;

  // Check for allowed file extensions only
  // This prevents uploading executable files or other dangerous file types
  const ext = filename.toLowerCase().substring(filename.lastIndexOf("."));
  return ALLOWED_EXTENSIONS.includes(ext);
}

/**
 * Validates a tenant folder name for security
 *
 * Tenant folders should follow the pattern: tenant-{cuid2}
 * This ensures proper isolation between tenants and prevents path traversal
 *
 * @param folder - The folder name to validate
 * @returns True if the folder name is safe
 */
function isValidTenantFolder(folder: string): boolean {
  // Tenant folders must start with "tenant-" prefix
  if (!folder.startsWith("tenant-")) return false;

  // Check for path traversal attempts
  if (folder.includes("..") || folder.includes("/") || folder.includes("\\"))
    return false;

  // Validate CUID2 format (basic check)
  // CUID2 is a collision-resistant unique identifier
  const cuid2Part = folder.substring(7); // Remove "tenant-" prefix
  return /^[a-z0-9]{24,25}$/.test(cuid2Part);
}

export function serveRoute(app: App) {
  app.get("/serve/:tenantFolder/:filename", async (c) => {
    try {
      const tenantFolder = c.req.param("tenantFolder");
      const filename = c.req.param("filename");

      // Validate that both path components are provided
      if (!tenantFolder || !filename) {
        return c.text("Invalid path", 400);
      }

      // Security validation: Check tenant folder format
      // This prevents path traversal attacks and ensures proper tenant isolation
      if (!isValidTenantFolder(tenantFolder)) {
        return c.text("Invalid tenant folder", 400);
      }

      // Security validation: Check filename format
      // This prevents path traversal attacks and malicious file access
      if (!isValidFilename(filename)) {
        return c.text("Invalid filename", 400);
      }

      const s3 = await getS3Client();
      const filePath = `${tenantFolder}/${filename}`;

      try {
        // Get the file from S3
        const file = await s3.file(filePath);
        const exists = await file.exists();

        if (!exists) {
          return c.text("File not found", 404);
        }

        // Get the file content
        const buffer = await file.arrayBuffer();

        // Set appropriate content type based on file extension
        const contentType = getContentType(filename);
        c.header("Content-Type", contentType);

        // Set cache headers for avatars (1 week cache)
        c.header("Cache-Control", "public, max-age=604800");
        c.header("ETag", `"${filename}"`);

        return c.body(buffer);
      } catch (error) {
        console.error("Error fetching file from S3:", error);
        return c.text("File not found", 404);
      }
    } catch (error) {
      console.error("Error serving file:", error);
      return c.text("Internal server error", 500);
    }
  });
}

function getContentType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    case "svg":
      return "image/svg+xml";
    default:
      return "application/octet-stream";
  }
}
