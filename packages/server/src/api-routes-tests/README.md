# API Route Tests

## CSRF Protection Updates

All tests have been updated to handle CSRF protection. Here's what changed:

### Test Helper Updates

1. **`setTestSession()`** now returns a `csrfToken` along with the session cookie
2. **`makeAuthenticatedRequest()`** helper function automatically includes CSRF tokens for state-changing operations

### Test File Updates

#### Updated Files:
- `auth/sign-in.test.ts` - Verifies CSRF tokens are returned in successful login
- `auth/sign-up.test.ts` - Verifies CSRF tokens are returned in successful signup
- `tenant/tenant.get.test.ts` - Uses new helper for GET requests
- `tenant/tenant.create.test.ts` - Uses CSRF tokens for POST requests + added CSRF validation tests
- `user/user.update.test.ts` - Uses CSRF tokens for POST requests

#### New Files:
- `csrf-protection.test.ts` - Comprehensive CSRF protection tests

### How to Update Remaining Tests

For any test file that makes state-changing requests (POST, PUT, DELETE), update it like this:

```typescript
// Before
const { cookie } = await setTestSession();

const response = await app.request("/api/endpoint", {
  method: "POST",
  headers: { Cookie: cookie },
  body: form,
});

// After
const { cookie, csrfToken } = await setTestSession();

const response = await app.request("/api/endpoint", {
  method: "POST",
  headers: makeAuthenticatedRequest(cookie, csrfToken, "POST"),
  body: form,
});
```

### CSRF Test Coverage

The `csrf-protection.test.ts` file covers:
- ✅ GET requests work without CSRF tokens
- ✅ POST/PUT/DELETE require CSRF tokens
- ✅ Invalid CSRF tokens are rejected
- ✅ Valid CSRF tokens are accepted
- ✅ CSRF tokens work via header or query parameter
- ✅ Auth endpoints are exempt from CSRF protection
- ✅ File serving is exempt from CSRF protection
- ✅ Both session and CSRF token are required

### Running Tests

```bash
# Run all tests
bun test

# Run CSRF tests only
bun test csrf-protection.test.ts

# Run specific test file
bun test auth/sign-in.test.ts
``` 