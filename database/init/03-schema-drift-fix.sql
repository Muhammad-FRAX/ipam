-- 03-schema-drift-fix.sql: Fix schema drift between 01-init.sql and service code
-- Runs after 01-init.sql and 02-telecom-models.sql on first boot,
-- OR via "docker compose down -v && docker compose up --build" to apply cleanly.
--
-- Closes: BL11 (CIDR/INET type), schema drift P0 from APP-ISSUES.md.
-- All statements are idempotent (IF NOT EXISTS / USING cast is safe on empty tables).

-- ─── subnets: add missing telecom-specific columns ────────────────────────────
-- Referenced by apps/ipam-core-service/src/ipam.service.ts:39-47
-- and apps/forecasting-insight-service/src/planning-360.service.ts:29,32,33

-- ip_range_type: Loopback | Management | P2P | Service | Bearer | NMS | OSS | Core
ALTER TABLE subnets ADD COLUMN IF NOT EXISTS ip_range_type      VARCHAR(100);

-- service_end_if: Interface identifier at the service/customer end
ALTER TABLE subnets ADD COLUMN IF NOT EXISTS service_end_if     VARCHAR(255);

-- gateway_end_if: Interface identifier at the gateway/network end
ALTER TABLE subnets ADD COLUMN IF NOT EXISTS gateway_end_if     VARCHAR(255);

-- vlan_type: Access | Trunk | Hybrid | Management | Service | Uplink | Loopback | P2P
ALTER TABLE subnets ADD COLUMN IF NOT EXISTS vlan_type          VARCHAR(100);

-- connected_elements: free-text list of nodes connected through this subnet
ALTER TABLE subnets ADD COLUMN IF NOT EXISTS connected_elements TEXT;

-- request_date: when the subnet allocation was formally requested
ALTER TABLE subnets ADD COLUMN IF NOT EXISTS request_date       TIMESTAMPTZ;

-- requester_name: name of the person who requested the allocation
ALTER TABLE subnets ADD COLUMN IF NOT EXISTS requester_name     VARCHAR(255);

-- requester_department: organisational unit of the requester (e.g. "IPRAN Ops")
ALTER TABLE subnets ADD COLUMN IF NOT EXISTS requester_department VARCHAR(255);

-- spoc: Single Point of Contact for this subnet
ALTER TABLE subnets ADD COLUMN IF NOT EXISTS spoc               VARCHAR(255);

-- ─── sites: add missing name column ──────────────────────────────────────────
-- Referenced by apps/ipam-core-service/src/ipam.service.ts:95
ALTER TABLE sites ADD COLUMN IF NOT EXISTS name VARCHAR(255);

-- ─── network_domains: add missing vrf_name column ────────────────────────────
-- Referenced by apps/ipam-core-service/src/ipam.service.ts:72
ALTER TABLE network_domains ADD COLUMN IF NOT EXISTS vrf_name VARCHAR(255);

-- ─── devices: add missing role and management_ip columns ─────────────────────
-- Referenced by apps/ipam-core-service/src/ipam.service.ts:107-108

-- role: the network role of the device (e.g. "PE-Router", "Access-Switch")
ALTER TABLE devices ADD COLUMN IF NOT EXISTS role          VARCHAR(100);

-- management_ip: out-of-band management address (INET enforces valid IPv4/IPv6)
ALTER TABLE devices ADD COLUMN IF NOT EXISTS management_ip INET;

-- ─── vlans: add missing site_id column ───────────────────────────────────────
-- Referenced by apps/ipam-core-service/src/ipam.service.ts:83
ALTER TABLE vlans ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES sites(id);

-- ─── Convert VARCHAR CIDR/INET columns to native Postgres types (BL11) ───────
-- Native CIDR/INET types:
--   - Reject invalid addresses at insert time (no silent bad data)
--   - Enable Postgres CIDR operators: &&, <<, >> (overlap, contained, contains)
--   - Used by 04-indexes.sql masklen() expression to compute capacity in SQL
--
-- USING clause casts any existing VARCHAR data; safe on fresh (empty) tables.
-- If existing data contains invalid CIDRs this will fail — fix the data first.

ALTER TABLE ip_blocks     ALTER COLUMN cidr       TYPE CIDR USING cidr::cidr;
ALTER TABLE subnets       ALTER COLUMN cidr       TYPE CIDR USING cidr::cidr;
ALTER TABLE ip_addresses  ALTER COLUMN ip_address TYPE INET USING ip_address::inet;
