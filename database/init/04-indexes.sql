-- 04-indexes.sql: Performance indexes for the IPAM platform
-- Runs after 03-schema-drift-fix.sql.
-- Closes: APP-ISSUES.md Performance P1 "Zero indexes beyond primary keys".
-- All statements use IF NOT EXISTS for idempotency.

-- ─── subnets ──────────────────────────────────────────────────────────────────

-- subnets.block_id: every topology page load filters subnets by their parent block
CREATE INDEX IF NOT EXISTS idx_subnets_block_id
    ON subnets(block_id);

-- subnets.parent_subnet_id: hierarchical tree queries walk parent→child links
CREATE INDEX IF NOT EXISTS idx_subnets_parent_subnet_id
    ON subnets(parent_subnet_id);

-- subnets.domain_id: domain-scoped subnet lists (IPRAN vs MPBN dashboards)
CREATE INDEX IF NOT EXISTS idx_subnets_domain_id
    ON subnets(domain_id);

-- ─── ip_addresses ─────────────────────────────────────────────────────────────

-- ip_addresses.subnet_id: every IP list and capacity query joins here
CREATE INDEX IF NOT EXISTS idx_ip_addresses_subnet_id
    ON ip_addresses(subnet_id);

-- Unique index on (subnet_id, ip_address) for ALLOCATED IPs.
-- This is the DB-level guard against double-allocation (A2 in APP-ISSUES.md).
-- Partial index (WHERE status = 'ALLOCATED') allows the same address to be
-- released and re-allocated without violating uniqueness.
CREATE UNIQUE INDEX IF NOT EXISTS uq_ip_in_subnet
    ON ip_addresses(subnet_id, ip_address)
    WHERE status = 'ALLOCATED';

-- ─── audit_logs ───────────────────────────────────────────────────────────────

-- audit_logs(entity, entity_id): record-level audit trail lookups
-- e.g. "show all events for subnet abc-123"
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity
    ON audit_logs(entity, entity_id);

-- audit_logs.timestamp DESC: audit log display is always newest-first
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp
    ON audit_logs(timestamp DESC);

-- ─── allocation_requests ──────────────────────────────────────────────────────

-- allocation_requests.status: approval queue filters by SUBMITTED / APPROVED / REJECTED
CREATE INDEX IF NOT EXISTS idx_alloc_requests_status
    ON allocation_requests(status);

-- allocation_requests.submitted_by: user-scoped request history
CREATE INDEX IF NOT EXISTS idx_alloc_requests_submitted_by
    ON allocation_requests(submitted_by);
