import { S3Client } from "bun";

// Security constants for file upload validation
// These prevent various file-based attacks and ensure proper resource management
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB - prevents DoS attacks via large file uploads
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
]; // Only allow image files - prevents executable uploads

export async function getS3Client() {
  // Using MinIO for local development
  const isProduction = Bun.env.NODE_ENV === "production";
  const region = isProduction ? Bun.env.S3_REGION : "us-east-1";
  const endpoint = isProduction ? Bun.env.S3_ENDPOINT : "http://localhost:9000";
  const accessKey = isProduction ? Bun.env.S3_ACCESS_KEY : "minioadmin";
  const secretKey = isProduction ? Bun.env.S3_SECRET_KEY : "minioadmin";

  return new S3Client({
    endpoint,
    region,
    accessKeyId: accessKey,
    secretAccessKey: secretKey,
    bucket: "pacetrack-storage",
  });
}

export function getTenantFolderPath(tenantId: string) {
  return `tenant-${tenantId}`;
}

export async function createFolderForTenant(tenantId: string) {
  const tenantFolderName = getTenantFolderPath(tenantId);

  const s3 = await getS3Client();
  await s3.write(`${tenantFolderName}/.keep`, "");
}

/**
 * Validates file upload for security
 *
 * This function performs multiple security checks to prevent:
 * - DoS attacks via large file uploads
 * - Malicious file uploads (executables, scripts)
 * - Path traversal attacks via filename manipulation
 * - Resource exhaustion via overly long filenames
 *
 * @param file - The file to validate
 * @returns Object with validation result and optional error message
 */
export function validateFileUpload(file: File): {
  valid: boolean;
  error?: string;
} {
  // Check file size to prevent DoS attacks
  // Large files can exhaust server resources and storage
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit`,
    };
  }

  // Check MIME type to prevent malicious file uploads
  // Only allow image files - prevents executable files, scripts, etc.
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return { valid: false, error: "File type not allowed" };
  }

  // Check filename for path traversal attempts
  // These characters could be used to access files outside the intended directory
  if (
    file.name.includes("..") ||
    file.name.includes("/") ||
    file.name.includes("\\")
  ) {
    return { valid: false, error: "Invalid filename" };
  }

  // Check filename length to prevent resource exhaustion
  // Extremely long filenames can cause issues with file systems and databases
  if (file.name.length > 255) {
    return { valid: false, error: "Filename too long" };
  }

  return { valid: true };
}

/**
 * Generates a secure filename to prevent conflicts and ensure security
 *
 * This function creates a unique filename that:
 * - Prevents filename conflicts between users
 * - Makes it harder to guess file paths
 * - Maintains the original file extension for proper MIME type detection
 * - Uses timestamp + random suffix for uniqueness
 *
 * @param originalName - The original filename
 * @returns A secure, unique filename
 */
export function generateSecureFilename(originalName: string): string {
  // Use timestamp for uniqueness and to make files sortable by upload time
  const timestamp = Date.now();

  // Add random suffix to prevent conflicts and make paths harder to guess
  const randomSuffix = Math.random().toString(36).substring(2, 15);

  // Preserve the original file extension for proper MIME type detection
  const extension = originalName.split(".").pop()?.toLowerCase() || "";

  return `${timestamp}-${randomSuffix}.${extension}`;
}

export async function uploadFile(
  file: File,
  {
    tenantId,
    path,
  }: {
    tenantId: string;
    path: string;
  }
) {
  // Security: Validate file before upload
  // This prevents malicious files from being uploaded to your storage
  const validation = validateFileUpload(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Create tenant-specific folder for proper isolation
  await createFolderForTenant(tenantId);

  // Upload file to S3/MinIO with tenant isolation
  const s3 = await getS3Client();
  const tenantFolderName = getTenantFolderPath(tenantId);
  const fileName = `${tenantFolderName}/${path}`;
  await s3.write(fileName, file);

  return `${tenantFolderName}/${path}`;
}

export async function deleteFile(fullPath: string) {
  try {
    const s3 = await getS3Client();
    await s3.delete(fullPath);
  } catch {
    // Ignore errors (file may not exist)
  }
}
