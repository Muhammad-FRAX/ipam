-- 06-soft-delete.sql
-- Task 3.3: Add deleted_at column to ip_blocks and subnets for soft-delete support.
-- deleteBlock / deleteSubnet in ipam.service.ts now SET deleted_at = NOW() instead
-- of issuing a hard DELETE. All SELECTs filter WHERE deleted_at IS NULL.
-- This ensures audit logs and child records are preserved after deletion (BL10).

ALTER TABLE ip_blocks
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

ALTER TABLE subnets
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

-- Index to make the IS NULL filter fast at scale
CREATE INDEX IF NOT EXISTS idx_ip_blocks_deleted_at ON ip_blocks(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_subnets_deleted_at ON subnets(deleted_at) WHERE deleted_at IS NULL;
