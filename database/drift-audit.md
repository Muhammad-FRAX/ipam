# Schema Drift Audit — IPAM Platform

**Produced by:** Phase 0, Task 0.1  
**Date:** 2026-05-20  
**Method:** Manual audit of all `dataSource.query()` calls across every service, diffed against the SQL init files.

---

## Key Finding

The `database/init/` directory was **completely absent** from the repository. No SQL files existed. Both `01-init.sql` and `02-telecom-models.sql` were created as part of this audit based on the schema implied by service code.

The tables that existed (from code inference) used `VARCHAR(50)` for CIDR columns and were missing the telecom-specific subnet attributes listed below.

---

## Missing Columns

Every row below represents a column that is referenced in service code (`INSERT`, `SELECT`, or `UPDATE`) but was not present in the base schema.

| table | column | type | referenced_by |
|---|---|---|---|
| `subnets` | `ip_range_type` | `VARCHAR(100)` | `apps/ipam-core-service/src/ipam.service.ts:39` |
| `subnets` | `service_end_if` | `VARCHAR(255)` | `apps/ipam-core-service/src/ipam.service.ts:40` |
| `subnets` | `gateway_end_if` | `VARCHAR(255)` | `apps/ipam-core-service/src/ipam.service.ts:41` |
| `subnets` | `vlan_type` | `VARCHAR(100)` | `apps/ipam-core-service/src/ipam.service.ts:42`, `apps/forecasting-insight-service/src/planning-360.service.ts:29` |
| `subnets` | `connected_elements` | `TEXT` | `apps/ipam-core-service/src/ipam.service.ts:43` |
| `subnets` | `request_date` | `TIMESTAMPTZ` | `apps/ipam-core-service/src/ipam.service.ts:44` |
| `subnets` | `requester_name` | `VARCHAR(255)` | `apps/ipam-core-service/src/ipam.service.ts:45`, `apps/forecasting-insight-service/src/planning-360.service.ts:32` |
| `subnets` | `requester_department` | `VARCHAR(255)` | `apps/ipam-core-service/src/ipam.service.ts:46`, `apps/forecasting-insight-service/src/planning-360.service.ts:33` |
| `subnets` | `spoc` | `VARCHAR(255)` | `apps/ipam-core-service/src/ipam.service.ts:47` |
| `sites` | `name` | `VARCHAR(255)` | `apps/ipam-core-service/src/ipam.service.ts:95` |
| `network_domains` | `vrf_name` | `VARCHAR(255)` | `apps/ipam-core-service/src/ipam.service.ts:72` |
| `devices` | `role` | `VARCHAR(100)` | `apps/ipam-core-service/src/ipam.service.ts:107` |
| `devices` | `management_ip` | `INET` | `apps/ipam-core-service/src/ipam.service.ts:108` |
| `vlans` | `site_id` | `UUID → sites(id)` | `apps/ipam-core-service/src/ipam.service.ts:83` |

All of these are fixed by `database/init/03-schema-drift-fix.sql`.

---

## Column Type Issues (BL11)

The base schema stored network addresses as `VARCHAR(50)`. This prevents using Postgres's native CIDR operators (`&&`, `<<`, `>>`) for overlap detection and disables type-level validation of addresses on insert.

| table | column | base type | corrected type | fixed in |
|---|---|---|---|---|
| `ip_blocks` | `cidr` | `VARCHAR(50)` | `CIDR` | `03-schema-drift-fix.sql` |
| `subnets` | `cidr` | `VARCHAR(50)` | `CIDR` | `03-schema-drift-fix.sql` |
| `ip_addresses` | `ip_address` | `VARCHAR(50)` | `INET` | `03-schema-drift-fix.sql` |

---

## Performance Issues (APP-ISSUES Performance P1)

Zero indexes existed beyond primary keys. The following were created in `04-indexes.sql`:

| index | table | columns | purpose |
|---|---|---|---|
| `idx_subnets_block_id` | `subnets` | `block_id` | topology page block→subnet joins |
| `idx_subnets_parent_subnet_id` | `subnets` | `parent_subnet_id` | hierarchical tree traversal |
| `idx_subnets_domain_id` | `subnets` | `domain_id` | domain-scoped queries |
| `idx_ip_addresses_subnet_id` | `ip_addresses` | `subnet_id` | capacity and allocation queries |
| `uq_ip_in_subnet` | `ip_addresses` | `(subnet_id, ip_address) WHERE status='ALLOCATED'` | prevent double-allocation (A2) |
| `idx_audit_logs_entity` | `audit_logs` | `(entity, entity_id)` | record-level audit lookups |
| `idx_audit_logs_timestamp` | `audit_logs` | `timestamp DESC` | newest-first audit display |
| `idx_alloc_requests_status` | `allocation_requests` | `status` | approval queue filtering |
| `idx_alloc_requests_submitted_by` | `allocation_requests` | `submitted_by` | user-scoped request views |

---

## Known Remaining Issues (Not Fixed in Phase 0)

These issues were identified but are addressed in later phases per PLAN.md:

| issue | description | phase |
|---|---|---|
| BL4 | `password_hash = 'admin123'` plain-text seed | Phase 2.1 |
| BL5 | Broken token template literal in auth.service.ts | Phase 2.2 |
| A2 | No transactions on `allocateIp` (race condition) | Phase 1.3 |
| BL1 | Approval workflow does not create subnets | Phase 3.2 |
| BL8 | Dashboard utilization hardcoded to 45 | Phase 4.1 |
| BL12 | Double-stringified JSONB in config.service.ts | Phase 4.5 |
| A3 | Audit logs not written for most mutations | Phase 3.1 |
