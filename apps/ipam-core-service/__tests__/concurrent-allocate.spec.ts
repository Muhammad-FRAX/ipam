/**
 * Concurrent IP allocation test.
 * Requires a live PostgreSQL instance. Set SKIP_INTEGRATION=true to skip in CI
 * environments without Docker.
 *
 * To run locally:
 *   docker run -e POSTGRES_USER=ipam_user -e POSTGRES_PASSWORD=ipam_password \
 *     -e POSTGRES_DB=ipam_db -p 5432:5432 postgres:15
 *   npm test --workspace=apps/ipam-core-service
 */

const skipIntegration = process.env.SKIP_INTEGRATION === 'true';
const describeOrSkip = skipIntegration ? describe.skip : describe;

import { DataSource } from 'typeorm';
import { IpamService } from '../src/ipam.service';
import { BadRequestException } from '@nestjs/common';

describeOrSkip('allocateIp — concurrency', () => {
  let dataSource: DataSource;
  let service: IpamService;
  let subnetId: string;
  let blockId: string;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 5432,
      username: process.env.DB_USER || 'ipam_user',
      password: process.env.DB_PASSWORD || 'ipam_password',
      database: process.env.DB_NAME || 'ipam_db',
      synchronize: false,
    });
    await dataSource.initialize();
    service = new IpamService(dataSource);

    // Seed: create a block and subnet for the test
    const block = await dataSource.query(
      `INSERT INTO ip_blocks (name, cidr) VALUES ('concurrent-test-block', '10.99.0.0/16') RETURNING id`
    );
    blockId = block[0].id;
    const subnet = await dataSource.query(
      `INSERT INTO subnets (block_id, name, cidr) VALUES ($1, 'concurrent-test-subnet', '10.99.1.0/24') RETURNING id`,
      [blockId]
    );
    subnetId = subnet[0].id;
  });

  afterAll(async () => {
    // Cleanup seed data
    await dataSource.query(`DELETE FROM ip_addresses WHERE subnet_id = $1`, [subnetId]);
    await dataSource.query(`DELETE FROM subnets WHERE id = $1`, [subnetId]);
    await dataSource.query(`DELETE FROM ip_blocks WHERE id = $1`, [blockId]);
    await dataSource.destroy();
  });

  it('allows exactly 1 of 10 concurrent allocations for the same IP to succeed', async () => {
    const ip = '10.99.1.5';
    const results = await Promise.allSettled(
      Array.from({ length: 10 }, () =>
        service.allocateIp(subnetId, ip, {}, undefined, false)
      )
    );

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(9);

    // All failures should be BadRequestException (duplicate or constraint error), not 500s
    for (const r of rejected) {
      expect((r as PromiseRejectedResult).reason).toBeInstanceOf(BadRequestException);
    }
  }, 30000);
});
