import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { parseCidr } from '@ipam/shared-validation';
import { getConfig } from '@ipam/shared-config';

@Injectable()
export class InsightService {
  constructor(private dataSource: DataSource) {}

  async getHealth() { return { status: 'UP' }; }

  async getDashboardMetrics() {
    const totalBlocks = await this.dataSource.query(
      `SELECT COUNT(*) FROM ip_blocks WHERE deleted_at IS NULL`
    );
    const totalSubnets = await this.dataSource.query(
      `SELECT COUNT(*) FROM subnets WHERE deleted_at IS NULL`
    );
    const allocatedIps = await this.dataSource.query(
      `SELECT COUNT(*) FROM ip_addresses WHERE status = 'ALLOCATED'`
    );

    // Compute real utilization: sum(allocated) / sum(capacity) across all subnets
    const subnets = await this.dataSource.query(
      `SELECT cidr::text AS cidr FROM subnets WHERE deleted_at IS NULL`
    );
    let totalCapacity = 0;
    for (const s of subnets) {
      try {
        const { prefix } = parseCidr(s.cidr);
        if (prefix > 30) continue; // /31 and /32 are point-to-point or single-host — excluded from pool capacity
        totalCapacity += Math.pow(2, 32 - prefix) - 2;
      } catch {
        // skip rows with unparseable CIDR
      }
    }
    const totalAllocated = parseInt(allocatedIps[0].count, 10);
    const overallUtilizationPercent = totalCapacity > 0
      ? Number(((totalAllocated / totalCapacity) * 100).toFixed(1))
      : 0;

    const timeline = await this.dataSource.query(`
      SELECT TO_CHAR(created_at, 'Mon') as name, COUNT(id) as allocated
      FROM subnets
      WHERE deleted_at IS NULL
      GROUP BY TO_CHAR(created_at, 'Mon')
      ORDER BY MIN(created_at) ASC
    `);

    let historicalData = timeline;
    if (historicalData.length === 0) {
      historicalData = [
        { name: new Date().toLocaleString('default', { month: 'short' }), allocated: 0 }
      ];
    } else {
      historicalData = historicalData.map((d: any) => ({ name: d.name, allocated: parseInt(d.allocated) }));
    }

    return {
      totalBlocks: parseInt(totalBlocks[0].count, 10),
      totalSubnets: parseInt(totalSubnets[0].count, 10),
      allocatedIps: totalAllocated,
      overallUtilizationPercent,
      historicalData
    };
  }

  async getRiskPools() {
    const threshold = await getConfig(this.dataSource, 'exhaustion_warning_pct', 80);
    const thresholdNum = Number(threshold);

    return this.dataSource.query(`
      SELECT s.id, s.name, s.cidr::text AS cidr,
             COUNT(i.id) AS allocated_count,
             (2 ^ (32 - masklen(s.cidr)) - 2)::int AS capacity,
             ROUND(100.0 * COUNT(i.id) / NULLIF((2 ^ (32 - masklen(s.cidr)) - 2), 0), 1) AS utilization_pct
      FROM subnets s
      LEFT JOIN ip_addresses i ON i.subnet_id = s.id AND i.status = 'ALLOCATED'
      WHERE s.deleted_at IS NULL AND masklen(s.cidr) < 31
      GROUP BY s.id
      HAVING ROUND(100.0 * COUNT(i.id) / NULLIF((2 ^ (32 - masklen(s.cidr)) - 2), 0), 1) >= $1
      ORDER BY utilization_pct DESC
      LIMIT 50
    `, [thresholdNum]);
  }
}
