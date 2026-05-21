/**
 * Integration tests for the IPAM core service.
 * Uses testcontainers to spin up a real PostgreSQL instance and applies the
 * project's init SQL migrations before each test suite. Tests run against the
 * service layer with a real DataSource, validating end-to-end database behaviour.
 *
 * Run with: npm run test:integration --workspace=apps/ipam-core-service
 * (requires Docker daemon running)
 */

import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { IpamService } from '../../src/ipam.service';
import { BadRequestException } from '@nestjs/common';

const skipIntegration = process.env.SKIP_INTEGRATION === 'true';
const describeOrSkip = skipIntegration ? describe.skip : describe;

const MIGRATIONS_DIR = path.resolve(__dirname, '../../../../database/init');

async function applyMigrations(ds: DataSource): Promise<void> {
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  // Use the underlying driver connection directly to support multi-statement SQL files
  const queryRunner = ds.createQueryRunner();
  await queryRunner.connect();
  try {
    for (const file of files) {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      await queryRunner.query(sql);
    }
  } finally {
    await queryRunner.release();
  }
}

describeOrSkip('IpamService integration (testcontainers)', () => {
  let pgContainer: StartedPostgreSqlContainer;
  let dataSource: DataSource;
  let service: IpamService;

  beforeAll(async () => {
    pgContainer = await new PostgreSqlContainer('postgres:15')
      .withDatabase('ipam_db')
      .withUsername('ipam_user')
      .withPassword('ipam_password')
      .start();

    dataSource = new DataSource({
      type: 'postgres',
      host: pgContainer.getHost(),
      port: pgContainer.getPort(),
      username: pgContainer.getUsername(),
      password: pgContainer.getPassword(),
      database: pgContainer.getDatabase(),
      synchronize: false,
    });
    await dataSource.initialize();
    await applyMigrations(dataSource);

    service = new IpamService(dataSource);
  }, 120_000);

  afterAll(async () => {
    await dataSource.destroy();
    await pgContainer.stop();
  }, 30_000);

  describe('Block creation', () => {
    it('creates a root IP block', async () => {
      const block = await service.createBlock('Test Block', '10.0.0.0/8');
      expect(block.id).toBeTruthy();
      expect(block.name).toBe('Test Block');
    });
  });

  describe('Subnet creation', () => {
    let blockId: string;

    beforeAll(async () => {
      const block = await service.createBlock('Subnet Test Block', '192.168.0.0/16');
      blockId = block.id;
    });

    it('creates a valid subnet inside the block', async () => {
      const subnet = await service.createSubnet(
        blockId, null, 'LAN', '192.168.1.0/24'
      );
      expect(subnet.id).toBeTruthy();
    });

    it('BL2: rejects subnet not contained in parent block', async () => {
      await expect(
        service.createSubnet(blockId, null, 'Bad Subnet', '10.0.0.0/24')
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.createSubnet(blockId, null, 'Bad Subnet', '10.0.0.0/24')
      ).rejects.toThrow('not contained in parent block');
    });

    it('BL3: rejects overlapping sibling subnet', async () => {
      await service.createSubnet(blockId, null, 'Subnet A', '192.168.2.0/24');

      await expect(
        service.createSubnet(blockId, null, 'Subnet Overlap', '192.168.2.0/25')
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.createSubnet(blockId, null, 'Subnet Overlap', '192.168.2.0/25')
      ).rejects.toThrow('overlaps with existing subnet');
    });

    it('BL3: accepts non-overlapping adjacent siblings', async () => {
      const a = await service.createSubnet(blockId, null, 'Half A', '192.168.10.0/25');
      const b = await service.createSubnet(blockId, null, 'Half B', '192.168.10.128/25');
      expect(a.id).toBeTruthy();
      expect(b.id).toBeTruthy();
    });
  });

  describe('IP allocation', () => {
    let subnetId: string;

    beforeAll(async () => {
      const block = await service.createBlock('IP Test Block', '172.16.0.0/12');
      const subnet = await service.createSubnet(
        block.id, null, 'IP Test Subnet', '172.16.1.0/24'
      );
      subnetId = subnet.id;
    });

    it('allocates a valid host IP', async () => {
      const ip = await service.allocateIp(subnetId, '172.16.1.5', {});
      expect(ip.ip_address).toBe('172.16.1.5');
    });

    it('BL6: rejects network address', async () => {
      await expect(
        service.allocateIp(subnetId, '172.16.1.0', {})
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.allocateIp(subnetId, '172.16.1.0', {})
      ).rejects.toThrow('not a valid host address');
    });

    it('BL6: rejects broadcast address', async () => {
      await expect(
        service.allocateIp(subnetId, '172.16.1.255', {})
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.allocateIp(subnetId, '172.16.1.255', {})
      ).rejects.toThrow('not a valid host address');
    });

    it('A2: rejects duplicate allocation for same IP', async () => {
      await service.allocateIp(subnetId, '172.16.1.10', {});

      await expect(
        service.allocateIp(subnetId, '172.16.1.10', {})
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.allocateIp(subnetId, '172.16.1.10', {})
      ).rejects.toThrow('already allocated');
    });

    it('BL6: accepts both addresses in a /31 (point-to-point)', async () => {
      const block = await service.createBlock('P2P Block', '10.255.0.0/24');
      const ptp = await service.createSubnet(block.id, null, 'P2P Link', '10.255.0.0/31');

      const a = await service.allocateIp(ptp.id, '10.255.0.0', {});
      const b = await service.allocateIp(ptp.id, '10.255.0.1', {});
      expect(a.ip_address).toBe('10.255.0.0');
      expect(b.ip_address).toBe('10.255.0.1');
    });
  });
});
