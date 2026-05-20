# IPAM Platform — Remediation & Upgrade Plan

> **For agents executing this plan:** Read [CLAUDE.md](./CLAUDE.md) first, then [APP-ISSUES.md](./APP-ISSUES.md), then the phase you are assigned. Each "Prompt" block below is a self-contained brief you can paste directly into your operator's chat. Mark `- [ ]` checkboxes as you go.

**Goal:** Take the IPAM platform from "polished demo with broken backing logic" to "trustworthy MVP" by fixing every P0/P1 issue identified in [APP-ISSUES.md](./APP-ISSUES.md), then modernize the UI for production use.

**Architecture:** NestJS microservices behind an api-gateway, PostgreSQL for state, Redis for cache/queues, React 19 + Vite frontend behind NGINX. Stay on this architecture — do not rewrite, fix in place.

**Tech Stack:** NestJS 10, TypeORM (kept as connection pool), PostgreSQL 15, Redis 7, React 19, Vite 8, TailwindCSS 4, Recharts, Docker Compose.

**Working principles (non-negotiable):**
1. **TDD where possible.** Write the failing test first, watch it fail, make it pass, commit.
2. **Small, atomic commits.** One issue per commit. Never bundle "while I was at it" changes.
3. **Verify before claiming done.** Run the actual scenario through `docker compose up` and confirm the bug is gone with a real curl or browser click.
4. **Never break a working flow.** Run the existing happy path after every change. If the dashboard loaded before your fix, it loads after.
5. **Do not add Claude as a git author or co-author.** Commits should appear authored solely by the repo owner. See [CLAUDE.md](./CLAUDE.md).

---

## How to read this document

Each **Phase** is a sequence of **Tasks**. Each Task has:
- **Issue refs** — pointer to [APP-ISSUES.md](./APP-ISSUES.md) sections being closed
- **Files** — exact paths to create/modify
- **Steps** — the action sequence
- **Acceptance** — what the agent must demonstrate before claiming the task is done
- **Prompt** — a copy-pasteable brief for a fresh agent

At the end is the **Phase Sequence** — run them in order. Do not skip Phase 0; later phases assume the schema is fixed.

---

# Phase 0 — Schema & Migrations (BLOCKER)

**Why this is Phase 0:** The backend code references many columns that do not exist in the SQL init files. Until the schema matches the code, half of the create-flows throw "column does not exist" at runtime. Nothing else can be tested until this is fixed.

**Closes:** APP-ISSUES "Schema drift" (the un-numbered P0 from the original overview), BL11 (CIDR type), Performance P1 (indexes).

## Task 0.1 — Inventory the drift

**Files:**
- Read: [apps/ipam-core-service/src/ipam.service.ts](apps/ipam-core-service/src/ipam.service.ts)
- Read: [apps/forecasting-insight-service/src/planning-360.service.ts](apps/forecasting-insight-service/src/planning-360.service.ts)
- Read: [database/init/01-init.sql](database/init/01-init.sql)
- Read: [database/init/02-telecom-models.sql](database/init/02-telecom-models.sql)

**Steps:**
- [ ] **Step 1:** List every column referenced in INSERT/UPDATE/SELECT statements across all services
- [ ] **Step 2:** Diff against actual columns in the two init SQL files
- [ ] **Step 3:** Produce a markdown table in `database/drift-audit.md` with three columns: `table`, `column`, `referenced_by_file:line`
- [ ] **Step 4:** Commit the audit file

**Acceptance:** The audit file lists at least these missing columns (verify each one shows up):
- `subnets.ip_range_type, service_end_if, gateway_end_if, vlan_type, connected_elements, request_date, requester_name, requester_department, spoc`
- `sites.name`
- `network_domains.vrf_name`
- `devices.role, management_ip`
- `vlans.site_id`

**Prompt:**

```
You are fixing a schema-drift bug in an IPAM platform. Read PLAN.md Phase 0 Task 0.1 and follow it exactly. Do not skip steps. Do not start writing migrations yet — your only job is to produce database/drift-audit.md. When done, show me the file contents and stop.
```

## Task 0.2 — Write the migration

**Files:**
- Create: `database/init/03-schema-drift-fix.sql`
- Create: `database/init/04-indexes.sql`

**Steps:**
- [ ] **Step 1:** Write `03-schema-drift-fix.sql` that adds every missing column from the audit. Use `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`.
- [ ] **Step 2:** In the same file, change `ip_blocks.cidr`, `subnets.cidr`, `ip_addresses.ip_address` from `VARCHAR(50)` to `CIDR`/`INET` native types. Wrap in `ALTER ... TYPE ... USING value::cidr`.
- [ ] **Step 3:** Write `04-indexes.sql` with the minimum index set listed below.
- [ ] **Step 4:** Add a top comment to each file documenting WHY each column/index exists, referencing the calling code (e.g. `-- subnets.ip_range_type: referenced by ipam.service.ts:48`).

**Minimum index set for `04-indexes.sql`:**

```sql
CREATE INDEX IF NOT EXISTS idx_subnets_block_id ON subnets(block_id);
CREATE INDEX IF NOT EXISTS idx_subnets_parent_subnet_id ON subnets(parent_subnet_id);
CREATE INDEX IF NOT EXISTS idx_subnets_domain_id ON subnets(domain_id);
CREATE INDEX IF NOT EXISTS idx_ip_addresses_subnet_id ON ip_addresses(subnet_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_ip_in_subnet ON ip_addresses(subnet_id, ip_address) WHERE status = 'ALLOCATED';
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_alloc_requests_status ON allocation_requests(status);
CREATE INDEX IF NOT EXISTS idx_alloc_requests_submitted_by ON allocation_requests(submitted_by);
```

**Acceptance:**
- `docker compose down -v && docker compose up --build` brings up a fresh database with no errors in the Postgres init log
- `psql` query `\d+ subnets` shows every column the audit listed
- `psql` query `\d ip_blocks` shows `cidr` is now of type `cidr`

**Prompt:**

```
You are fixing the IPAM schema drift. Read PLAN.md Phase 0 Task 0.2 and produce two files: database/init/03-schema-drift-fix.sql and database/init/04-indexes.sql. Follow the rules in CLAUDE.md (commit conventions, no Claude co-author). After writing, run "docker compose down -v && docker compose up --build" and confirm no Postgres errors in the logs. Show the final psql \d+ output for subnets and ip_blocks.
```

## Task 0.3 — Make the create-subnet form actually save

**Files:**
- Modify: [apps/ipam-core-service/src/ipam.service.ts](apps/ipam-core-service/src/ipam.service.ts) (already references the new columns, verify it works)
- Run: smoke test through the UI

**Steps:**
- [ ] **Step 1:** With Docker still up from 0.2, open https://localhost
- [ ] **Step 2:** Go to IP Topology → New Block, create `10.0.0.0/8` "Test Block"
- [ ] **Step 3:** Click "Allocate Subnet" and fill in **every** telecom field including the previously-failing ones (IP range type, VLAN type, requester name, etc.)
- [ ] **Step 4:** Submit — it should succeed without a 500 error
- [ ] **Step 5:** Repeat for Add Site, Add Domain, Add VLAN, Add Device
- [ ] **Step 6:** Commit the schema files with message `feat(db): add missing telecom columns + indexes`

