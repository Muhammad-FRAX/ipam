Engineering Review — IPAM Platform
I'll use a confidence rating (X/10) on each finding. 9-10 = verified in code right now. 7-8 = high confidence pattern match. Severity is P0 (system-breaking / data-corrupting), P1 (major bug or risk), P2 (smell / debt).

1. Architecture review
   🔴 A1. The validation microservice is dead code (P1, 10/10)
   validation-engine-service has three perfectly good methods — validateCidr, validateOverlap, validateDuplicateIp — that use PostgreSQL's native CIDR operators. Nothing calls them. I grepped the entire codebase: zero references outside the service itself.

Meanwhile, ipam-core-service does its own bit-shifting CIDR math inline, and the create-subnet path has no overlap check at all. You have two implementations of validation, one in use and broken, one correct and unused. A whole container running for nothing.

Why this is architectural, not a bug: the system was designed for cross-service validation, but the wiring was never built. Either delete validation-engine, or make ipam-core call it before every insert.

🔴 A2. Zero transactions (P0, 10/10)
I grepped for BEGIN/COMMIT/queryRunner/transaction — zero hits. Every multi-step operation is a race condition waiting to happen.

Example: ipam.service.ts:125-156 allocateIp does:

SELECT subnet CIDR
SELECT existing allocations to check duplicate
INSERT new allocation
Two simultaneous requests for the same IP both pass step 2, then both succeed at step 3. You can double-allocate the same IP. For an IPAM, this is the core invariant the system exists to protect.

🔴 A3. Audit logging is theater (P1, 10/10)
The audit microservice exposes recordAction(). No service calls it. Only export.service.ts:37-40 writes to audit_logs, and even there user_id is hard-coded to null.

So your "immutable audit trail" UI (AuditLogs.tsx) shows only export events, by no one. Block creation, subnet allocation, IP assignment, deletion, approvals — none of it is logged. For a tool used for compliance/RCA, this is the second-worst possible failure mode (after "system lies"). It is "system silently doesn't record."

🟡 A4. TypeORM included, used as a connection pool (P2, 9/10)
Every service imports typeorm and @nestjs/typeorm, then does 100% raw SQL via dataSource.query(). No entities, no migrations, no repositories. You're paying ~50 MB of dependencies + boot time for what pg (already a dependency) gives you natively. Either commit to TypeORM (entities, migrations, query builder) or rip it out for pg.Pool.

🟡 A5. Redis container with zero callers (P2, 10/10)
Already flagged in the prior overview. Container runs, port is exposed, no code touches it. Either wire it to something (cache the dashboard query, queue exports, session store for the future auth) or remove it from docker-compose.

🟡 A6. The api-gateway hardcodes target ports (P2, 9/10)
api-gateway/src/app.module.ts:13-19 lists http://auth-service:3001/auth etc. as string literals. If any downstream service changes port, breaks. Should read from env or a shared config map.

🟡 A7. No service is multi-tenant aware (P2, 8/10)
Schema has owner_id on ip_blocks and subnets. No service filters by it. Every user sees every block/subnet/IP. If this product is meant for multi-team telco use (which the "requester / SPOC / division" fields imply), you need row-level filtering. Today it's a single-tenant system pretending to be multi-tenant.

2. Code quality + business logic bugs
   This is the meat. These are the bugs that will bite you in production. I have ranked them.

🔴 BL1. The approval workflow does literally nothing (P0, 10/10)
workflow.service.ts:24-35:

async approveRequest(id: string) {
// ... loads request ...
const result = await this.dataSource.query(
`UPDATE allocation_requests SET status = 'APPROVED' WHERE id = $1 RETURNING *`,
[id]
);
return result[0];
}
Approving a request only changes its status string. It does not create the subnet. It does not allocate the IP. It does not even notify anyone. A user requests 10.5.0.0/24 → manager clicks Approve → status changes to APPROVED → nothing else happens. The user still has no subnet.

This is the most important business-logic bug in the entire codebase. The Approvals page is a UI for a workflow that doesn't exist.

🔴 BL2. No "subnet contained in parent block" check (P0, 10/10)
ipam.service.ts:29-61 createSubnet inserts whatever CIDR you give it under whatever block_id you give it. No validation that the subnet falls inside the block's CIDR range. You can create subnet 8.8.8.0/24 inside block 10.0.0.0/8 and the database will happily store it.

