import { Injectable, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { isSubnetContained, doSubnetsOverlap, isHostAddress } from '@ipam/shared-validation';
import { logAudit } from '@ipam/shared-audit';

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

  async createBlock(name: string, cidr: string, domainId?: string, ownerId?: string, userId?: string | null) {
    const result = await this.dataSource.query(
      `INSERT INTO ip_blocks (name, cidr, domain_id, owner_id) VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, cidr, domainId || null, ownerId || null]
    );
    const block = result[0];
    await logAudit(this.dataSource, {
      action: 'BLOCK_CREATED',
      entity: 'ip_blocks',
      entityId: block.id,
      userId: userId ?? null,
      details: { name, cidr },
    });
    return block;
  }

  async getBlocks(page = 1, pageSize = 50) {
    const offset = (page - 1) * pageSize;
    const [rows, countRows] = await Promise.all([
      this.dataSource.query(
        `SELECT * FROM ip_blocks WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
        [pageSize, offset]
      ),
      this.dataSource.query(`SELECT COUNT(*) FROM ip_blocks WHERE deleted_at IS NULL`),
    ]);
    return { items: rows, total: parseInt(countRows[0].count, 10), page, pageSize };
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
    spoc?: string,
    userId?: string | null,
  ) {
    // Fetch the parent block CIDR to validate containment
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

    // Fetch sibling subnets to check for overlaps
    const parentFilter = parentSubnetId
      ? `parent_subnet_id = $2`
      : `parent_subnet_id IS NULL`;
    const siblings = await this.dataSource.query(
      `SELECT cidr FROM subnets WHERE block_id = $1 AND ${parentFilter} AND deleted_at IS NULL`,
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
        requestDate ? new Date(requestDate) : null, requesterName || null, requesterDepartment || null, spoc || null,
      ]
    );
    const subnet = result[0];
    await logAudit(this.dataSource, {
      action: 'SUBNET_CREATED',
      entity: 'subnets',
      entityId: subnet.id,
      userId: userId ?? null,
      details: { name, cidr, blockId },
    });
    return subnet;
  }

  async getSubnets(page = 1, pageSize = 50) {
    const offset = (page - 1) * pageSize;
    const [rows, countRows] = await Promise.all([
      this.dataSource.query(
        `SELECT * FROM subnets WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
        [pageSize, offset]
      ),
      this.dataSource.query(`SELECT COUNT(*) FROM subnets WHERE deleted_at IS NULL`),
    ]);
    return { items: rows, total: parseInt(countRows[0].count, 10), page, pageSize };
  }

  async getDomains(page = 1, pageSize = 100) {
    const offset = (page - 1) * pageSize;
    const [rows, countRows] = await Promise.all([
      this.dataSource.query(
        `SELECT * FROM network_domains ORDER BY name ASC LIMIT $1 OFFSET $2`,
        [pageSize, offset]
      ),
      this.dataSource.query(`SELECT COUNT(*) FROM network_domains`),
    ]);
    return { items: rows, total: parseInt(countRows[0].count, 10), page, pageSize };
  }

  async createDomain(name: string, vrfName?: string, description?: string, userId?: string | null) {
    const result = await this.dataSource.query(
      `INSERT INTO network_domains (name, vrf_name, description) VALUES ($1, $2, $3) RETURNING *`,
      [name, vrfName || null, description || null]
    );
    const domain = result[0];
    await logAudit(this.dataSource, {
      action: 'DOMAIN_CREATED',
      entity: 'network_domains',
      entityId: domain.id,
      userId: userId ?? null,
      details: { name },
    });
    return domain;
  }

  async getVlans(page = 1, pageSize = 100) {
    const offset = (page - 1) * pageSize;
    const [rows, countRows] = await Promise.all([
      this.dataSource.query(
        `SELECT * FROM vlans ORDER BY vlan_id ASC LIMIT $1 OFFSET $2`,
        [pageSize, offset]
      ),
      this.dataSource.query(`SELECT COUNT(*) FROM vlans`),
    ]);
    return { items: rows, total: parseInt(countRows[0].count, 10), page, pageSize };
  }

  async createVlan(vlanId: number, name: string, siteId?: string, domainId?: string, description?: string, userId?: string | null) {
    const result = await this.dataSource.query(
      `INSERT INTO vlans (vlan_id, name, site_id, domain_id, description) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [vlanId, name, siteId || null, domainId || null, description || null]
    );
    const vlan = result[0];
    await logAudit(this.dataSource, {
      action: 'VLAN_CREATED',
      entity: 'vlans',
      entityId: vlan.id,
      userId: userId ?? null,
      details: { vlanId, name },
    });
    return vlan;
  }

  async getSites(page = 1, pageSize = 100) {
    const offset = (page - 1) * pageSize;
    const [rows, countRows] = await Promise.all([
      this.dataSource.query(
        `SELECT * FROM sites ORDER BY name ASC LIMIT $1 OFFSET $2`,
        [pageSize, offset]
      ),
      this.dataSource.query(`SELECT COUNT(*) FROM sites`),
    ]);
    return { items: rows, total: parseInt(countRows[0].count, 10), page, pageSize };
  }

  async createSite(name: string, region?: string, siteCode?: string, userId?: string | null) {
    const result = await this.dataSource.query(
      `INSERT INTO sites (name, region, site_code) VALUES ($1, $2, $3) RETURNING *`,
      [name, region || null, siteCode || null]
    );
    const site = result[0];
    await logAudit(this.dataSource, {
      action: 'SITE_CREATED',
      entity: 'sites',
      entityId: site.id,
      userId: userId ?? null,
      details: { name },
    });
    return site;
  }

  async getDevices(page = 1, pageSize = 100) {
    const offset = (page - 1) * pageSize;
    const [rows, countRows] = await Promise.all([
      this.dataSource.query(
        `SELECT * FROM devices ORDER BY hostname ASC LIMIT $1 OFFSET $2`,
        [pageSize, offset]
      ),
      this.dataSource.query(`SELECT COUNT(*) FROM devices`),
    ]);
    return { items: rows, total: parseInt(countRows[0].count, 10), page, pageSize };
  }

  async createDevice(hostname: string, role?: string, siteId?: string, managementIp?: string, userId?: string | null) {
    const result = await this.dataSource.query(
      `INSERT INTO devices (hostname, role, site_id, management_ip) VALUES ($1, $2, $3, $4) RETURNING *`,
      [hostname, role || null, siteId || null, managementIp || null]
    );
    const device = result[0];
    await logAudit(this.dataSource, {
      action: 'DEVICE_CREATED',
      entity: 'devices',
      entityId: device.id,
      userId: userId ?? null,
      details: { hostname },
    });
    return device;
  }

  async deleteBlock(id: string, userId?: string | null) {
    await this.dataSource.query(
      `UPDATE ip_blocks SET deleted_at = NOW() WHERE id = $1`,
      [id]
    );
    await logAudit(this.dataSource, {
      action: 'BLOCK_DELETED',
      entity: 'ip_blocks',
      entityId: id,
      userId: userId ?? null,
      details: {},
    });
    return { success: true };
  }

  async deleteSubnet(id: string, userId?: string | null) {
    await this.dataSource.query(
      `UPDATE subnets SET deleted_at = NOW() WHERE id = $1`,
      [id]
    );
    await logAudit(this.dataSource, {
      action: 'SUBNET_DELETED',
      entity: 'subnets',
      entityId: id,
      userId: userId ?? null,
      details: {},
    });
    return { success: true };
  }

  async allocateIp(subnetId: string, ipAddress: string, metadata: any, deviceId?: string, isGateway?: boolean, userId?: string | null) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      // Lock the subnet row to serialize concurrent allocations for the same subnet
      const subnetRows = await queryRunner.query(
        `SELECT cidr FROM subnets WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`,
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

      // Check for duplicate IP within this subnet (inside the lock — race-safe)
      const existing = await queryRunner.query(
        `SELECT id FROM ip_addresses WHERE subnet_id = $1 AND ip_address = $2 AND status = 'ALLOCATED'`,
        [subnetId, ipAddress]
      );
      if (existing.length > 0) {
        throw new BadRequestException(`IP ${ipAddress} is already allocated in this subnet`);
      }

      const result = await queryRunner.query(
        `INSERT INTO ip_addresses (subnet_id, ip_address, status, metadata, device_id, is_gateway) VALUES ($1, $2, 'ALLOCATED', $3, $4, $5) RETURNING *`,
        [subnetId, ipAddress, metadata, deviceId || null, isGateway || false]
      );
      await queryRunner.commitTransaction();
      const ip = result[0];

      await logAudit(this.dataSource, {
        action: 'IP_ALLOCATED',
        entity: 'ip_addresses',
        entityId: ip.id,
        userId: userId ?? null,
        details: { ipAddress, subnetId },
      });
      return ip;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async releaseIp(id: string, userId?: string | null) {
    await this.dataSource.query(
      `UPDATE ip_addresses SET status = 'AVAILABLE', metadata = '{}'::jsonb WHERE id = $1`,
      [id]
    );
    await logAudit(this.dataSource, {
      action: 'IP_RELEASED',
      entity: 'ip_addresses',
      entityId: id,
      userId: userId ?? null,
      details: {},
    });
    return { success: true };
  }
}