**Acceptance:** All 5 create flows succeed end-to-end. Document any that still fail in `database/drift-audit.md` (there shouldn't be any).

**Prompt:**

```
Phase 0 schema fix is complete. Verify it works end-to-end per PLAN.md Phase 0 Task 0.3. Run docker compose up, click through each create form, and report results. If anything still fails, add it to database/drift-audit.md and propose a follow-up migration. Then commit.
```

---

# Phase 1 — Core IPAM Invariants (P0 Correctness)

**Why:** An IPAM that allows overlapping subnets, IPs outside their subnet, or double-allocated addresses is worse than no IPAM. These are the invariants the system exists to protect.

**Closes:** A1 (validation orphan), A2 (no transactions), BL2 (subnet-in-block), BL3 (sibling overlap), BL6 (network/broadcast exclusion).

## Task 1.1 — Validation library as shared package

**Why:** Two services need the same CIDR math. Put it in `packages/shared-validation` and use it everywhere.

**Files:**
- Modify: [packages/shared-validation/index.ts](packages/shared-validation/index.ts)
- Create: `packages/shared-validation/cidr.ts`
- Create: `packages/shared-validation/__tests__/cidr.test.ts`

**Steps:**
- [ ] **Step 1: Write the failing tests**

```ts
// packages/shared-validation/__tests__/cidr.test.ts
import { parseCidr, isSubnetContained, doSubnetsOverlap, isHostAddress } from '../cidr';

describe('parseCidr', () => {
  it('parses 10.0.0.0/24 correctly', () => {
    const r = parseCidr('10.0.0.0/24');
    expect(r.network).toBe(0x0A000000);
    expect(r.broadcast).toBe(0x0A0000FF);
    expect(r.prefix).toBe(24);
  });
  it('rejects garbage', () => {
    expect(() => parseCidr('not-a-cidr')).toThrow();
    expect(() => parseCidr('10.0.0.0/33')).toThrow();
  });
});

describe('isSubnetContained', () => {
  it('returns true for child inside parent', () => {
    expect(isSubnetContained('10.1.0.0/16', '10.0.0.0/8')).toBe(true);
  });
  it('returns false for child outside parent', () => {
    expect(isSubnetContained('8.8.8.0/24', '10.0.0.0/8')).toBe(false);
  });
  it('returns false for child larger than parent', () => {
    expect(isSubnetContained('10.0.0.0/8', '10.0.0.0/16')).toBe(false);
  });
});

describe('doSubnetsOverlap', () => {
  it('detects adjacent /25s as non-overlapping', () => {
    expect(doSubnetsOverlap('10.0.0.0/25', '10.0.0.128/25')).toBe(false);
  });
  it('detects identical ranges as overlapping', () => {
    expect(doSubnetsOverlap('10.0.0.0/24', '10.0.0.0/24')).toBe(true);
  });
  it('detects nested ranges as overlapping', () => {
    expect(doSubnetsOverlap('10.0.0.0/24', '10.0.0.128/25')).toBe(true);
  });
});

describe('isHostAddress', () => {
  it('excludes network address for /24', () => {
    expect(isHostAddress('10.0.0.0', '10.0.0.0/24')).toBe(false);
  });
  it('excludes broadcast address for /24', () => {
    expect(isHostAddress('10.0.0.255', '10.0.0.0/24')).toBe(false);
  });
  it('accepts middle address for /24', () => {
    expect(isHostAddress('10.0.0.5', '10.0.0.0/24')).toBe(true);
  });
  it('accepts both addresses for /31 (point-to-point)', () => {
    expect(isHostAddress('10.0.0.0', '10.0.0.0/31')).toBe(true);
    expect(isHostAddress('10.0.0.1', '10.0.0.0/31')).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests — confirm they fail**

```powershell
npm test --workspace=packages/shared-validation
```

Expected: all 11 tests fail (functions not exported).

- [ ] **Step 3: Implement `packages/shared-validation/cidr.ts`**

```ts
export interface CidrRange {
  network: number;
  broadcast: number;
  prefix: number;
  mask: number;
}

const ipToLong = (ip: string): number => {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    throw new Error(`Invalid IP: ${ip}`);
  }
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
};

export function parseCidr(cidr: string): CidrRange {
  const [ip, prefixStr] = cidr.split('/');
  if (!ip || !prefixStr) throw new Error(`Invalid CIDR: ${cidr}`);
  const prefix = parseInt(prefixStr, 10);
  if (isNaN(prefix) || prefix < 0 || prefix > 32) throw new Error(`Invalid prefix: ${prefixStr}`);
  const ipLong = ipToLong(ip);
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  const network = (ipLong & mask) >>> 0;
  const broadcast = (network | (~mask >>> 0)) >>> 0;
  return { network, broadcast, prefix, mask };
}

export function isSubnetContained(child: string, parent: string): boolean {
  const c = parseCidr(child);
  const p = parseCidr(parent);
  return c.prefix >= p.prefix && c.network >= p.network && c.broadcast <= p.broadcast;
}

export function doSubnetsOverlap(a: string, b: string): boolean {
  const A = parseCidr(a);
  const B = parseCidr(b);
  return !(A.broadcast < B.network || A.network > B.broadcast);
}

