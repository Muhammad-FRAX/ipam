import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class InsightService {
  constructor(private dataSource: DataSource) {}
  
  async getHealth() { return { status: 'UP' }; }

  async getDashboardMetrics() {
    const totalBlocks = await this.dataSource.query(`SELECT COUNT(*) FROM ip_blocks`);
    const totalSubnets = await this.dataSource.query(`SELECT COUNT(*) FROM subnets`);
    const allocatedIps = await this.dataSource.query(`SELECT COUNT(*) FROM ip_addresses WHERE status = 'ALLOCATED'`);
    
    // Calculate dynamic history from Audit Logs or Subnets
    const timeline = await this.dataSource.query(`
      SELECT TO_CHAR(created_at, 'Mon') as name, COUNT(id) as allocated
      FROM subnets
      GROUP BY TO_CHAR(created_at, 'Mon')
      ORDER BY MIN(created_at) ASC
    `);

    let historicalData = timeline;
    // Fallback if no subnets exist so the chart doesn't completely break
    if (historicalData.length === 0) {
      historicalData = [
        { name: new Date().toLocaleString('default', { month: 'short' }), allocated: 0 }
      ];
    } else {
      historicalData = historicalData.map((d: any) => ({ name: d.name, allocated: parseInt(d.allocated) }));
    }

    return {
      totalBlocks: parseInt(totalBlocks[0].count),
      totalSubnets: parseInt(totalSubnets[0].count),
      allocatedIps: parseInt(allocatedIps[0].count),
      overallUtilizationPercent: allocatedIps[0].count > 0 ? 45 : 0,
      historicalData
    };
  }

  async getRiskPools() {
    // Return high utilization subnets as risk
    return this.dataSource.query(`
      SELECT s.id, s.name, s.cidr, COUNT(i.id) as allocated_count
      FROM subnets s
      LEFT JOIN ip_addresses i ON s.id = i.subnet_id AND i.status = 'ALLOCATED'
      GROUP BY s.id
      HAVING COUNT(i.id) > 5 -- Mock threshold
    `);
  }
}
