-- 02-telecom-models.sql: Telecom domain seed data and reference values
-- Runs after 01-init.sql. Populates reference data for IPRAN/MPBN domains
-- used throughout the IPAM telecom workflow.

-- ─── Default Network Domains ──────────────────────────────────────────────────

-- IPRAN: IP Radio Access Network — connects base stations to the core
-- MPBN: Multi-Protocol Backbone Network — the carrier core transport layer
INSERT INTO network_domains (id, name, description) VALUES
    ('00000000-0000-0000-0000-000000000101', 'IPRAN', 'IP Radio Access Network — connects RAN base stations to core'),
    ('00000000-0000-0000-0000-000000000102', 'MPBN',  'Multi-Protocol Backbone Network — carrier core transport')
ON CONFLICT DO NOTHING;

-- ─── Reference VLAN Types ─────────────────────────────────────────────────────
-- These are the standardised VLAN roles used in telecom LLD documents.
-- Used as allowed values for subnets.vlan_type (added in 03-schema-drift-fix.sql).
-- Stored as a comment here for documentation; enforced at application layer.

-- VLAN types: Access, Trunk, Hybrid, Management, Service, Uplink, Loopback, P2P

-- ─── Reference IP Range Types ─────────────────────────────────────────────────
-- These are the standardised range roles used in IPRAN/MPBN LLD documents.
-- Used as allowed values for subnets.ip_range_type (added in 03-schema-drift-fix.sql).

-- IP range types: Loopback, Management, P2P, Service, Bearer, NMS, OSS, Core
