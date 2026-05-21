import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { logAudit } from '@ipam/shared-audit';
import { isSubnetContained, doSubnetsOverlap, isHostAddress } from '@ipam/shared-validation';

@Injectable()
export class WorkflowService {
  constructor(private dataSource: DataSource) {}

  async getHealth() { return { status: 'UP' }; }

  async createRequest(type: string, requestedCidr: string, blockId: string | null, metadata: any, submittedBy: string, userId?: string | null) {
    const result = await this.dataSource.query(
      `INSERT INTO allocation_requests (type, requested_cidr, block_id, metadata, status, submitted_by)
       VALUES ($1, $2, $3, $4, 'SUBMITTED', $5) RETURNING *`,
      [type, requestedCidr, blockId || null, metadata, submittedBy]
    );
    const req = result[0];
    await logAudit(this.dataSource, {
      action: 'REQUEST_SUBMITTED',
      entity: 'allocation_requests',
      entityId: req.id,
      userId: userId ?? null,
      details: { type, requestedCidr, blockId },
    });
    return req;
  }

  async getRequests(page = 1, pageSize = 50) {
    const offset = (page - 1) * pageSize;
    const [rows, countRows] = await Promise.all([
      this.dataSource.query(
        `SELECT r.*, u.email as submitter_email
         FROM allocation_requests r
         LEFT JOIN users u ON u.id = r.submitted_by
         ORDER BY r.created_at DESC LIMIT $1 OFFSET $2`,
        [pageSize, offset]
      ),
      this.dataSource.query(`SELECT COUNT(*) FROM allocation_requests`),
    ]);
    return { items: rows, total: parseInt(countRows[0].count, 10), page, pageSize };
  }

  async approveRequest(id: string, userId?: string | null) {
    const reqs = await this.dataSource.query(
      `SELECT * FROM allocation_requests WHERE id = $1`,
      [id]
    );
    if (!reqs.length) throw new NotFoundException('Request not found');
    const request = reqs[0];
    if (request.status !== 'SUBMITTED') {
      throw new BadRequestException('Request is not in SUBMITTED state');
    }

    // Attempt to create the actual resource
    try {
      if (request.type === 'SUBNET') {
        await this._allocateSubnetForRequest(request, userId);
      } else if (request.type === 'IP') {
        await this._allocateIpForRequest(request, userId);
      }

      const result = await this.dataSource.query(
        `UPDATE allocation_requests SET status = 'APPROVED' WHERE id = $1 RETURNING *`,
        [id]
      );
      await logAudit(this.dataSource, {
        action: 'REQUEST_APPROVED',
        entity: 'allocation_requests',
        entityId: id,
        userId: userId ?? null,
        details: { type: request.type, requestedCidr: request.requested_cidr },
      });
      return result[0];
    } catch (err: any) {
      const failureReason = err?.message ?? 'Unknown error';
      await this.dataSource.query(
        `UPDATE allocation_requests SET status = 'FAILED', failure_reason = $1 WHERE id = $2`,
        [failureReason, id]
      );
      await logAudit(this.dataSource, {
        action: 'REQUEST_FAILED',
        entity: 'allocation_requests',
        entityId: id,
        userId: userId ?? null,
        details: { type: request.type, requestedCidr: request.requested_cidr, reason: failureReason },
      });
      // Return the updated request so the caller can see the FAILED state
      const failed = await this.dataSource.query(
        `SELECT * FROM allocation_requests WHERE id = $1`,
        [id]
      );
      return failed[0];
    }
  }

  private async _allocateSubnetForRequest(request: any, userId?: string | null): Promise<void> {
    const { requested_cidr: cidr, block_id: blockId, metadata } = request;

    if (!blockId) {
      throw new BadRequestException('Subnet request requires a block_id');
    }

    // Validate block exists
    const blockRows = await this.dataSource.query(
      `SELECT cidr FROM ip_blocks WHERE id = $1 AND deleted_at IS NULL`,
      [blockId]
    );
    if (!blockRows.length) {
      throw new BadRequestException(`Block ${blockId} not found`);
    }
    const blockCidr: string = blockRows[0].cidr;

    if (!isSubnetContained(cidr, blockCidr)) {
      throw new BadRequestException(
        `Subnet ${cidr} is not contained in parent block ${blockCidr}`
      );
    }

    // Check sibling overlap
    const siblings = await this.dataSource.query(
      `SELECT cidr FROM subnets WHERE block_id = $1 AND parent_subnet_id IS NULL AND deleted_at IS NULL`,
      [blockId]
    );
    for (const sibling of siblings) {
      if (doSubnetsOverlap(cidr, sibling.cidr)) {
        throw new BadRequestException(
          `Subnet ${cidr} overlaps with existing subnet ${sibling.cidr}`
        );
      }
    }

    const name = metadata?.name || cidr;
    const result = await this.dataSource.query(
      `INSERT INTO subnets (block_id, parent_subnet_id, name, cidr, domain_id, service_type, owner_id)
       VALUES ($1, NULL, $2, $3, $4, $5, $6) RETURNING *`,
      [blockId, name, cidr, metadata?.domainId || null, metadata?.serviceType || null, request.submitted_by || null]
    );
    const subnet = result[0];

    await logAudit(this.dataSource, {
      action: 'SUBNET_CREATED',
      entity: 'subnets',
      entityId: subnet.id,
      userId: userId ?? null,
      details: { cidr, blockId, source: 'workflow_approval', requestId: request.id },
    });
  }

  private async _allocateIpForRequest(request: any, userId?: string | null): Promise<void> {
    const { requested_cidr: ipAddress, block_id: subnetId, metadata } = request;

    if (!subnetId) {
      throw new BadRequestException('IP request requires a block_id (used as subnet_id)');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const subnetRows = await queryRunner.query(
        `SELECT cidr FROM subnets WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`,
        [subnetId]
      );
      if (!subnetRows.length) {
        throw new BadRequestException('Subnet not found');
      }
      const subnetCidr: string = subnetRows[0].cidr;

      if (!isHostAddress(ipAddress, subnetCidr)) {
        throw new BadRequestException(
          `IP ${ipAddress} is not a valid host address in subnet ${subnetCidr}`
        );
      }

      const existing = await queryRunner.query(
        `SELECT id FROM ip_addresses WHERE subnet_id = $1 AND ip_address = $2 AND status = 'ALLOCATED'`,
        [subnetId, ipAddress]
      );
      if (existing.length > 0) {
        throw new BadRequestException(`IP ${ipAddress} is already allocated in this subnet`);
      }

      const result = await queryRunner.query(
        `INSERT INTO ip_addresses (subnet_id, ip_address, status, metadata)
         VALUES ($1, $2, 'ALLOCATED', $3) RETURNING *`,
        [subnetId, ipAddress, metadata || {}]
      );
      await queryRunner.commitTransaction();

      const ip = result[0];
      await logAudit(this.dataSource, {
        action: 'IP_ALLOCATED',
        entity: 'ip_addresses',
        entityId: ip.id,
        userId: userId ?? null,
        details: { ipAddress, subnetId, source: 'workflow_approval', requestId: request.id },
      });
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async rejectRequest(id: string, userId?: string | null) {
    const result = await this.dataSource.query(
      `UPDATE allocation_requests SET status = 'REJECTED' WHERE id = $1 RETURNING *`,
      [id]
    );
    await logAudit(this.dataSource, {
      action: 'REQUEST_REJECTED',
      entity: 'allocation_requests',
      entityId: id,
      userId: userId ?? null,
      details: {},
    });
    return result[0];
  }
}