export function isHostAddress(ip: string, cidr: string): boolean {
  const range = parseCidr(cidr);
  const ipLong = ipToLong(ip);
  if (ipLong < range.network || ipLong > range.broadcast) return false;
  // /31 and /32 are point-to-point or single-host — every address is usable
  if (range.prefix >= 31) return true;
  // Otherwise exclude network and broadcast
  return ipLong !== range.network && ipLong !== range.broadcast;
}
```

- [ ] **Step 4: Re-export from `packages/shared-validation/index.ts`**

```ts
export * from './cidr';
export const validateCidr = (cidr: string): boolean => {
  try { parseCidr(cidr); return true; } catch { return false; }
};
```

Replace the old regex-based `validateCidr` with this version.

- [ ] **Step 5: Set up Jest in the package**

Create `packages/shared-validation/package.json` scripts: `"test": "jest"`. Add `jest` and `ts-jest` as devDeps. Create `jest.config.js`.

- [ ] **Step 6: Run tests — confirm all 11 pass**

```powershell
npm test --workspace=packages/shared-validation
```

- [ ] **Step 7: Commit**

```powershell
git add packages/shared-validation
git commit -m "feat(validation): shared CIDR library with contained/overlap/host checks"
```

**Prompt:**

```
Phase 1 Task 1.1: extract CIDR math into packages/shared-validation. Follow PLAN.md Task 1.1 verbatim using TDD — write the failing tests first, watch them fail, implement, watch them pass. Do not start the next task. Show me the final test output.
```

## Task 1.2 — Wire validation into ipam-core createSubnet

**Files:**
- Modify: [apps/ipam-core-service/src/ipam.service.ts](apps/ipam-core-service/src/ipam.service.ts) — `createSubnet`
- Modify: [apps/ipam-core-service/package.json](apps/ipam-core-service/package.json) — add `@ipam/shared-validation` dep

**Steps:**
- [ ] **Step 1:** Import `isSubnetContained`, `doSubnetsOverlap`, `parseCidr` from `@ipam/shared-validation`
- [ ] **Step 2:** Before INSERT, fetch the parent block CIDR. Throw `BadRequestException` if the new subnet is not contained in the parent.
- [ ] **Step 3:** Fetch all existing subnets in the same block (and same parent_subnet_id if present). Throw `BadRequestException` if any overlap with the new CIDR.
- [ ] **Step 4:** Update `isIpInSubnet` in `allocateIp` to use `isHostAddress` from the shared lib (fixes BL6).

**Acceptance:**
- Trying to create subnet `8.8.8.0/24` inside block `10.0.0.0/8` returns 400 with message "Subnet 8.8.8.0/24 is not contained in parent block 10.0.0.0/8"
- Trying to create `10.0.0.0/25` after `10.0.0.0/24` exists returns 400 with overlap message
- Trying to allocate `10.0.0.0` (network address) into subnet `10.0.0.0/24` returns 400
- All existing happy-path subnet creates still succeed

**Prompt:**

```
Phase 1 Task 1.2: enforce IPAM invariants in createSubnet and allocateIp. Read PLAN.md Task 1.2. The shared library from Task 1.1 is ready. Wire it in, add the three guard checks listed in the Acceptance section, and verify each rejection case with curl. Commit with message "feat(ipam): enforce subnet containment + overlap + host-address invariants".
```

## Task 1.3 — Transactional IP allocation

**Why:** Two concurrent requests for the same IP must not both succeed. The DB-level unique index from Phase 0 protects us, but we still want an explicit transaction so the duplicate check + insert happen atomically and the error message is clean.

**Files:**
- Modify: [apps/ipam-core-service/src/ipam.service.ts](apps/ipam-core-service/src/ipam.service.ts) — `allocateIp`

**Steps:**
- [ ] **Step 1: Write the failing test**

Create `apps/ipam-core-service/__tests__/concurrent-allocate.spec.ts` that:
1. Boots an in-memory or testcontainer Postgres
2. Creates a subnet
3. Fires 10 concurrent `allocateIp` calls for the same IP
4. Asserts exactly 1 succeeds and 9 fail with `BadRequestException`

- [ ] **Step 2:** Wrap `allocateIp` in `dataSource.transaction(async (em) => { ... })`
- [ ] **Step 3:** Use `SELECT ... FOR UPDATE` on the subnet row to serialize concurrent requests for the same subnet
- [ ] **Step 4:** Run the concurrent test, confirm it passes
- [ ] **Step 5:** Commit

**Prompt:**

```
Phase 1 Task 1.3: make IP allocation race-safe. Read PLAN.md Task 1.3. Write the concurrent test first, watch it fail (you'll see multiple allocations succeed), then add the transaction with SELECT FOR UPDATE, watch it pass. Commit. Do not move on.
```

## Task 1.4 — Decide the fate of validation-engine-service

**Why:** It is orphaned. Either delete it or use it.

**Decision rule:** If the team plans cross-service validation (multiple write paths into the same data — e.g. workflow-service approving requests), keep it and call it from ipam-core. Otherwise, delete it.

**Recommendation:** **Delete it.** The shared library from Task 1.1 already covers every check. A whole HTTP hop for `parseCidr` is pure overhead.

**Files:**
- Delete: [apps/validation-engine-service/](apps/validation-engine-service/)
- Modify: [docker-compose.yml](docker-compose.yml) — remove the `validation-engine-service` service block and the gateway's dependency on it
- Modify: [apps/api-gateway/src/app.module.ts](apps/api-gateway/src/app.module.ts) — remove the `/api/validation` route

**Acceptance:** `docker compose up` succeeds with one fewer container. No code anywhere references `validation-engine-service` or `/api/validation`.

**Prompt:**

```
Phase 1 Task 1.4: delete the orphaned validation-engine-service. Read PLAN.md Task 1.4. Follow the deletion checklist exactly. After `docker compose up`, confirm the gateway logs do not mention validation. Commit with message "chore: remove orphaned validation-engine-service (logic moved to shared-validation in Task 1.1)".
```

---

# Phase 2 — Auth & Identity (P0 Security)

**Why:** Plain-text passwords and no current-user concept means every action is anonymous and every credential is exposed. Fix the foundation.

**Closes:** BL4 (plain text), BL5 (broken token literal), BL13 (submitted_by unvalidated), BL14 (no current user in UI).

## Task 2.1 — Bcrypt password hashing

**Files:**
- Modify: [apps/auth-service/src/auth.service.ts](apps/auth-service/src/auth.service.ts)
- Modify: [database/init/01-init.sql](database/init/01-init.sql) — replace the plain-text seed with a real bcrypt hash
- Create: `apps/auth-service/__tests__/auth.spec.ts`

**Steps:**
- [ ] **Step 1: Failing test**

```ts
it('login rejects wrong password', async () => {
  await expect(service.login('admin@ipam.local', 'wrong')).rejects.toThrow();
});
it('login accepts correct password', async () => {
  const r = await service.login('admin@ipam.local', 'admin123');
  expect(r.token).toBeTruthy();
});
```

- [ ] **Step 2:** Import `bcrypt`, change `login` to compare with `bcrypt.compare(plainPassword, user.password_hash)`
- [ ] **Step 3:** Generate a bcrypt hash for `admin123` (cost 10) and replace the seed row in `01-init.sql`. Example: use `node -e "console.log(require('bcrypt').hashSync('admin123', 10))"`
- [ ] **Step 4:** Add a `register` or `changePassword` method that hashes new passwords. Used in Task 2.4.
- [ ] **Step 5:** `docker compose down -v && docker compose up --build`, run the failing tests, confirm pass.

**Prompt:**

```
Phase 2 Task 2.1: replace plain-text password comparison with bcrypt. Follow PLAN.md Task 2.1 exactly. Wipe the docker volume (-v) before testing because the seed user needs to be re-created with the bcrypt hash. Commit.
```

## Task 2.2 — Real JWT issuance

**Files:**
- Modify: [apps/auth-service/src/auth.service.ts](apps/auth-service/src/auth.service.ts)
- Modify: [apps/auth-service/package.json](apps/auth-service/package.json) — add `jsonwebtoken` and `@nestjs/jwt`
- Create: `packages/shared-auth/jwt.ts`

**Steps:**
- [ ] **Step 1:** Read `JWT_SECRET` from `process.env`. If missing in non-production, generate a stable dev secret. In production, throw on startup.
- [ ] **Step 2:** On successful login, return `{ accessToken: jwt.sign({ sub: user.id, email, roles }, secret, { expiresIn: '8h' }) }`.
- [ ] **Step 3:** Delete the broken base64 token line. Remove the escaped `\${...}` template entirely.
- [ ] **Step 4:** In `packages/shared-auth/jwt.ts`, export `verifyJwt(token)` that returns the decoded payload or throws.

**Acceptance:** Decoding the returned token at jwt.io shows `{ sub: <uuid>, email: "admin@ipam.local", roles: ["ADMIN"], exp: <8 hours from now> }`.

**Prompt:**

```
Phase 2 Task 2.2: replace the broken token with real JWT. Follow PLAN.md Task 2.2. After implementing, login via curl and decode the token at jwt.io — paste the decoded payload into your response so I can verify. Commit.
```

## Task 2.3 — Gateway auth middleware

**Files:**
- Modify: [packages/shared-auth/index.ts](packages/shared-auth/index.ts) — real middleware
- Modify: [apps/api-gateway/src/app.module.ts](apps/api-gateway/src/app.module.ts) — apply middleware

**Steps:**
- [ ] **Step 1:** Replace the placeholder middleware with one that:
  - Reads `Authorization: Bearer <token>` header
  - Calls `verifyJwt` from Task 2.2
  - Attaches the decoded payload to `req.user`
  - Returns 401 if missing or invalid
  - **Exempts** the `/api/auth/login` and `/api/*/health` routes
- [ ] **Step 2:** Apply the middleware to all `/api/*` routes in the gateway

**Acceptance:**
- `curl https://localhost/api/ipam/blocks` without a token returns 401
- `curl -H "Authorization: Bearer <valid>" https://localhost/api/ipam/blocks` returns 200
- `curl https://localhost/api/auth/login -d '{...}'` works without auth

**Prompt:**

```
Phase 2 Task 2.3: lock down the gateway with JWT middleware. Follow PLAN.md Task 2.3. After implementing, demonstrate each of the three curl results listed in Acceptance. Commit.
```

## Task 2.4 — Login page in frontend

**Files:**
- Create: `apps/frontend-portal/src/pages/Login.tsx`
- Create: `apps/frontend-portal/src/hooks/useAuth.ts`
- Modify: [apps/frontend-portal/src/App.tsx](apps/frontend-portal/src/App.tsx) — wrap routes with auth guard, remove hardcoded admin

**Steps:**
- [ ] **Step 1: `useAuth` hook**

Provides `{ user, token, login(email, password), logout() }`. Stores token in `localStorage`. Returns `null` user if no token. On mount, decodes the token (or calls `/api/auth/me` if you add that endpoint) and populates `user`.

- [ ] **Step 2: Login page** — clean dark-glass form matching the app aesthetic. Inputs: email, password. Errors shown inline.

- [ ] **Step 3:** Configure `axios.defaults.headers.common['Authorization']` from `useAuth` so every request includes the token.

- [ ] **Step 4:** In `App.tsx`, if `user === null`, render `<Login />`. Otherwise render the existing layout. Replace the hardcoded `Admin User / admin@ipam.local` block with `{user.email}` and a Logout button.

- [ ] **Step 5:** Update `Approvals.tsx` and any other "submitted_by" or "user_id" field to use `user.userId` from `useAuth`.

**Acceptance:**
- Loading https://localhost shows the login page
- Bad credentials show an error
- Good credentials show the Dashboard
- The sidebar footer shows the logged-in user, not "Admin User"
- Logout returns to the login page

**Prompt:**

```
Phase 2 Task 2.4: build the login page + useAuth hook. Follow PLAN.md Task 2.4. Match the existing dark-glass aesthetic — same colors, same border radii, same animated background orbs. After implementing, walk through each Acceptance bullet in a real browser. Commit.
```

---

# Phase 3 — Workflow & Audit (Broken Business Logic)

**Why:** The Approvals page is a UI for a workflow that doesn't exist. Audit logs are written by almost nothing. These two flaws make the platform untrustworthy for any compliance-sensitive use.

**Closes:** A3 (audit theater), BL1 (approval does nothing), BL10 (hard delete no audit).

## Task 3.1 — Wire audit logging into every mutation

**Files:**
- Modify: all services that mutate state. List:
  - [apps/ipam-core-service/src/ipam.service.ts](apps/ipam-core-service/src/ipam.service.ts)
  - [apps/request-workflow-service/src/workflow.service.ts](apps/request-workflow-service/src/workflow.service.ts)
  - [apps/configuration-service/src/config.service.ts](apps/configuration-service/src/config.service.ts)
  - [apps/auth-service/src/auth.service.ts](apps/auth-service/src/auth.service.ts) (LOGIN_SUCCESS, LOGIN_FAILURE)
- Create: `packages/shared-audit/index.ts` — small helper `logAudit(dataSource, { action, entity, entityId, userId, details })`

**Steps:**
- [ ] **Step 1:** Create the shared helper. It is a single function that inserts into `audit_logs`. It accepts `userId: string | null` and never throws (audit failures should not break mutations — but should `console.error`).

- [ ] **Step 2:** For every mutating method in the services listed above, add a `logAudit` call. The `userId` comes from `req.user.sub` (passed through from gateway middleware). Action codes to use:

```
BLOCK_CREATED, BLOCK_DELETED
SUBNET_CREATED, SUBNET_DELETED
IP_ALLOCATED, IP_RELEASED
DOMAIN_CREATED, VLAN_CREATED, SITE_CREATED, DEVICE_CREATED
REQUEST_SUBMITTED, REQUEST_APPROVED, REQUEST_REJECTED
CONFIG_CHANGED
LOGIN_SUCCESS, LOGIN_FAILURE
```

- [ ] **Step 3:** Update controllers to read `req.user` and pass it to service methods (add an explicit `userId` parameter to every mutating service method — explicit > magic).

**Acceptance:** After creating 1 block + 1 subnet + 1 IP + 1 site + approving 1 request, the AuditLogs page shows 5+ rows with the correct action codes and the logged-in user's ID.

**Prompt:**

```
Phase 3 Task 3.1: wire audit logging into every mutation. Follow PLAN.md Task 3.1 — the full list of mutations and action codes is in the plan. Use the shared-audit helper. After implementing, perform the 5 actions in Acceptance and screenshot the AuditLogs page. Commit.
```

## Task 3.2 — Make approval actually allocate

**Files:**
- Modify: [apps/request-workflow-service/src/workflow.service.ts](apps/request-workflow-service/src/workflow.service.ts)
- Modify: [apps/frontend-portal/src/pages/Approvals.tsx](apps/frontend-portal/src/pages/Approvals.tsx)
- Create: `apps/frontend-portal/src/pages/NewRequest.tsx` — the missing request-creation UI

**Steps:**
- [ ] **Step 1: Request creation UI**

New page at `/requests/new` with form fields: `type` (SUBNET / IP), `requested_cidr`, `block_id` (target parent), optional metadata. Posts to `/api/workflow/requests`. Sidebar gets a "New Request" link.

- [ ] **Step 2: Approve actually creates the resource**

In `approveRequest`, after updating status to APPROVED, inside the same transaction:
- If `request.type === 'SUBNET'`: call `ipamCore.createSubnet` with the requested CIDR, parent block, and metadata from the request
- If `request.type === 'IP'`: call `ipamCore.allocateIp`

How to call ipam-core from workflow-service: **direct database insert with the same shared-validation library**. Do NOT go via HTTP — that adds latency and complicates transactions. The two services share a database; reaching across is fine for a Phase 1 platform. (Microservice purists will object. They are wrong here — the data lives in one place, the boundary is artificial, and the gain in atomicity is huge.)

Both services should re-export `createSubnet` / `allocateIp` from a shared `packages/ipam-mutations` package for DRY-ness. Or, simpler: move the mutation logic into the package and have both services call it.

- [ ] **Step 3:** If the approved allocation fails (overlap, contained-by check, etc.), mark the request `FAILED` with the error in a `failure_reason` column (add via migration `05-request-failure-reason.sql`).

- [ ] **Step 4:** Update the UI: APPROVED requests show a link to the created subnet; FAILED requests show the failure reason.

**Acceptance:**
- Submit a request for `10.5.0.0/24` inside block `10.0.0.0/8`
- Approve it
- Confirm the subnet appears in the Topology view
- Submit a request for `10.5.0.0/24` again
- Approve it
- Confirm the request shows FAILED with "overlap with subnet 10.5.0.0/24"

**Prompt:**

```
Phase 3 Task 3.2: make the approval workflow real. Follow PLAN.md Task 3.2. The key architectural call: workflow-service writes directly to the database using the shared mutation logic, not via HTTP. After implementing, walk through both Acceptance scenarios with screenshots. Commit.
```

## Task 3.3 — Soft delete for blocks and subnets

**Files:**
- Create: `database/init/06-soft-delete.sql` — add `deleted_at TIMESTAMPTZ NULL` to `ip_blocks` and `subnets`
- Modify: [apps/ipam-core-service/src/ipam.service.ts](apps/ipam-core-service/src/ipam.service.ts) — `deleteBlock`/`deleteSubnet` now UPDATE deleted_at instead of DELETE. All SELECTs add `WHERE deleted_at IS NULL`.

**Acceptance:** Deleting a block hides it from the topology but its row remains in the database with a populated `deleted_at`. An audit log entry records who deleted it and when.

**Prompt:**

```
Phase 3 Task 3.3: convert hard deletes to soft deletes. Follow PLAN.md Task 3.3. Update every SELECT in ipam.service.ts to filter `deleted_at IS NULL`. After implementing, delete a block, verify it disappears from UI, then SELECT it directly in psql and confirm the row + deleted_at are present. Commit.
```

---

# Phase 4 — Real Metrics & Config (Stop Lying to Users)

**Why:** The dashboard shows a constant 45% utilization. The "high utilization" threshold in Config is ignored. Risk detection uses `> 5 IPs` as the threshold. The "Forecast" chart has no forecasting. Every KPI on the dashboard is theater. Fix.

**Closes:** BL7 (config thresholds), BL8 (constant 45), BL9 (no forecast), BL15 (>5 IPs risk).

## Task 4.1 — Real overall utilization

**Files:**
- Modify: [apps/forecasting-insight-service/src/insight.service.ts](apps/forecasting-insight-service/src/insight.service.ts) — `getDashboardMetrics`

**Steps:**
- [ ] **Step 1:** Replace the `45` constant with: sum of allocated IP count across all subnets, divided by sum of capacity across all subnets (compute capacity from each subnet's CIDR mask using shared-validation), times 100, rounded to 1 decimal.

```ts
// Pseudocode
const subnets = await dataSource.query(`SELECT id, cidr FROM subnets WHERE deleted_at IS NULL`);
let totalCapacity = 0;
let totalAllocated = 0;
for (const s of subnets) {
  const { prefix } = parseCidr(s.cidr);
  if (prefix > 30) continue; // skip /31, /32
  totalCapacity += Math.pow(2, 32 - prefix) - 2; // exclude network + broadcast
}
const allocRows = await dataSource.query(`SELECT COUNT(*) FROM ip_addresses WHERE status = 'ALLOCATED'`);
totalAllocated = parseInt(allocRows[0].count);
const overallUtilizationPercent = totalCapacity > 0
  ? Number(((totalAllocated / totalCapacity) * 100).toFixed(1))
  : 0;
```

- [ ] **Step 2: Test it**

After creating block `10.0.0.0/24` (254 hosts) and allocating 1 IP, the utilization should be `0.4%`, not `45%`.

**Prompt:**

```
Phase 4 Task 4.1: replace the constant-45 lie with real utilization math. Follow PLAN.md Task 4.1. Verify by allocating 1 IP into a /24 and confirming the dashboard shows 0.4%. Commit.
```

## Task 4.2 — Read thresholds from config

**Files:**
- Create: `packages/shared-config/runtime.ts` — `getConfig(key, defaultValue)` that reads from the configurations table with a 60-second in-memory cache
- Modify: [apps/forecasting-insight-service/src/insight.service.ts](apps/forecasting-insight-service/src/insight.service.ts) — use `getConfig('high_util', 80)` instead of hardcoded `0.8`

**Steps:**
- [ ] **Step 1:** Build the runtime config helper with a TTL cache (use a simple `Map<key, {value, expiresAt}>`)
- [ ] **Step 2:** Replace every hardcoded threshold with a `getConfig` call. Specifically the `0.8` in `planning-360.service.ts:111` and the `> 5` in `insight.service.ts:49`.
- [ ] **Step 3:** Add the threshold names to `Config.tsx` UI: `risk_pool_min_allocations` (default 5), `exhaustion_warning_pct` (default 80).

**Acceptance:** Setting `high_util` to 50 in Config and reloading the Dashboard shows risk subnets at the 50% mark, not 80%.

**Prompt:**

```
Phase 4 Task 4.2: actually read the configured thresholds. Follow PLAN.md Task 4.2. After implementing, change the threshold in the Config UI and verify the Dashboard's risk list updates. Commit.
```

## Task 4.3 — Real per-capacity risk detection

**Files:**
- Modify: [apps/forecasting-insight-service/src/insight.service.ts](apps/forecasting-insight-service/src/insight.service.ts) — `getRiskPools`

**Steps:**
- [ ] **Step 1:** Compute utilization per subnet in SQL (using shared-validation for capacity from CIDR — but doing this in pure SQL requires `host()` and `masklen()` which Postgres has natively for CIDR columns — easy now that Phase 0 migrated to native CIDR types):

```sql
SELECT s.id, s.name, s.cidr,
       COUNT(i.id) AS allocated,
       (2 ^ (32 - masklen(s.cidr)) - 2)::int AS capacity,
       ROUND(100.0 * COUNT(i.id) / NULLIF((2 ^ (32 - masklen(s.cidr)) - 2), 0), 1) AS utilization_pct
FROM subnets s
LEFT JOIN ip_addresses i ON i.subnet_id = s.id AND i.status = 'ALLOCATED'
WHERE s.deleted_at IS NULL AND masklen(s.cidr) < 31
GROUP BY s.id
HAVING ROUND(100.0 * COUNT(i.id) / NULLIF((2 ^ (32 - masklen(s.cidr)) - 2), 0), 1) >= $1
ORDER BY utilization_pct DESC
LIMIT 50;
```

The `$1` parameter is the threshold from `getConfig('exhaustion_warning_pct', 80)`.

**Acceptance:** Only subnets at-or-above the configured utilization percentage appear in the risk list.

**Prompt:**

```
Phase 4 Task 4.3: capacity-based risk detection. Follow PLAN.md Task 4.3. After implementing, create a /29 (6 hosts) and allocate 5 IPs — it should appear at 83% utilization. Commit.
```

## Task 4.5 — Fix the double-stringified org_structure (BL12)

**Files:**
- Modify: [apps/configuration-service/src/config.service.ts](apps/configuration-service/src/config.service.ts) — `setConfig`
- Modify: [apps/frontend-portal/src/pages/Subnets.tsx](apps/frontend-portal/src/pages/Subnets.tsx) — remove the 3-pass `JSON.parse` workaround
- Modify: [apps/frontend-portal/src/pages/Config.tsx](apps/frontend-portal/src/pages/Config.tsx) — remove the 3-pass `JSON.parse` workaround

**Steps:**
- [ ] **Step 1:** In `config.service.ts`, remove the `JSON.stringify(value)` before insert. Pass the raw value to the parameterized query — the `pg` driver handles JSONB serialization automatically when the column is JSONB.
- [ ] **Step 2:** Write a migration `database/init/07-config-cleanup.sql` that fixes any existing double-encoded rows: `UPDATE configurations SET value = (value #>> '{}')::jsonb WHERE jsonb_typeof(value) = 'string';`
- [ ] **Step 3:** Remove the `for (let i = 0; i < 3 && typeof parsed === 'string'; i++)` loops in `Subnets.tsx` and `Config.tsx`. Trust the API to return parsed JSON.

**Acceptance:**
- Save the org structure in Config UI
- `SELECT value FROM configurations WHERE key = 'org_structure'` returns a JSONB array, not a string-wrapped JSONB array
- `Subnets.tsx` page loads it without any `JSON.parse` calls

**Prompt:**

```
Phase 4 Task 4.5: kill the triple-JSON-parse workaround. Follow PLAN.md Task 4.5. Verify by saving the org structure and inspecting the configurations row in psql. Commit.
```

---

## Task 4.4 — Honest naming: rename "forecast" → "trend"

The service does not forecast and should not pretend to. Two options:

**Option A (recommended, low effort):** Rename the chart on the Dashboard from "Allocation Forecast & Trend" to "Allocation Trend (Last 12 Months)". Rename the AI Recommendation strings in `planning-360.service.ts` to something neutral like "Recommendation:" and have them be data-driven (`if (utilization > 90) return 'Expand pool: only ${capacity - allocated} addresses remain.'`).

**Option B (high effort):** Actually add forecasting. Use a simple linear regression over the last 6 months of allocation counts to project the next 3. Display projected vs actual as two lines.

Pick A unless the team specifically wants forecasting.

**Prompt:**

```
Phase 4 Task 4.4: honest naming. Read PLAN.md Task 4.4. Pick Option A unless I (the user) tell you otherwise. Update the labels on Dashboard.tsx and the recommendation strings in planning-360.service.ts. Commit.
```

---

# Phase 5 — Defensive Hardening

**Why:** Production deployments fail in predictable ways: no rate limit, no security headers, leaking unbounded queries, random ports, single-tenant code. Close each one.

**Closes:** BL16 (helmet/cors), BL17 (random port), A6 (gateway hardcoded ports), A7 (multi-tenant), Performance P2 (pagination).

## Task 5.1 — Helmet + CORS on every service

**Files:** every `main.ts` in `apps/*-service/` and `apps/api-gateway/src/main.ts`

**Steps:**
- [ ] Add `app.use(helmet())` and `app.enableCors({ origin: process.env.CORS_ORIGIN || true, credentials: true })` to each `main.ts`. Configure CORS origin in docker-compose env to be `https://localhost`.

**Prompt:**

```
Phase 5 Task 5.1: helmet + CORS. Apply to every service main.ts. Commit.
```

## Task 5.2 — Remove the random port fallback

**Files:** every `main.ts`

**Steps:**
- [ ] Replace `process.env.PORT || Math.floor(Math.random() * 1000 + 3000)` with `Number(process.env.PORT) || (() => { throw new Error('PORT env var required'); })()`. Crashes fast on misconfiguration instead of silently colliding.

**Prompt:**

```
Phase 5 Task 5.2: fail-fast on missing PORT. Follow PLAN.md Task 5.2. Commit.
```

## Task 5.3 — Gateway routes from environment

**Files:** [apps/api-gateway/src/app.module.ts](apps/api-gateway/src/app.module.ts)

**Steps:**
- [ ] Replace the hardcoded service URL map with a function that reads `AUTH_SERVICE_URL`, `IPAM_CORE_SERVICE_URL`, etc. from env. Set defaults in docker-compose.yml.

**Prompt:**

```
Phase 5 Task 5.3: gateway routes from env. Commit.
```

## Task 5.4 — Pagination on list endpoints

**Files:** every controller with a `Get('blocks')`/`Get('subnets')`/etc. method.

**Steps:**
- [ ] Add `?page=1&pageSize=50` query params. Return `{ items: [...], total: N, page, pageSize }`.
- [ ] Update each frontend page that consumes a list to use the new shape and add a paginator (or infinite scroll on Topology).

**Prompt:**

```
Phase 5 Task 5.4: pagination. Standardize on { items, total, page, pageSize } envelope. Update every list endpoint and every consumer. Commit one endpoint + consumer at a time so each commit is small.
```

## Task 5.5 — Multi-tenant filtering via owner_id

**Files:** every SELECT in ipam-core.

**Steps:**
- [ ] On every list endpoint, filter by `owner_id = req.user.sub` UNLESS the user has the ADMIN role.
- [ ] On every create endpoint, set `owner_id = req.user.sub`.
- [ ] Add a `role IN ('ADMIN', 'USER')` check helper.

**Prompt:**

```
Phase 5 Task 5.5: owner-scoped data access. Read PLAN.md Task 5.5 and apply to every read/write in ipam-core. ADMIN role sees all; USER role sees their own. Commit.
```

## Task 5.6 — Rate limiting on auth

**Files:** [apps/auth-service/src/main.ts](apps/auth-service/src/main.ts)

**Steps:**
- [ ] Add `@nestjs/throttler` with 5 attempts per minute per IP on `/auth/login`. Returns 429 when exceeded.

**Prompt:**

```
Phase 5 Task 5.6: rate-limit login. Commit.
```

---

# Phase 6 — UI Modernization

**Why:** The user explicitly asked. The current UI is visually polished but has friction: oversized native scrollbars, no smooth transitions, no skeleton loaders, no route-based code splitting. This phase makes the experience match the aesthetic.

**Files affected:** mostly [apps/frontend-portal/src/](apps/frontend-portal/src/)

## Task 6.1 — Custom scrollbars

**Files:**
- Modify: [apps/frontend-portal/src/index.css](apps/frontend-portal/src/index.css)

**Steps:**
- [ ] Add custom scrollbar styles (Webkit + Firefox):

```css
/* Thin, themed scrollbars across the app */
* {
  scrollbar-width: thin;
  scrollbar-color: rgba(99, 102, 241, 0.3) transparent;
}
*::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
*::-webkit-scrollbar-track {
  background: transparent;
}
*::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, rgba(99, 102, 241, 0.4), rgba(168, 85, 247, 0.4));
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}
*::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(180deg, rgba(99, 102, 241, 0.6), rgba(168, 85, 247, 0.6));
}
*::-webkit-scrollbar-corner {
  background: transparent;
}

