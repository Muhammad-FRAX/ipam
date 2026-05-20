import { Injectable, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { isSubnetContained, doSubnetsOverlap, isHostAddress } from '@ipam/shared-validation';

@Injectable()
export class IpamService {
  constructor(private dataSource: DataSource) {}

  async getHealth() {
    try {
      await this.dataSource.query('SELECT 1');
      return { status: 'UP', service: 'ipam-core-service' };
    } catch (e) {
      return { status: 'DOWN', error: e.message };
    }
  }

  async createBlock(name: string, cidr: string, domainId?: string, ownerId?: string) {
    const result = await this.dataSource.query(
      `INSERT INTO ip_blocks (name, cidr, domain_id, owner_id) VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, cidr, domainId || null, ownerId || null]
    );
    return result[0];
  }

  async getBlocks() {
    return this.dataSource.query(`SELECT * FROM ip_blocks ORDER BY created_at DESC`);
  }

  async createSubnet(
    blockId: string,
    parentSubnetId: string | null,
    name: string,
    cidr: string,
    domainId?: string,
    vlanId?: string,
    serviceType?: string,
    ownerId?: string,
    ipRangeType?: string,
    serviceEndIf?: string,
    gatewayEndIf?: string,
    vlanType?: string,
    connectedElements?: string,
    requestDate?: string,
    requesterName?: string,
    requesterDepartment?: string,
    spoc?: string
  ) {
    // Fetch the parent block CIDR to validate containment
    const blockRows = await this.dataSource.query(
      `SELECT cidr FROM ip_blocks WHERE id = $1`,
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

    // Fetch sibling subnets to check for overlaps
    const parentFilter = parentSubnetId
      ? `parent_subnet_id = $2`
      : `parent_subnet_id IS NULL`;
    const siblings = await this.dataSource.query(
      `SELECT cidr FROM subnets WHERE block_id = $1 AND ${parentFilter}`,
      parentSubnetId ? [blockId, parentSubnetId] : [blockId]
    );

    for (const sibling of siblings) {
      if (doSubnetsOverlap(cidr, sibling.cidr)) {
        throw new BadRequestException(
          `Subnet ${cidr} overlaps with existing subnet ${sibling.cidr}`
        );
      }
    }

    const result = await this.dataSource.query(
      `INSERT INTO subnets (
        block_id, parent_subnet_id, name, cidr, domain_id, vlan_id, service_type, owner_id,
        ip_range_type, service_end_if, gateway_end_if, vlan_type, connected_elements,
        request_date, requester_name, requester_department, spoc
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) RETURNING *`,
      [
        blockId, parentSubnetId, name, cidr, domainId || null, vlanId || null, serviceType || null, ownerId || null,
        ipRangeType || null, serviceEndIf || null, gatewayEndIf || null, vlanType || null, connectedElements || null,
        requestDate ? new Date(requestDate) : null, requesterName || null, requesterDepartment || null, spoc || null
      ]
    );
    return result[0];
  }

  async getSubnets() {
    return this.dataSource.query(`SELECT * FROM subnets ORDER BY created_at DESC`);
  }

  async getDomains() {
    return this.dataSource.query(`SELECT * FROM network_domains ORDER BY name ASC`);
  }

  async createDomain(name: string, vrfName?: string, description?: string) {
    const result = await this.dataSource.query(
      `INSERT INTO network_domains (name, vrf_name, description) VALUES ($1, $2, $3) RETURNING *`,
      [name, vrfName || null, description || null]
    );
    return result[0];
  }

  async getVlans() {
    return this.dataSource.query(`SELECT * FROM vlans ORDER BY vlan_id ASC`);
  }

  async createVlan(vlanId: number, name: string, siteId?: string, domainId?: string, description?: string) {
    const result = await this.dataSource.query(
      `INSERT INTO vlans (vlan_id, name, site_id, domain_id, description) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [vlanId, name, siteId || null, domainId || null, description || null]
    );
    return result[0];
  }

  async getSites() {
    return this.dataSource.query(`SELECT * FROM sites ORDER BY name ASC`);
  }

  async createSite(name: string, region?: string, siteCode?: string) {
    const result = await this.dataSource.query(
      `INSERT INTO sites (name, region, site_code) VALUES ($1, $2, $3) RETURNING *`,
      [name, region || null, siteCode || null]
    );
    return result[0];
  }

  async getDevices() {
    return this.dataSource.query(`SELECT * FROM devices ORDER BY hostname ASC`);
  }

  async createDevice(hostname: string, role?: string, siteId?: string, managementIp?: string) {
    const result = await this.dataSource.query(
      `INSERT INTO devices (hostname, role, site_id, management_ip) VALUES ($1, $2, $3, $4) RETURNING *`,
      [hostname, role || null, siteId || null, managementIp || null]
    );
    return result[0];
  }

  async deleteBlock(id: string) {
    await this.dataSource.query(`DELETE FROM ip_blocks WHERE id = $1`, [id]);
    return { success: true };
  }

  async deleteSubnet(id: string) {
    await this.dataSource.query(`DELETE FROM subnets WHERE id = $1`, [id]);
    return { success: true };
  }

  async allocateIp(subnetId: string, ipAddress: string, metadata: any, deviceId?: string, isGateway?: boolean) {
    // Fetch the parent subnet to get its CIDR
    const subnetRows = await this.dataSource.query(
      `SELECT cidr FROM subnets WHERE id = $1`,
      [subnetId]
    );
    if (!subnetRows.length) {
      throw new BadRequestException('Subnet not found');
    }
    const subnetCidr: string = subnetRows[0].cidr;

    // Validate IP is a usable host address (excludes network, broadcast, and out-of-range)
    if (!isHostAddress(ipAddress, subnetCidr)) {
      throw new BadRequestException(
        `IP ${ipAddress} is not a valid host address in subnet ${subnetCidr}`
      );
    }

    // Check for duplicate IP within this subnet
    const existing = await this.dataSource.query(
      `SELECT id FROM ip_addresses WHERE subnet_id = $1 AND ip_address = $2 AND status = 'ALLOCATED'`,
      [subnetId, ipAddress]
    );
    if (existing.length > 0) {
      throw new BadRequestException(`IP ${ipAddress} is already allocated in this subnet`);
    }

    const result = await this.dataSource.query(
      `INSERT INTO ip_addresses (subnet_id, ip_address, status, metadata, device_id, is_gateway) VALUES ($1, $2, 'ALLOCATED', $3, $4, $5) RETURNING *`,
      [subnetId, ipAddress, metadata, deviceId || null, isGateway || false]
    );
    return result[0];
  }

  async releaseIp(id: string) {
    await this.dataSource.query(
      `UPDATE ip_addresses SET status = 'AVAILABLE', metadata = '{}'::jsonb WHERE id = $1`,
      [id]
    );
    return { success: true };
  }
}
