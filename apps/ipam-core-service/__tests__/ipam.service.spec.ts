import { BadRequestException } from '@nestjs/common';
import { IpamService } from '../src/ipam.service';

// Mock shared-audit so audit writes don't affect test assertions
jest.mock('@ipam/shared-audit', () => ({
  logAudit: jest.fn().mockResolvedValue(undefined),
}));

interface MockQueryRunner {
  connect: jest.Mock;
  startTransaction: jest.Mock;
  query: jest.Mock;
  commitTransaction: jest.Mock;
  rollbackTransaction: jest.Mock;
  release: jest.Mock;
}

function makeQueryRunner(): MockQueryRunner {
  return {
    connect: jest.fn().mockResolvedValue(undefined),
    startTransaction: jest.fn().mockResolvedValue(undefined),
    query: jest.fn(),
    commitTransaction: jest.fn().mockResolvedValue(undefined),
    rollbackTransaction: jest.fn().mockResolvedValue(undefined),
    release: jest.fn().mockResolvedValue(undefined),
  };
}

function makeDataSource(queryImpl?: jest.Mock, queryRunnerImpl?: MockQueryRunner) {
  const qr = queryRunnerImpl ?? makeQueryRunner();
  return {
    query: queryImpl ?? jest.fn(),
    createQueryRunner: jest.fn().mockReturnValue(qr),
    _queryRunner: qr,
  };
}

const BLOCK_ID = 'block-uuid-1';
const SUBNET_ID = 'subnet-uuid-1';
const BLOCK_CIDR = '10.0.0.0/8';
const SUBNET_CIDR = '10.1.0.0/24';

describe('IpamService — createSubnet invariants', () => {
  let service: IpamService;
  let mockQuery: jest.Mock;
  let dataSource: ReturnType<typeof makeDataSource>;

  beforeEach(() => {
    mockQuery = jest.fn();
    dataSource = makeDataSource(mockQuery);
    service = new IpamService(dataSource as any);
  });

  it('BL2: rejects subnet whose CIDR is not contained in parent block', async () => {
    // Block returns 10.0.0.0/8, new subnet is 8.8.8.0/24 (outside)
    mockQuery.mockResolvedValueOnce([{ cidr: BLOCK_CIDR }]);

    await expect(
      service.createSubnet(BLOCK_ID, null, 'bad-subnet', '8.8.8.0/24', undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, 'user-1')
    ).rejects.toThrow('not contained in parent block');
  });

  it('BL3: rejects subnet that overlaps an existing sibling', async () => {
    // Block is 10.0.0.0/8; existing sibling is 10.0.0.0/24; new subnet is 10.0.0.0/25 (overlaps)
    mockQuery
      .mockResolvedValueOnce([{ cidr: BLOCK_CIDR }])
      .mockResolvedValueOnce([{ cidr: '10.0.0.0/24' }]);

    await expect(
      service.createSubnet(BLOCK_ID, null, 'overlap-subnet', '10.0.0.0/25', undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, 'user-1')
    ).rejects.toThrow('overlaps with existing subnet');
  });

  it('BL3: accepts non-overlapping adjacent siblings', async () => {
    mockQuery
      .mockResolvedValueOnce([{ cidr: BLOCK_CIDR }])           // block lookup
      .mockResolvedValueOnce([{ cidr: '10.0.0.0/25' }])        // sibling — adjacent, not overlapping
      .mockResolvedValueOnce([{ id: SUBNET_ID, cidr: '10.0.0.128/25', block_id: BLOCK_ID }]) // INSERT returns row
      .mockResolvedValue([]);                                   // audit log

    const result = await service.createSubnet(
      BLOCK_ID, null, 'adj-subnet', '10.0.0.128/25',
      undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined,
      undefined, undefined, undefined, undefined, undefined, 'user-1'
    );
    expect(result.id).toBe(SUBNET_ID);
  });
});

describe('IpamService — allocateIp invariants', () => {
  let service: IpamService;
  let dataSource: ReturnType<typeof makeDataSource>;
  let qr: MockQueryRunner;

  function setupQr(subnetCidr: string, existingIps: any[] = []) {
    qr = makeQueryRunner();
    qr.query
      .mockResolvedValueOnce([{ cidr: subnetCidr }])  // SELECT cidr FOR UPDATE
      .mockResolvedValueOnce(existingIps)              // SELECT existing allocation
      .mockResolvedValueOnce([{ id: 'new-ip-id', ip_address: '10.0.0.5', subnet_id: SUBNET_ID }]); // INSERT
    dataSource = makeDataSource(jest.fn().mockResolvedValue([]), qr);
    service = new IpamService(dataSource as any);
  }

  it('BL6: rejects network address for /24', async () => {
    setupQr('10.0.0.0/24');
    await expect(
      service.allocateIp(SUBNET_ID, '10.0.0.0', {}, undefined, false, 'user-1')
    ).rejects.toThrow(BadRequestException);
  });

  it('BL6: rejects broadcast address for /24', async () => {
    setupQr('10.0.0.0/24');
    await expect(
      service.allocateIp(SUBNET_ID, '10.0.0.255', {}, undefined, false, 'user-1')
    ).rejects.toThrow(BadRequestException);
  });

  it('BL6: rejects IP outside subnet', async () => {
    setupQr('10.0.0.0/24');
    await expect(
      service.allocateIp(SUBNET_ID, '192.168.1.1', {}, undefined, false, 'user-1')
    ).rejects.toThrow(BadRequestException);
  });

  it('BL6: accepts valid host in /24', async () => {
    setupQr('10.0.0.0/24');
    const result = await service.allocateIp(SUBNET_ID, '10.0.0.5', {}, undefined, false, 'user-1');
    expect(result.id).toBe('new-ip-id');
  });

  it('BL6: accepts both addresses in /31 (point-to-point)', async () => {
    // .0 address in /31
    setupQr('10.0.0.0/31');
    const r1 = await service.allocateIp(SUBNET_ID, '10.0.0.0', {}, undefined, false, 'user-1');
    expect(r1.id).toBe('new-ip-id');

    // .1 address in /31
    setupQr('10.0.0.0/31');
    qr.query
      .mockReset()
      .mockResolvedValueOnce([{ cidr: '10.0.0.0/31' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'new-ip-id-2', ip_address: '10.0.0.1', subnet_id: SUBNET_ID }]);
    const r2 = await service.allocateIp(SUBNET_ID, '10.0.0.1', {}, undefined, false, 'user-1');
    expect(r2.id).toBe('new-ip-id-2');
  });

  it('A2: rejects duplicate IP allocation (already allocated)', async () => {
    setupQr('10.0.0.0/24', [{ id: 'existing-ip' }]); // existing IP found
    await expect(
      service.allocateIp(SUBNET_ID, '10.0.0.5', {}, undefined, false, 'user-1')
    ).rejects.toThrow('already allocated');
  });

  it('rejects if subnet is not found', async () => {
    qr = makeQueryRunner();
    qr.query.mockResolvedValueOnce([]); // empty — no subnet found
    dataSource = makeDataSource(jest.fn().mockResolvedValue([]), qr);
    service = new IpamService(dataSource as any);

    await expect(
      service.allocateIp(SUBNET_ID, '10.0.0.5', {}, undefined, false, 'user-1')
    ).rejects.toThrow(BadRequestException);
  });
});