/* Smooth scrolling everywhere */
html { scroll-behavior: smooth; }
```

- [ ] Remove any conflicting `overflow-y: scroll` that forces always-visible scrollbars. Use `overflow-y: auto` so scrollbars only appear when needed.

**Acceptance:** Every scrollable area in the app shows the thin gradient scrollbar instead of the chunky native one. Native browser zoom doesn't disturb the layout.

**Prompt:**

```
Phase 6 Task 6.1: replace native scrollbars with thin gradient ones. Follow PLAN.md Task 6.1. After applying, open every page (Dashboard, Topology, Approvals, Audit, Config, Planning360) and confirm consistent styling. Screenshot one page before/after for the commit description. Commit.
```

## Task 6.2 — Sidebar polish

**Files:**
- Modify: [apps/frontend-portal/src/App.tsx](apps/frontend-portal/src/App.tsx)

**Steps:**
- [ ] **Collapsible sidebar:** Add a toggle button. When collapsed, show only icons (64px wide). When expanded, full nav (288px). Persist preference in localStorage.
- [ ] **Active route indicator:** Animated left-edge accent (4px wide, indigo→purple gradient) on the active nav item.
- [ ] **Group nav items by category:** "Management" (Dashboard, Telecom Resources, IP Topology), "Operations" (Subnet Discovery, Approvals, Planning 360), "Admin" (Audit Log, Configuration). Each group has a small uppercase label.
- [ ] **Hover preview when collapsed:** Tooltip on hover shows the nav label.
- [ ] **User menu dropdown:** Replace the static "Admin User" card with a clickable user button that opens a dropdown with: Profile, Settings, Logout.
- [ ] **Better mobile responsiveness:** Below 768px width, sidebar collapses to an overlay drawer triggered by a hamburger button in the header.

**Acceptance:** Sidebar can be collapsed/expanded, active route is visually obvious, groups are visually separated, user menu works.

**Prompt:**

```
Phase 6 Task 6.2: modernize the sidebar. Follow PLAN.md Task 6.2 — all 6 bullets. Match the existing dark-glass aesthetic. Use Lucide icons (already a dep). Commit as one or several small commits, your call.
```

## Task 6.3 — Page transitions

**Files:**
- Modify: [apps/frontend-portal/src/App.tsx](apps/frontend-portal/src/App.tsx)
- Install: `framer-motion` (or use Tailwind's built-in transition classes if preferred)

**Steps:**
- [ ] Wrap the `<Routes>` outlet in a transition that fades + slides each page in (200ms). The existing `animate-in fade-in slide-in-from-bottom-4` classes hint at the intent — make it consistent across every route.
- [ ] Add a `<Suspense>` boundary with a polished skeleton loader for code-split routes (Task 6.5).

**Prompt:**

```
Phase 6 Task 6.3: smooth page transitions. Follow PLAN.md Task 6.3. Pick framer-motion or pure Tailwind — your call. Commit.
```

## Task 6.4 — Skeleton loaders + empty states

**Files:**
- Create: `apps/frontend-portal/src/components/Skeleton.tsx` — primitives (`<SkeletonText />`, `<SkeletonCard />`, `<SkeletonTable />`)
- Modify: every page that currently shows "Loading..." text

**Steps:**
- [ ] Replace every `<div>Loading...</div>` with a shaped skeleton (e.g., on Dashboard, four card-shaped skeletons + a chart-shaped one).
- [ ] On empty states (no blocks, no requests, no logs), replace the existing terse text with a centered illustration + headline + CTA. Example:

```tsx
<div className="flex flex-col items-center justify-center py-16 text-center">
  <Network className="w-16 h-16 text-slate-700 mb-4" />
  <h3 className="text-lg font-semibold text-slate-300">No root blocks yet</h3>
  <p className="text-sm text-slate-500 mt-1 max-w-sm">
    Start by defining the IP space you own. A root block like 10.0.0.0/8 anchors
    your entire allocation tree.
  </p>
  <button onClick={() => setShowBlockModal(true)} className="mt-4 ...">
    Create Your First Block
  </button>