The Discovery page does this check client-side (Discovery.tsx:64-93), but the create-subnet endpoint does not. Anyone calling the API directly, or bypassing the UI, breaks the topology.

🔴 BL3. No "subnet doesn't overlap a sibling" check (P0, 10/10)
Same code path. You can create 10.0.0.0/24 and 10.0.0.128/25 in the same block. The data structure assumes a tree, but nothing enforces tree-ness on insert. Two subnets can claim the same IP space. Then allocateIp doesn't know which subnet "owns" the IP, and the same IP can be assigned to two different "subnets" with two different sets of metadata.

🔴 BL4. Plain-text password "hashing" (P0, 10/10)
01-init.sql:76: seed user has password_hash = 'admin123' — that's the literal password, base64 not even applied.

auth.service.ts:19-22: login compares password_hash columns to the value the client sends as passwordHash. So the client is responsible for "hashing"… which it isn't. Frontend doesn't have a login page anyway, so the comparison is literally string-vs-string on the raw password.

bcrypt is in package.json. It is never imported.

🔴 BL5. The token in auth.service is a broken template literal (P0, 10/10)
auth.service.ts:38:

token: Buffer.from(`\${user.email}:\${user.id}`).toString('base64')
Note the escaped \${...}. JavaScript treats \${ inside a template literal as the literal characters ${, not as interpolation. So every token is base64("${user.email}:${user.id}") — the literal string, identical for every user. The token has zero information content. (Cosmetic since nothing uses the token anyway, but it's the kind of bug that proves the auth code was never tested.)

🔴 BL6. IP-in-subnet allows network and broadcast addresses (P1, 9/10)
ipam.service.ts:164-177 isIpInSubnet uses ipLong >= networkLong && ipLong <= broadcastLong. The comment says "excluding network and broadcast for /31+" but the code doesn't actually exclude them. You can assign 10.0.0.0 and 10.0.0.255 (network and broadcast for 10.0.0.0/24) as if they were hosts. A real device with that IP won't route.

🔴 BL7. Configured risk thresholds are ignored (P1, 10/10)
Config.tsx:44-45 saves high_util and max_ips to the configuration table. I grepped the backend: high_util and max_ips are read by zero services. The forecasting service uses a hardcoded 0.8 threshold (planning-360.service.ts:111) and the getRiskPools query uses a hardcoded > 5 allocations as "risk" (insight.service.ts:49). So the user can set the threshold to anything; the system does not care.

🔴 BL8. Dashboard utilization is a constant (P1, 10/10)
insight.service.ts:37:

overallUtilizationPercent: allocatedIps[0].count > 0 ? 45 : 0,
The headline KPI on the dashboard returns the literal number 45 the moment any IP exists, and 0 otherwise. There is no calculation. The "Utilization %" tile is a lie.

🔴 BL9. "Forecasting" service does not forecast (P1, 10/10)
Despite the name, forecasting-insight-service has no time-series forecasting, no regression, no ARIMA, no model of any kind. The "Allocation Forecast & Trend" chart on the Dashboard (Dashboard.tsx:59) charts the count of subnets created per calendar month — that's not a forecast, that's a historical bar chart with the X-axis truncated to month names (so December 2025 and December 2026 collapse into the same bucket).

The "AI Recommendation" text (planning-360.service.ts:41) is two hardcoded strings chosen by an if/else. No AI, no recommendation. Renaming this service to metrics-service would be honest.

🟠 BL10. Hard deletes, no soft delete, no audit (P1, 9/10)
deleteBlock and deleteSubnet use raw DELETE with FK cascade. So deleting a single root block silently deletes every subnet and every IP allocation under it. No audit log entry, no archive, no confirmation that nested IPs were freed. The UI shows a window.confirm() — that's the only safeguard between you and losing your entire allocation history.

🟠 BL11. CIDR stored as VARCHAR(50), validated as CIDR (P1, 9/10)
Schema stores CIDRs as VARCHAR(50). The validation service casts to CIDR for overlap queries: CAST(cidr AS CIDR) && CAST($1 AS CIDR). So invalid CIDR strings can be inserted (because VARCHAR validates nothing), then break validation queries downstream with a runtime cast error. Either use the native CIDR column type (preferred — Postgres ships with it) and remove the JS validation, or validate at the API boundary on every insert.

🟠 BL12. org_structure stored as nested JSON-string (P1, 9/10)
Subnets.tsx:70-77 and Config.tsx:22-31 both do up to 3 rounds of JSON.parse to unwrap the org structure. This is a flashing red sign: the value is being JSON-stringified more than once before storage.

The cause: config.service.ts:14-30 does JSON.stringify(value) before insert into a column that's already JSONB. The driver then stringifies again on round-trip. Either store as JSONB and don't pre-stringify, or store as TEXT and stringify once. Pick one.

🟠 BL13. submitted_by has no FK protection in the UI (P2, 8/10)
workflow.createRequest accepts submittedBy as a string from the request body — no validation that it's a real user ID. Any client can submit a request "on behalf of" any user, or no user. Coupled with no auth on the gateway, anyone can flood the approval queue with garbage.

🟠 BL14. Frontend has no current-user concept (P1, 9/10)
App.tsx:93-94 hardcodes the sidebar to "Admin User / admin@ipam.local". Approvals, IP assignments, and config changes all happen without any user attribution. Even after auth gets wired, you'll need a frontend-side useAuth() hook before any of the "Who did this?" features become real.

🟠 BL15. Risk pool detection ignores capacity (P1, 10/10)
insight.service.ts:42-51 marks a subnet as "high risk" when it has more than 5 allocated IPs. Five. Regardless of the subnet's size. A /16 (65k addresses) with 6 IPs allocated is "high risk." Should be a percentage of capacity.

🟡 BL16. Helmet and CORS imported, not used (P2, 10/10)
Root package.json declares helmet and cors. Neither is app.use()d in any service's main.ts. So you have no security headers and no CORS config. If the frontend ever talks to the API from a different origin (which it will the moment you deploy), it breaks. Plus you lose XSS, clickjacking, and content-type-sniffing protections.

🟡 BL17. Random fallback port (P2, 10/10)
Every service's main.ts:

const port = process.env.PORT || Math.floor(Math.random() \* 1000 + 3000);
If PORT env is missing in any service, it binds to a random port in 3000-3999 — which could collide with another service. The gateway hardcodes target ports, so if any service rolls the dice and lands on the gateway's expected port, traffic gets routed to the wrong service. This kind of "clever" default is exactly the worst kind of bug: works 990/1000 starts, then breaks.

3. Test review
   Coverage diagram:

SERVICES TESTS
[+] auth-service [—] none
├── login() └── no spec, no jest, no anything
└── getUsers()
[+] ipam-core-service [—] none
├── createBlock / createSubnet
├── allocateIp / releaseIp ← business-critical, race-prone
└── createDomain/Vlan/Site/Device
[+] validation-engine-service [—] none (and it's not even called)
[+] forecasting-insight-service [—] none
├── getDashboardMetrics
└── getSubnet360 (CIDR math)
[+] request-workflow-service [—] none
└── approveRequest ← does nothing, ironically untested
[+] audit-service [—] none
[+] configuration-service [—] none
[+] api-gateway [—] none
[+] frontend-portal [—] none

COVERAGE: 0 / ~50 endpoints | 0%
QUALITY: no test runner configured in any workspace
The root has files named test.js, test-core.js, test-gateway-docker.js, test-post.js. These are ad-hoc curl-style smoke scripts, not a test suite. No Jest, no Vitest, no **tests**/, no CI.

For a system whose entire job is enforcing IP allocation invariants, having zero tests on allocateIp / createSubnet is the single biggest correctness risk. Every one of the P0 business-logic bugs above (BL2, BL3, BL6) would be caught by a 20-line test.

4. Performance review
   🟠 P1. Zero indexes beyond primary keys (P1, 10/10)
   I grepped both SQL init files for CREATE INDEX — zero hits. So every query that filters by subnet_id, block_id, parent_subnet_id, status, domain_id, entity/entity_id, submitted_by does a sequential scan. With 10k subnets and 1M IP allocations (modest for telco), every dashboard load becomes a multi-second wait. At 100k subnets, the system is unusable.

Minimum required: indexes on subnets.block_id, subnets.parent_subnet_id, ip_addresses.subnet_id, ip_addresses(subnet_id, ip_address) unique, audit_logs.entity_id, allocation_requests.status.

🟠 P2. No pagination anywhere (P1, 10/10)
getBlocks, getSubnets, getDevices, getVlans, getSites, getUsers — all return the full table. getLogs has a hard LIMIT 100. The Topology page loads every block and every subnet on mount, then re-loads them after every create/delete. At 10k subnets this means transferring ~5 MB of JSON per click.

🟡 P3. N+1 risk in Planning 360 (P2, 8/10)
planning-360.service.ts:97-119 getGlobalInsights runs a query that returns every subnet, then loops in JavaScript computing capacity per row. For thousands of subnets, this is a memory-side N pass that should be a single SQL aggregation.

🟡 P4. Dashboard recomputed on every request, no cache (P2, 9/10)
getDashboardMetrics runs 4 queries (count blocks, count subnets, count IPs, time-series subnets) on every Dashboard page load. Redis is sitting right there. 60-second cache would cut DB load by ~100x for read-heavy dashboards.

🟡 P5. Bundle has lucide-react + recharts + all of TailwindCSS unsplit (P2, 7/10)
Frontend uses vite build with no manualChunks. Initial bundle pulls all icons and the recharts library into the home route, even though Recharts is only used on Dashboard and Planning 360. With route-based code splitting this drops first-load by ~200 KB. Small fish, listed for completeness.

Severity-ranked summary

# Severity Title Why it matters

1 P0 Approval workflow does nothing (BL1) Whole Approvals feature is broken
2 P0 No transactions anywhere (A2) IPs can be double-allocated under concurrent load
3 P0 No subnet-in-block validation (BL2) Topology integrity not enforced on insert
4 P0 No sibling subnet overlap check (BL3) Same IP space can be claimed twice
5 P0 Plain-text passwords (BL4) Trivially broken auth, you knew this
6 P0 Schema drift (prior report) App throws on most create flows
7 P1 Audit logs almost never written (A3) Compliance/RCA story is a fiction
8 P1 Validation service is orphan (A1) The right code exists, nobody calls it
9 P1 Dashboard utilization is constant 45 (BL8) Headline KPI lies
10 P1 Config thresholds ignored by backend (BL7) Settings UI is theater
11 P1 "Forecasting" doesn't forecast (BL9) Product name doesn't match product
12 P1 IP allows network/broadcast (BL6) Allocated IPs may not actually route
13 P1 No tests, no test runner (section 3) Every fix risks regression
14 P1 No indexes, no pagination (P1, P2) Scales to ~5k records before it breaks
15 P1 Risk detection uses fixed >5 IPs (BL15) Risk insights are meaningless
16 P1 Frontend has no current-user (BL14) Foundation for auth is missing
17 P2 Redis configured, unused (A5) Wasted resources, missed cache wins
18 P2 TypeORM used as connection pool (A4) 50 MB dep for nothing
19 P2 Helmet/CORS imported, unused (BL16) Security headers missing
20 P2 Random fallback port (BL17) Heisenbug waiting to happen
21 P2 Hard deletes, no soft-delete or audit (BL10) One misclick wipes a region
22 P2 CIDR as VARCHAR (BL11) Type mismatch with validation queries
23 P2 Double-stringified org_structure (BL12) UI has 3-pass parse to compensate
24 P2 submitted_by unvalidated (BL13) Anyone can spam request queue
25 P2 api-gateway hardcoded ports (A6) Brittle to refactor
26 P2 No multi-tenant filtering (A7) Schema implies multi-tenant, code is single
Net assessment
The product was scaffolded by someone who understands what an IPAM should look like (the data model is right, the UI is sharp, the telecom-specific fields are thoughtful) but didn't finish wiring up the things that make an IPAM actually work — validation, transactions, audit, real metrics. It is a very convincing demo, sitting on top of a engine that doesn't enforce its own invariants.

If you ship this as-is, the first user to allocate two overlapping subnets, or hit "Approve" expecting something to happen, will lose faith in the system on day one. The good news is the structural foundation is sound — the database schema is mostly right, the service boundaries are reasonable, the UI is polished. The bad news is roughly 20-30% of the visible features have no backing logic behind them.

Recommended order of operations
If you want to make this real, in priority order:

Schema drift migration (already flagged) — 5 min
Make approval actually allocate — wire workflow → ipam-core via HTTP or shared DB call — 1 hour
Add the missing validations — call validation-engine from ipam-core before insert — 1 hour
Wrap allocateIp in a transaction with SELECT FOR UPDATE — 30 min
Wire audit logging on every mutating operation — 2 hours
Real bcrypt + JWT + login page — half a day
Compute real dashboard utilization — 30 min
Read the config thresholds from the actual code — 30 min
Add database indexes — 15 min
Add 30 tests covering allocateIp / createSubnet — 2 hours
