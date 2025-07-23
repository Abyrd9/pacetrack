# Pacetrack – Multi-Tenant SaaS Starter

A production-ready starter template for multi-tenant SaaS applications built with **Bun + Hono + Drizzle ORM**.

## Tech Stack

- **Backend:** Bun + Hono + Drizzle ORM (PostgreSQL)
- **Frontend:** React 18 + Vite + Tailwind CSS
- **Storage:** S3/MinIO with per-tenant isolation
- **Email:** Resend for transactional emails
- **Payments:** Stripe integration
- **Rate Limiting:** Redis-backed with configurable limits

## Core Features

✅ **Multi-tenant architecture** with role-based permissions  
✅ **Session-based authentication** with device tracking  
✅ **File uploads** with automatic image processing  
✅ **Rate limiting** across all endpoints  
✅ **Stripe billing** integration  
✅ **Email workflows** (signup, password reset, invites)

---

## 1. How Authentication Works

### Session Management

- **Token Generation:** 20-byte random tokens, SHA-256 hashed for storage
- **Cookie Storage:** Signed HTTP-only cookies (`pacetrack-session`)
- **Expiration:** 30-day sessions with rolling renewal (extends when <15 days remain)
- **Device Tracking:** IP address, user agent, and last activity timestamps

### Session Lifecycle

```typescript
// Create session (sign-in/sign-up)
const token = sessions.generateToken();
const session = await sessions.create({
  token,
  userId,
  tenantId,
  ipAddress,
  userAgent,
});
await setSessionTokenCookie(c, token, session.expires_at);

// Validate session (middleware)
const { session, user, tenant, role } = await sessions.validateToken({
  token,
  tenantId,
  ipAddress,
  userAgent,
});

// Revoke session
await sessions.invalidate({ sessionId });
```

### Security Features

- Sessions marked as `revoked_at` instead of deleted
- Automatic cleanup of expired sessions
- IP/User-Agent tracking for security monitoring
- Rolling session extension for active users

---

## 2. How Users → Tenants → Accounts Works

### Data Model

```
User ──┐
       ├── UsersToTenants ──> Tenant ──> Account
       └── Role (per tenant)
```

### Relationships

**Users**

- Can belong to multiple tenants
- Have different roles per tenant
- Always get a "Personal" tenant on signup

**Tenants**

- `kind`: `"personal"` (immutable) or `"org"`
- Linked to exactly one billing Account
- Contain teams, resources, and user permissions

**Accounts**

- Handle Stripe billing (`customer_id`, `subscription_id`)
- One account can have multiple tenants
- Track billing contacts via `users_to_tenants.is_billing_contact`

### User-Tenant Assignment

```typescript
// Join table with role and metadata
users_to_tenants: {
  user_id: string;
  tenant_id: string;
  role_id: string;
  is_primary_contact: boolean;
  is_billing_contact: boolean;
}
```

### Session Context

Every authenticated request provides:

- `user`: Current user object
- `tenant`: Active tenant (switchable)
- `role`: User's role within current tenant
- `session`: Session metadata

---

## 3. How Rate Limiting Works

### Redis-Backed Implementation

Uses sliding window rate limiting with automatic key expiration.

### Rate Limit Tiers

```typescript
// Auth routes (sign-in, sign-up, password reset)
authRateLimit: 5 requests / 15 minutes per IP

// File serving (public assets)
serveRateLimit: 500 requests / hour per IP

// API routes (authenticated endpoints)
apiRateLimit: 100 requests / 15 minutes per user
```

### Key Generation Strategy

- **Authenticated users:** `api:${userId}` or `auth:${ip}`
- **Anonymous requests:** `serve:${ip}` or `auth:${ip}`
- **IP Detection:** Checks `x-forwarded-for`, `x-real-ip`, `cf-connecting-ip`

### Response Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1640995200000
Retry-After: 900
```

### Middleware Application

```typescript
// Applied automatically in src/index.ts
app.use("/api/auth/*", authRateLimit);
app.use("/serve/*", serveRateLimit);
app.use("/api/*", apiRateLimit);
```

---

## 4. How File Uploading Works

### S3/MinIO Storage

- **Local Development:** MinIO container (`localhost:9000`)
- **Production:** AWS S3 or compatible service
- **Bucket:** `pacetrack-storage` with tenant-based folders

### Per-Tenant Isolation

```typescript
// File paths: tenant-{tenantId}/filename
const tenantFolder = `tenant-${tenantId}`;
const filePath = `${tenantFolder}/${filename}`;

// Upload
await uploadFile(file, { tenantId, path: "avatar.png" });
// → Stored as: tenant-abc123/avatar.png
```

### Image Processing (Avatars)

```typescript
// Automatic PNG conversion with Sharp
const buffer = Buffer.from(await file.arrayBuffer());
const png = await sharp(buffer).png().toBuffer();
const processedFile = new File([png], filename, { type: "image/png" });
```

### File Serving

- **Public Route:** `/serve/:tenantFolder/:filename`
- **Caching:** 1-day cache headers with ETag support
- **Content-Type:** Auto-detected from file extension
- **Security:** Validates tenant folder format

### Upload Flow

1. **Receive file** via multipart form data
2. **Process image** (resize/convert to PNG for avatars)
3. **Generate unique filename** with nanoid to bust CDN cache
4. **Upload to S3** in tenant-specific folder
5. **Store path** in database (`image_url` field)
6. **Clean up old files** (best-effort deletion)

---

## Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/pacetrack

# Auth
SESSION_SECRET=your-secret-key-here

# Storage (S3/MinIO)
S3_REGION=us-east-1
S3_ENDPOINT=https://s3.amazonaws.com  # or http://localhost:9000 for MinIO
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key

# Email
RESEND_API_KEY=re_your-api-key

# Payments
STRIPE_SECRET_KEY=sk_test_your-stripe-key

# Rate Limiting
REDIS_URL=redis://localhost:6379
```

## Quick Start

```bash
# Install dependencies
bun install

# Start services (PostgreSQL, Redis, MinIO)
docker compose up -d

# Run database migrations
cd packages/server && bun run db:migrate

# Start development servers
bun run dev  # Starts both web-app and server
```

## Project Structure

```
packages/
├── schema/          # Shared database schemas and types
│   ├── db-schema/   # Drizzle table definitions
│   └── routes-schema/ # API request/response types
├── server/          # Hono API backend
│   ├── api-routes/  # Route handlers
│   └── utils/       # Auth, rate limiting, S3 helpers
└── web-app/         # React frontend
    └── routes/      # File-based routing
```