</div>
```

**Prompt:**

```
Phase 6 Task 6.4: skeletons + empty states. Follow PLAN.md Task 6.4. Apply to every page. Commit.
```

## Task 6.5 — Route-based code splitting

**Files:**
- Modify: [apps/frontend-portal/src/App.tsx](apps/frontend-portal/src/App.tsx) — `import Dashboard from './pages/Dashboard'` → `const Dashboard = lazy(() => import('./pages/Dashboard'))`
- Modify: [apps/frontend-portal/vite.config.ts](apps/frontend-portal/vite.config.ts) — set `build.rollupOptions.output.manualChunks` to split `recharts` and `lucide-react` into separate chunks

**Acceptance:** Initial JS payload at https://localhost on the Login page is < 100 KB gzipped (down from ~400 KB). Use `vite build && ls -lh dist/assets` to verify.

**Prompt:**

```
Phase 6 Task 6.5: code splitting. Follow PLAN.md Task 6.5. Report the dist/assets sizes before and after. Commit.
```

## Task 6.6 — Topology UX upgrade

**Files:** [apps/frontend-portal/src/pages/Subnets.tsx](apps/frontend-portal/src/pages/Subnets.tsx)

**Steps:**
- [ ] **Search actually works:** Wire the existing search input to filter blocks and subnets by name/CIDR.
- [ ] **Expand/collapse tree nodes:** Each block and parent subnet gets a chevron. Persist expand state in URL query so deep links work.
- [ ] **IP allocation count badge:** Each subnet row shows `12 / 254 (4.7%)` of capacity used. Color-codes red/yellow/green by threshold.
- [ ] **Inline IP release:** Each allocated IP in the 360 view gets a "Release" button that calls `PUT /api/ipam/ips/:id/release` and refreshes.

**Prompt:**

```
Phase 6 Task 6.6: topology UX upgrades. Follow PLAN.md Task 6.6 — all 4 bullets. Commit each bullet separately.
```

## Task 6.7 — Visual topology graph (stretch goal)

**Files:** Create `apps/frontend-portal/src/pages/TopologyGraph.tsx`

**Steps:**
- [ ] Add a "Graph View" tab next to "Tree View" on the Topology page. Use a force-directed layout (e.g. `react-flow` or `cytoscape`) showing blocks as large nodes, subnets as children, color-coded by utilization. Click a node → open 360 view.

This is a **stretch goal** — only do it if Phase 6 Tasks 6.1-6.6 are complete.

**Prompt:**

```
Phase 6 Task 6.7 (stretch): visual topology graph. Read PLAN.md Task 6.7. Use react-flow. Commit only after the basic feature is working in a browser.
```

---

# Phase 7 — Testing Foundation

**Why:** Zero tests means every fix risks regressing the others. Lock in the gains from Phases 0-6 with a test suite that gates future changes.

**Closes:** Test review section.

## Task 7.1 — Jest in every backend workspace

**Files:** Each `apps/*-service/package.json` and `apps/*-service/jest.config.js`

**Steps:**
- [ ] Add `jest`, `ts-jest`, `@types/jest`, `supertest`, `@nestjs/testing` as devDeps to each backend service.
- [ ] Create `jest.config.js` in each. Tests live in `__tests__/` next to source.
- [ ] Add `"test": "jest"` and `"test:watch": "jest --watch"` scripts.

## Task 7.2 — Unit tests for the IPAM invariants

**Files:** `apps/ipam-core-service/__tests__/ipam.service.spec.ts`

Cover at minimum:
- `createSubnet` rejects out-of-block CIDR (BL2)
- `createSubnet` rejects overlap with sibling (BL3)
- `allocateIp` rejects out-of-subnet IP
- `allocateIp` rejects network address for /24 (BL6)
- `allocateIp` rejects broadcast address for /24 (BL6)
- `allocateIp` accepts both addresses for /31 (BL6)
- 10 concurrent `allocateIp` for same address → exactly 1 wins (A2)

## Task 7.3 — Integration tests with testcontainers

**Files:** `apps/ipam-core-service/__tests__/integration/`

Use [testcontainers](https://node.testcontainers.org/) to spin up a real Postgres for integration tests. Run the init SQL files against it. Test through the controller layer (with supertest).

## Task 7.4 — Frontend tests with Vitest

**Files:** `apps/frontend-portal/vitest.config.ts`, `apps/frontend-portal/src/**/*.test.tsx`

Cover at minimum:
- `useAuth` hook stores and retrieves the token correctly
- `Discovery` calculator returns correct ranges for /8, /24, /30, /31, /32
- `Subnets` page renders the tree structure correctly for nested subnets

## Task 7.5 — CI

**Files:** `.github/workflows/test.yml` (or whatever CI the team uses)

Run all workspaces' tests on push. Block merges with failing tests.

**Prompt for Phase 7 as a whole:**

```
Phase 7: set up the test foundation. Read PLAN.md Phase 7 — Tasks 7.1 through 7.5. Do them in order. Each task is its own commit. Show me a passing test run before claiming done.
```

---

# Phase Sequence (the order to run them)

Run phases strictly in order. Within a phase, run tasks strictly in order unless explicitly marked parallel-safe.

```
Phase 0 — Schema & Indexes              [BLOCKER — must run first]
   ├── 0.1 Inventory the drift
   ├── 0.2 Write the migrations
   └── 0.3 Verify create flows work
                |
                v
