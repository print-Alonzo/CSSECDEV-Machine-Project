# CSSECDV Secure Web App Blueprint

This document outlines an end-to-end plan to implement the CSSECDV machine project using SvelteKit for a small-shop order management system. It covers architecture, data model, sample code, RBAC, logging, demo steps, and a mapping to the checklist.

## Domain and Roles
- **Administrator**: manages admins and managers (Role A), assigns roles, reads audit logs, changes own password.
- **Role A (Manager)**: manages Role B users within scope, approves orders, CRUD on shared inventory/products, changes own password.
- **Role B (Customer/Employee)**: self-registers, manages own orders/profile, changes own password.

## Phase 1 – Architecture & Data Model

### SvelteKit structure (TypeScript recommended)
```
src/
  hooks.server.ts           # session parsing + centralized RBAC gate
  lib/
    auth/
      password.ts           # hashing, complexity checks, history enforcement
      session.ts            # cookie/JWT utils, re-auth helpers
      rbac.ts               # role constants, authorize helper
    db/
      client.ts             # Prisma client
      schema.prisma         # DB schema
    logging/
      logger.ts             # DB-backed audit logger
    validation/
      schemas.ts            # Zod schemas reused by endpoints/forms
  routes/
    +layout.server.ts       # protects all routes by default
    +page.svelte            # optional public landing
    login/+page.(svelte|server.ts)
    register/+page.(svelte|server.ts)
    admin/
      users/+page.svelte    # manage admins/managers
      logs/+page.svelte     # read-only audit logs
    manager/ (Role A)
      users/+page.svelte    # manage Role B within scope
      inventory/+page.svelte
    orders/
      +page.svelte          # Role B own orders
      [id]/+page.svelte
    profile/
      change-password/+page.svelte
    api/...
```

### Session/auth strategy
- **HTTP-only, Secure, SameSite=strict cookie** storing a signed session token (UUID) mapped to a server-side session table with user id, role, and last re-auth time.
- Use `hooks.server.ts` to hydrate `locals.user` from the session and enforce auth by default.
- Invalidate session on logout or lockout; rotate session ID after login and re-auth.

### Database schema (Prisma-style)
- **User**: id, email (unique), username (unique), role (ADMIN | MANAGER | CUSTOMER), passwordHash, failedLoginAttempts, lockoutUntil, lastLoginAt, lastLoginStatus, lastReauthAt, createdAt, updatedAt.
- **PasswordHistory**: id, userId (FK), passwordHash, createdAt (enforce last N and min age).
- **Session**: id, userId, createdAt, expiresAt, lastReauthAt, ip, userAgent.
- **AuditLog**: id, userId (nullable for anonymous), action, outcome, ip, userAgent, route, metadata (JSON), createdAt.
- **Order**: id, userId (owner), status, total, items (JSON), createdAt, updatedAt.
- **Product**: id, name, sku, price, stock, createdAt, updatedAt (CRUD for Role A).
- **ManagerAssignment**: id, managerId (Role A), customerId (Role B) to scope which users Role A can manage.

## Phase 2 – Auth & RBAC (sample code)

### Registration endpoint (`src/routes/register/+page.server.ts`)
```ts
import type { Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { prisma } from '$lib/db/client';
import { passwordSchema, registrationSchema } from '$lib/validation/schemas';
import { hashPassword, recordPasswordHistory } from '$lib/auth/password';
import { logEvent } from '$lib/logging/logger';

export const actions: Actions = {
  default: async ({ request, getClientAddress }) => {
    const form = Object.fromEntries(await request.formData());
    const parsed = registrationSchema.safeParse(form);
    if (!parsed.success) {
      await logEvent('register', 'fail', { reason: 'validation', issues: parsed.error.flatten() }, getClientAddress());
      return fail(400, { message: 'Validation failed', errors: parsed.error.flatten() });
    }

    const { email, username, password } = parsed.data;
    const existing = await prisma.user.findFirst({ where: { OR: [{ email }, { username }] } });
    if (existing) {
      await logEvent('register', 'fail', { reason: 'duplicate' }, getClientAddress());
      return fail(400, { message: 'Validation failed' });
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({ data: { email, username, role: 'CUSTOMER', passwordHash } });
    await recordPasswordHistory(user.id, passwordHash);
    await logEvent('register', 'success', { userId: user.id }, getClientAddress());
    throw redirect(303, '/login');
  }
};
```

