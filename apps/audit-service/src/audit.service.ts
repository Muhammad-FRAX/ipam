import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class AuditService {
  constructor(private dataSource: DataSource) {}
  
  async getHealth() { return { status: 'UP' }; }

  async recordAction(action: string, entity: string, entityId: string, userId: string, details: any) {
    const result = await this.dataSource.query(
      `INSERT INTO audit_logs (action, entity, entity_id, user_id, details) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [action, entity, entityId, userId, details]
    );
    return result[0];
  }

  async getLogs() {
    return this.dataSource.query(`SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 100`);
  }
}
