-- 05-request-failure-reason.sql
-- Task 3.2: Add failure_reason to allocation_requests so that a rejected/failed
-- approval can record the reason (e.g. "Subnet 10.5.0.0/24 overlaps with existing
-- subnet 10.5.0.0/24"). Also adds block_id so SUBNET requests know their parent.
-- Referenced by: workflow.service.ts approveRequest()

ALTER TABLE allocation_requests
  ADD COLUMN IF NOT EXISTS failure_reason TEXT,
  ADD COLUMN IF NOT EXISTS block_id UUID REFERENCES ip_blocks(id);
