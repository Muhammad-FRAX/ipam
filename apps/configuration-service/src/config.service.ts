import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class ConfigService {
  constructor(private dataSource: DataSource) {}
  
  async getHealth() { return { status: 'UP' }; }

  async getConfigs() {
    return this.dataSource.query(`SELECT * FROM configurations`);
  }

  async setConfig(key: string, value: any) {
    const exists = await this.dataSource.query(`SELECT id FROM configurations WHERE key = $1`, [key]);
    const jsonValue = JSON.stringify(value);
    let result;
    if (exists.length > 0) {
      result = await this.dataSource.query(
        `UPDATE configurations SET value = $1 WHERE key = $2 RETURNING *`, 
        [jsonValue, key]
      );
    } else {
      result = await this.dataSource.query(
        `INSERT INTO configurations (key, value) VALUES ($1, $2) RETURNING *`, 
        [key, jsonValue]
      );
    }
    return result[0];
  }
}