### Login with lockout and last-login tracking (`src/routes/login/+page.server.ts`)
```ts
const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

export const actions: Actions = {
  default: async ({ request, cookies, getClientAddress }) => {
    const { username, password } = Object.fromEntries(await request.formData());
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      await logEvent('login', 'fail', { reason: 'unknown-user' }, getClientAddress());
      return fail(400, { message: 'Invalid username and/or password' });
    }

    if (user.lockoutUntil && user.lockoutUntil > new Date()) {
      await logEvent('login', 'fail', { reason: 'locked' }, getClientAddress(), user.id);
      return fail(400, { message: 'Invalid username and/or password' });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    const now = new Date();

    if (!valid) {
      const attempts = user.failedLoginAttempts + 1;
      const lockoutUntil = attempts >= MAX_ATTEMPTS ? new Date(now.getTime() + LOCKOUT_MINUTES * 60000) : null;
      await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: lockoutUntil ? 0 : attempts, lockoutUntil, lastLoginAt: now, lastLoginStatus: 'FAIL' }
      });
      await logEvent('login', 'fail', { reason: 'bad-password', attempts }, getClientAddress(), user.id);
      return fail(400, { message: 'Invalid username and/or password' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockoutUntil: null, lastLoginAt: now, lastLoginStatus: 'SUCCESS' }
    });

    const sessionId = await createSession(user.id, getClientAddress(), request.headers.get('user-agent') ?? '');
    cookies.set('session', sessionId, { httpOnly: true, sameSite: 'strict', secure: true, path: '/', maxAge: 60 * 60 * 24 });
    await logEvent('login', 'success', {}, getClientAddress(), user.id);
    throw redirect(303, '/');
  }
};
```

### Centralized RBAC (`src/hooks.server.ts`)
```ts
import { handleAuthorization } from '$lib/auth/rbac';
import { getSessionUser } from '$lib/auth/session';

export const handle = async ({ event, resolve }) => {
  event.locals.user = await getSessionUser(event);
  const decision = await handleAuthorization(event);
  if (!decision.allowed) {
    await logEvent('access-control', 'fail', { route: event.url.pathname, reason: decision.reason }, event.getClientAddress(), event.locals.user?.id);
    return new Response('Forbidden', { status: decision.status });
  }
  return resolve(event);
};
```

`handleAuthorization` would inspect `event.route.id` and `event.locals.user.role` to allow/deny (401 if no session, 403 if insufficient role). Routes inherit protection via `+layout.server.ts` redirecting unauthenticated users.

### Re-authentication example (change password)
- Store `lastReauthAt` in session row and cookies.
- Require fresh auth within 5 minutes for critical actions.
```ts
import { requireRecentReauth } from '$lib/auth/session';

export const actions: Actions = {
  default: async ({ locals, request }) => {
    await requireRecentReauth(locals.sessionId, 5 * 60 * 1000);
    // proceed with password change after verifying current password
  }
};
```

## Phase 3 – CRUD & Role-Specific Screens

### Admin dashboard
- **Users management**: CRUD for admins/managers, change roles, reset lockouts.
- **Logs page**: read-only table with filters (date, user, action, outcome) hitting `/admin/logs/+server.ts` which checks `role === 'ADMIN'`.

### Role A (Manager) dashboard
- Manage Role B assignments: endpoint ensures `managerId === locals.user.id` when updating customers.
- Inventory CRUD: server endpoints validate product fields (name charset, price > 0, stock >= 0) and log validation failures.

### Role B (Customer) dashboard
- Manage own orders: endpoints ensure `order.userId === locals.user.id`; allow create/update/cancel before shipped.

### Example product endpoint (`src/routes/manager/inventory/+page.server.ts`)
```ts
import { productSchema } from '$lib/validation/schemas';
import { authorize } from '$lib/auth/rbac';

export const actions: Actions = {
  create: async ({ locals, request, getClientAddress }) => {
    authorize(locals.user, ['MANAGER']);
    const form = Object.fromEntries(await request.formData());
    const parsed = productSchema.safeParse(form);
    if (!parsed.success) {
      await logEvent('product-create', 'fail', { reason: 'validation', issues: parsed.error.flatten() }, getClientAddress(), locals.user?.id);
      return fail(400, { message: 'Validation failed' });
    }
    await prisma.product.create({ data: parsed.data });
    await logEvent('product-create', 'success', {}, getClientAddress(), locals.user?.id);
  }
};
```

