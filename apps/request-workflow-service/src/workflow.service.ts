import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class WorkflowService {
  constructor(private dataSource: DataSource) {}
  
  async getHealth() { return { status: 'UP' }; }

  async createRequest(type: string, requestedCidr: string, metadata: any, submittedBy: string) {
    const result = await this.dataSource.query(
      `INSERT INTO allocation_requests (type, requested_cidr, metadata, status, submitted_by) VALUES ($1, $2, $3, 'SUBMITTED', $4) RETURNING *`,
      [type, requestedCidr, metadata, submittedBy]
    );
    return result[0];
  }

  async getRequests() {
    return this.dataSource.query(
      `SELECT r.*, u.email as submitter_email FROM allocation_requests r LEFT JOIN users u ON u.id = r.submitted_by ORDER BY r.created_at DESC`
    );
  }

  async approveRequest(id: string) {
    const reqs = await this.dataSource.query(`SELECT * FROM allocation_requests WHERE id = $1`, [id]);
    if (!reqs.length) throw new NotFoundException('Request not found');
    if (reqs[0].status !== 'SUBMITTED') throw new BadRequestException('Request is not in SUBMITTED state');

    const result = await this.dataSource.query(
      `UPDATE allocation_requests SET status = 'APPROVED' WHERE id = $1 RETURNING *`,
      [id]
    );
    
    return result[0];
  }

  async rejectRequest(id: string) {
     const result = await this.dataSource.query(
      `UPDATE allocation_requests SET status = 'REJECTED' WHERE id = $1 RETURNING *`,
      [id]
    );
    return result[0];
  }
}
