import { Injectable, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class Planning360Service {
  constructor(private dataSource: DataSource) {}

  async getSubnet360(id: string) {
    if (!id) throw new BadRequestException('Subnet ID required');
    const subnetQuery = await this.dataSource.query(`SELECT * FROM subnets WHERE id = $1`, [id]);
    if (!subnetQuery.length) throw new BadRequestException('Subnet not found');
    const subnet = subnetQuery[0];

    // Compute basic math based on CIDR
    // A simplified mock of CIDR calculation where a /24 has 256 IPs.
    const cidrParts = subnet.cidr.split('/');
    const mask = parseInt(cidrParts[1]) || 24;
    const totalCapacity = Math.pow(2, 32 - mask);

    const ips = await this.dataSource.query(`SELECT ip_address, status, metadata FROM ip_addresses WHERE subnet_id = $1`, [id]);
    const allocated = ips.filter((i: any) => i.status === 'ALLOCATED').length;
    
    return {
       identity: {
          id: subnet.id,
          name: subnet.name,
          cidr: subnet.cidr,
          status: subnet.status,
          vlan_type: subnet.vlan_type,
          requester_name: subnet.requester_name,
          requester_department: subnet.requester_department
       },
       capacity: {
          total: totalCapacity,
          allocated,
          free: totalCapacity - allocated,
          utilizationPercent: totalCapacity > 0 ? ((allocated / totalCapacity) * 100).toFixed(2) : 0
       },
       insight: {
          exhaustionRisk: (totalCapacity - allocated) < (totalCapacity * 0.1) ? 'HIGH' : 'LOW',
          recommendation: (totalCapacity - allocated) < (totalCapacity * 0.1) ? 'Consider expanding the parent pool and reclaiming unused blocks immediately.' : 'Capacity levels are healthy.'
       },
       allocations: ips
    };
  }

  async getPool360(id: string) {
    if (!id) throw new BadRequestException('Pool (Block) ID required');
    const blockQuery = await this.dataSource.query(`SELECT * FROM ip_blocks WHERE id = $1`, [id]);
    if (!blockQuery.length) throw new BadRequestException('Block not found');
    const block = blockQuery[0];

    const subnets = await this.dataSource.query(`SELECT id, status FROM subnets WHERE block_id = $1`, [id]);
    return {
       identity: {
          id: block.id,
          name: block.name,
          cidr: block.cidr,
          status: block.status
       },
       capacity: {
          totalSubnets: subnets.length,
          activeSubnets: subnets.filter((s:any) => s.status !== 'AVAILABLE').length,
       },
       insight: {
          allocationPressure: subnets.length > 5 ? 'ELEVATED' : 'NORMAL',
          fragmentationIndicator: 'Medium (Based on subnets distribution without contiguous map)'
       }
    };
  }

  async getRequest360(id: string) {
    if (!id) throw new BadRequestException('Request ID required');
    const requestQuery = await this.dataSource.query(`SELECT * FROM allocation_requests WHERE id = $1`, [id]);
    if (!requestQuery.length) throw new BadRequestException('Request not found');
    const request = requestQuery[0];

    const timeline = await this.dataSource.query(`SELECT * FROM audit_logs WHERE entity = 'REQUEST' AND entity_id = $1 ORDER BY timestamp ASC`, [id]);

    return {
       identity: {
          id: request.id,
          type: request.type,
          requestedCidr: request.requested_cidr,
          status: request.status
       },
       audit: timeline,
       insight: {
          slaViolationRisk: request.status === 'DRAFT' || request.status === 'SUBMITTED' ? 'Active' : 'Completed'
       }
    };
  }

  async getGlobalInsights() {
    // 1. Calculate Exhaustion Risk (Subnets nearing full capacity)
    // We approximate IPs used per subnet.
    const exhaustionQuery = await this.dataSource.query(`
      SELECT s.id, s.name, s.cidr, COUNT(i.id) as allocated_ips
      FROM subnets s
      LEFT JOIN ip_addresses i ON i.subnet_id = s.id AND i.status = 'ALLOCATED'
      GROUP BY s.id, s.name, s.cidr
    `);
    
    const exhaustionRisks = [];
    for (const sub of exhaustionQuery) {
       const cidrParts = sub.cidr.split('/');
       const mask = parseInt(cidrParts[1]) || 24;
       if (mask > 30) continue; // Skip /31 and /32
       const capacity = Math.pow(2, 32 - mask);
       const allocated = parseInt(sub.allocated_ips);
       if (capacity > 0 && (allocated / capacity) > 0.8) {
           exhaustionRisks.push({
               subnet_id: sub.id,
               name: sub.name,
               cidr: sub.cidr,
               utilization: ((allocated / capacity) * 100).toFixed(1)
           });
       }
    }

    // 2. Orphaned IPs (Allocated but no device/node linked)
    const orphansQuery = await this.dataSource.query(`
      SELECT id, ip_address, subnet_id
      FROM ip_addresses 
      WHERE status = 'ALLOCATED' 
      AND (device_id IS NULL AND (metadata->>'nodeDetails' IS NULL OR metadata->>'nodeDetails' = ''))
      LIMIT 100
    `);

    // 3. Fragmentation: Root Blocks with many small subnets but no /24s
    const fragmentationQuery = await this.dataSource.query(`
      SELECT b.id, b.name, COUNT(s.id) as subnet_count
      FROM ip_blocks b
      LEFT JOIN subnets s ON s.block_id = b.id
      GROUP BY b.id, b.name
      HAVING COUNT(s.id) > 10
    `);

    return {
       exhaustionRisks: exhaustionRisks.sort((a,b) => Number(b.utilization) - Number(a.utilization)).slice(0, 10),
       orphanedIps: orphansQuery.length,
       fragmentedBlocks: fragmentationQuery.map(f => ({ id: f.id, name: f.name, count: f.subnet_count }))
    };
  }
}