Phase 1 — Core IPAM Invariants          [P0 correctness]
   ├── 1.1 Shared validation library (TDD)
   ├── 1.2 Wire validation into createSubnet + allocateIp
   ├── 1.3 Transactional allocation (SELECT FOR UPDATE)
   └── 1.4 Delete or use validation-engine-service
                |
                v
Phase 2 — Auth & Identity               [P0 security]
   ├── 2.1 Bcrypt password hashing
   ├── 2.2 Real JWT issuance
   ├── 2.3 Gateway auth middleware
   └── 2.4 Login page + useAuth hook
                |
                v
Phase 3 — Workflow & Audit              [Broken business logic]
   ├── 3.1 Wire audit logging into every mutation
   ├── 3.2 Approval actually allocates
   └── 3.3 Soft delete for blocks/subnets
                |
                v
Phase 4 — Real Metrics & Config         [Stop lying to users]
   ├── 4.1 Real overall utilization
   ├── 4.2 Read thresholds from config
   ├── 4.3 Per-capacity risk detection
   ├── 4.4 Honest naming (trend, not forecast)
   └── 4.5 Fix double-stringified org_structure
                |
                v
Phase 5 — Defensive Hardening           [Production readiness]
   ├── 5.1 Helmet + CORS
   ├── 5.2 Fail-fast on missing PORT
   ├── 5.3 Gateway routes from env
   ├── 5.4 Pagination
   ├── 5.5 Multi-tenant filtering
   └── 5.6 Rate-limit login
                |
                v
