-- 01-init.sql: Core schema for the IPAM Platform
-- Creates the fundamental tables. CIDRs stored as VARCHAR(50) here; converted
-- to native CIDR/INET types in 03-schema-drift-fix.sql (BL11).
-- Telecom-specific columns are intentionally absent here; added in 03.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Auth ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
    id            UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,  -- BL4: plain-text seed; replaced with bcrypt in Phase 2
    status        VARCHAR(50)  NOT NULL DEFAULT 'ACTIVE',
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS roles (
    id   UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS user_roles (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

-- ─── Network Infrastructure ───────────────────────────────────────────────────

-- network_domains: IPRAN / MPBN logical domains.
-- Missing column: vrf_name — added in 03-schema-drift-fix.sql
CREATE TABLE IF NOT EXISTS network_domains (
    id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- sites: physical or logical network sites.
-- Missing column: name — added in 03-schema-drift-fix.sql
CREATE TABLE IF NOT EXISTS sites (
    id        UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    region    VARCHAR(255),
    site_code VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- vlans: 802.1Q VLAN definitions.
-- Missing column: site_id — added in 03-schema-drift-fix.sql
CREATE TABLE IF NOT EXISTS vlans (
    id        UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    vlan_id   INTEGER     NOT NULL,
    name      VARCHAR(255),
    domain_id UUID        REFERENCES network_domains(id),
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- devices: network devices (routers, switches, etc.).
-- Missing columns: role, management_ip — added in 03-schema-drift-fix.sql
CREATE TABLE IF NOT EXISTS devices (
    id        UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    hostname  VARCHAR(255) NOT NULL,
    site_id   UUID         REFERENCES sites(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── IP Address Management ────────────────────────────────────────────────────

-- ip_blocks: root CIDR address pools.
-- cidr stored as VARCHAR(50); converted to native CIDR type in 03-schema-drift-fix.sql (BL11)
CREATE TABLE IF NOT EXISTS ip_blocks (
    id        UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    name      VARCHAR(255) NOT NULL,
    cidr      VARCHAR(50)  NOT NULL,  -- BL11: converted to CIDR in 03-schema-drift-fix.sql
    domain_id UUID         REFERENCES network_domains(id),
    owner_id  UUID         REFERENCES users(id),
    status    VARCHAR(50)  NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- subnets: subdivisions of ip_blocks. Supports hierarchical nesting via parent_subnet_id.
-- cidr stored as VARCHAR(50); converted to CIDR in 03-schema-drift-fix.sql (BL11)
-- Missing telecom columns (ip_range_type, service_end_if, gateway_end_if, vlan_type,
-- connected_elements, request_date, requester_name, requester_department, spoc)
-- are added in 03-schema-drift-fix.sql
CREATE TABLE IF NOT EXISTS subnets (
    id               UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    block_id         UUID         REFERENCES ip_blocks(id) ON DELETE CASCADE,
    parent_subnet_id UUID         REFERENCES subnets(id),
    name             VARCHAR(255),
    cidr             VARCHAR(50)  NOT NULL,  -- BL11: converted to CIDR in 03-schema-drift-fix.sql
    domain_id        UUID         REFERENCES network_domains(id),
    vlan_id          UUID         REFERENCES vlans(id),
    service_type     VARCHAR(100),
    owner_id         UUID         REFERENCES users(id),
    status           VARCHAR(50)  NOT NULL DEFAULT 'ACTIVE',
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ip_addresses: individual host address allocations within a subnet.
-- ip_address stored as VARCHAR(50); converted to INET in 03-schema-drift-fix.sql (BL11)
CREATE TABLE IF NOT EXISTS ip_addresses (
    id         UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    subnet_id  UUID         REFERENCES subnets(id) ON DELETE CASCADE,
    ip_address VARCHAR(50)  NOT NULL,  -- BL11: converted to INET in 03-schema-drift-fix.sql
    status     VARCHAR(50)  NOT NULL DEFAULT 'ALLOCATED',
    metadata   JSONB        NOT NULL DEFAULT '{}',
    device_id  UUID         REFERENCES devices(id),
    is_gateway BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── Workflow & Audit ─────────────────────────────────────────────────────────

-- allocation_requests: approval workflow requests for subnets or IPs.
CREATE TABLE IF NOT EXISTS allocation_requests (
    id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    type           VARCHAR(50) NOT NULL,          -- 'SUBNET' | 'IP'
    requested_cidr VARCHAR(50),
    metadata       JSONB       NOT NULL DEFAULT '{}',
    status         VARCHAR(50) NOT NULL DEFAULT 'SUBMITTED',  -- SUBMITTED | APPROVED | REJECTED
    submitted_by   UUID        REFERENCES users(id),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- audit_logs: immutable record of every mutation.
-- user_id is nullable: system/export actions may have no user (A3).
CREATE TABLE IF NOT EXISTS audit_logs (
    id        UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    action    VARCHAR(100) NOT NULL,
    entity    VARCHAR(100),
    entity_id VARCHAR(255),
    user_id   UUID,        -- nullable; FK not enforced so deletions don't break audit trail
    details   JSONB        NOT NULL DEFAULT '{}',
    timestamp TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- configurations: key-value settings store.
-- value is JSONB; do NOT JSON.stringify before insert — the pg driver handles it (BL12).
CREATE TABLE IF NOT EXISTS configurations (
    id    UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    key   VARCHAR(255) UNIQUE NOT NULL,
    value JSONB
);

-- ─── Seed Data ────────────────────────────────────────────────────────────────

-- Seed roles
INSERT INTO roles (id, name) VALUES
    ('00000000-0000-0000-0000-000000000001', 'ADMIN'),
    ('00000000-0000-0000-0000-000000000002', 'USER')
ON CONFLICT (name) DO NOTHING;

-- Seed admin user — bcrypt hash of 'admin123' (cost 10). Task 2.1.
INSERT INTO users (id, email, password_hash, status) VALUES
    ('00000000-0000-0000-0000-000000000010', 'admin@ipam.local', '$2b$10$CZEORzHagfXQd48NfyHJ1.5wpI/CJEQoEr6e7cro9bdRlQzo5BPGe', 'ACTIVE')
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_roles (user_id, role_id) VALUES
    ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

-- Seed default configuration thresholds (BL7: backend ignores these until Phase 4)
INSERT INTO configurations (key, value) VALUES
    ('high_util',               '80'),
    ('max_ips',                 '1000'),
    ('exhaustion_warning_pct',  '80'),
    ('risk_pool_min_allocations', '5')
ON CONFLICT (key) DO NOTHING;
