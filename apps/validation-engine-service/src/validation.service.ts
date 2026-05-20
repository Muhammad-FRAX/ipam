import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as ipaddr from 'ipaddr.js';

@Injectable()
export class ValidationService {
  constructor(private dataSource: DataSource) {}
  
  async getHealth() { return { status: 'UP' }; }

  async validateCidr(cidr: string) {
    try {
      ipaddr.parseCIDR(cidr);
      return { valid: true };
    } catch (e) {
      return { valid: false, reason: 'Invalid CIDR format' };
    }
  }

  async validateOverlap(cidr: string) {
    try {
      // Postgres built-in CIDR cast operator && (overlap), << (contained by), >> (contains)
      const overlapBlocks = await this.dataSource.query(
        `SELECT id, name, cidr FROM ip_blocks WHERE CAST(cidr AS CIDR) && CAST($1 AS CIDR)`,
        [cidr]
      );
      const overlapSubnets = await this.dataSource.query(
        `SELECT id, name, cidr FROM subnets WHERE CAST(cidr AS CIDR) && CAST($1 AS CIDR)`,
        [cidr]
      );
      
      const hasOverlap = overlapBlocks.length > 0 || overlapSubnets.length > 0;
      return { 
        valid: true, 
        overlap: hasOverlap, 
        conflicts: { blocks: overlapBlocks, subnets: overlapSubnets } 
      };
    } catch (e) {
      return { valid: false, error: e.message, overlap: true };
    }
  }

  async validateDuplicateIp(ipAddress: string, subnetId: string) {
    const records = await this.dataSource.query(
      `SELECT id FROM ip_addresses WHERE ip_address = $1 AND subnet_id = $2`,
      [ipAddress, subnetId]
    );
    return { valid: records.length === 0, duplicate: records.length > 0 };
  }
}