### Secure error pages
- `src/error.svelte` shows a generic friendly message without stack traces.
- Custom `src/routes/+error.svelte` and `src/routes/+layout.svelte` for 404/500 messaging.

## Phase 4 – Logging & Demo Plan

### Logging utility (`$lib/logging/logger.ts`)
```ts
export async function logEvent(action: string, outcome: 'success' | 'fail', metadata: Record<string, unknown>, ip?: string, userId?: string) {
  return prisma.auditLog.create({ data: { action, outcome, metadata, ip, userId: userId ?? null } });
}
```
- Call on: auth attempts, validation failures, access control failures, CRUD success/fail.

### Admin-only Audit Logs page
- Route `/admin/logs` guarded by RBAC.
- Server load queries `auditLog` with optional filters from URL search params (date range, user, action, outcome).
- Display in a paginated, read-only table with download CSV option.

### Demo script (per checklist)
1. **Authentication required**: attempt to open `/orders` logged out → redirected to `/login` (401 logged).
2. **Registration**: use `/register` with weak password → server rejects (log validation failure); retry with strong password → success.
3. **Login lockout**: fail login 5 times → account locked; wait lockout period then login successfully and see last login status/time on dashboard.
4. **Password history & age**: change password twice within a day → second attempt rejected; attempt reuse of last 3 passwords → rejected.
5. **Re-authentication**: on `/profile/change-password` prompt for current password (re-auth within 5 minutes) before updating.
6. **RBAC**: Role B tries `/admin/logs` → 403; Manager can access inventory but not user-role changes; Admin can view logs and update roles.
7. **CRUD ownership**: Role B tries to edit another user’s order via direct URL → 403 and log entry.
8. **Validation**: submit negative quantity in order → 400 with friendly message; logged.
9. **Logging**: Admin views `/admin/logs` to verify entries for steps above.

## Phase 5 – Security Review Checklist Mapping

| Checklist item | Feature / Module | How to demo |
| --- | --- | --- |
| Auth required except login/register | `+layout.server.ts` auth gate; `hooks.server.ts` session check | Visit `/orders` while logged out → redirected; logs show access-control fail |
| Password hashing | `$lib/auth/password.ts` using Argon2/bcrypt | Inspect code; register and verify hashes in DB |
| Generic login errors | `login/+page.server.ts` | Provide wrong creds → message “Invalid username and/or password” |
| Password complexity (front/back) | `$lib/validation/schemas.ts` + form validation | Try weak password during registration → rejected |
| Password fields masked | Svelte inputs type=password | Inspect forms |
| Account lockout | `login/+page.server.ts` logic | Fail login 5 times → lockout message and log entry |
| Password reset/safer flow | Email-token reset endpoint (future) or security questions with random answers; current design ready for token flow | Trigger forgot-password to receive token (if implemented) |
| Password history + min age | `$lib/auth/password.ts` + `PasswordHistory` table | Attempt reuse or rapid change → rejected |
| Last login info | `User.lastLoginAt/Status` shown on dashboard | Login successfully → dashboard displays last login record |
| Re-authentication | `requireRecentReauth` | Try to change password after 10 minutes → prompted to re-enter password |
| Centralized RBAC | `$lib/auth/rbac.ts`, `hooks.server.ts` | Inspect code; Role B denied admin pages |
| Secure failures | 401/403 responses, generic errors | Manually request forbidden route |
| Business rules (role differences) | `/admin/*`, `/manager/*`, `/orders/*` | Login as each role and exercise dashboards |
| Server-side validation | `$lib/validation/schemas.ts`, endpoints | Submit invalid product/order data → rejected and logged |
| Error handling | `src/error.svelte`, custom +error pages | Trigger 404/500 to see generic messages |
| Logging of auth/validation/access | `$lib/logging/logger.ts`, `AuditLog` table | Check `/admin/logs` for entries |

### Remaining attention points
- Implement email-based password reset with short-lived signed tokens if time permits.
- Ensure production cookie settings (Secure + SameSite=strict + HTTP-only) and HTTPS in deployment.
- Add rate limiting (e.g., per-IP) on auth endpoints for extra safety.

