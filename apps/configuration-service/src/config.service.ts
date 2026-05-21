import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { logAudit } from '@ipam/shared-audit';

@Injectable()
export class ConfigService {
  constructor(private dataSource: DataSource) {}

  async getHealth() { return { status: 'UP' }; }

  async getConfigs() {
    return this.dataSource.query(`SELECT * FROM configurations`);
  }

  async setConfig(key: string, value: any, userId?: string | null) {
    const exists = await this.dataSource.query(`SELECT id FROM configurations WHERE key = $1`, [key]);
    let result;
    if (exists.length > 0) {
      result = await this.dataSource.query(
        `UPDATE configurations SET value = $1 WHERE key = $2 RETURNING *`,
        [value, key]
      );
    } else {
      result = await this.dataSource.query(
        `INSERT INTO configurations (key, value) VALUES ($1, $2) RETURNING *`,
        [key, value]
      );
    }
    await logAudit(this.dataSource, {
      action: 'CONFIG_CHANGED',
      entity: 'configurations',
      entityId: key,
      userId: userId ?? null,
      details: { key, value },
    });
    return result[0];
  }
}