Phase 6 — UI Modernization              [The user's specific ask]
   ├── 6.1 Custom scrollbars
   ├── 6.2 Sidebar polish
   ├── 6.3 Page transitions
   ├── 6.4 Skeleton loaders + empty states
   ├── 6.5 Route-based code splitting
   ├── 6.6 Topology UX upgrade
   └── 6.7 Visual topology graph (stretch)
                |
                v
Phase 7 — Testing Foundation            [Lock in the gains]
   ├── 7.1 Jest in every workspace
   ├── 7.2 Unit tests for IPAM invariants
   ├── 7.3 Integration tests with testcontainers
   ├── 7.4 Frontend tests with Vitest
   └── 7.5 CI pipeline
```

## Estimated effort (CC-assisted)

| Phase | Human time | CC time |
|---|---|---|
| 0 — Schema | half a day | 20 min |
| 1 — Invariants | 1 day | 40 min |
| 2 — Auth | 1.5 days | 1 hour |
| 3 — Workflow & Audit | 1 day | 40 min |
| 4 — Metrics | half a day | 20 min |
| 5 — Hardening | 1 day | 40 min |
| 6 — UI | 2 days | 1.5 hours |
| 7 — Tests | 1.5 days | 1 hour |
| **Total** | **~9 days** | **~6 hours** |

At the end of Phase 7 you have a real product instead of a real demo.

---

## After Phase 7

Maintenance and follow-ups to consider, in no particular order:
- IPv6 support (current CIDR math is IPv4-only)
- Bulk import (CSV → blocks/subnets)
- Email/Slack notifications on approval events
- Scheduled reports (cron → Redis queue → export → email)
- Real forecasting (Option B from Task 4.4)
- Role-based access control beyond ADMIN/USER (network engineer, viewer, etc.)
- Audit log retention policy + archival to object storage
- Observability: structured logging, OpenTelemetry, request IDs across services
