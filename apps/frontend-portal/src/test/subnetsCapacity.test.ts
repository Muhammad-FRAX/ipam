/**
 * Tests for the subnet capacity calculation logic from Subnets.tsx.
 * Also verifies the tree-building logic that groups subnets by parent block.
 */
import { describe, it, expect } from 'vitest';

// Mirror of the subnetCapacity function from Subnets.tsx
function subnetCapacity(cidr: string): number {
  const prefix = parseInt(cidr?.split('/')[1] ?? '32', 10);
  if (isNaN(prefix)) return 0;
  if (prefix >= 31) return Math.pow(2, 32 - prefix);
  return Math.pow(2, 32 - prefix) - 2;
}

// Build a tree of blocks → subnets (mirrors Subnets.tsx rendering logic)
interface Block { id: string; cidr: string; name: string }
interface Subnet { id: string; block_id: string; parent_subnet_id: string | null; name: string; cidr: string }

function buildTree(blocks: Block[], subnets: Subnet[]) {
  return blocks.map((block) => ({
    ...block,
    subnets: subnets.filter((s) => s.block_id === block.id && s.parent_subnet_id === null),
    children: (subnet: Subnet) =>
      subnets.filter((s) => s.parent_subnet_id === subnet.id),
  }));
}

describe('subnetCapacity', () => {
  it('/24 → 254 usable addresses', () => {
    expect(subnetCapacity('10.0.0.0/24')).toBe(254);
  });
  it('/25 → 126 usable addresses', () => {
    expect(subnetCapacity('10.0.0.0/25')).toBe(126);
  });
  it('/30 → 2 usable addresses', () => {
    expect(subnetCapacity('10.0.0.0/30')).toBe(2);
  });
  it('/31 → 2 (point-to-point, both usable)', () => {
    expect(subnetCapacity('10.0.0.0/31')).toBe(2);
  });
  it('/32 → 1 (host route)', () => {
    expect(subnetCapacity('10.0.0.0/32')).toBe(1);
  });
  it('/8 → 16777214 usable addresses', () => {
    expect(subnetCapacity('10.0.0.0/8')).toBe(16777214);
  });
});

describe('subnet tree structure', () => {
  const blocks: Block[] = [
    { id: 'block-1', cidr: '10.0.0.0/8', name: 'Block A' },
    { id: 'block-2', cidr: '192.168.0.0/16', name: 'Block B' },
  ];

  const subnets: Subnet[] = [
    { id: 'sn-1', block_id: 'block-1', parent_subnet_id: null, name: 'LAN-1', cidr: '10.1.0.0/24' },
    { id: 'sn-2', block_id: 'block-1', parent_subnet_id: null, name: 'LAN-2', cidr: '10.2.0.0/24' },
    { id: 'sn-3', block_id: 'block-1', parent_subnet_id: 'sn-1', name: 'LAN-1-sub', cidr: '10.1.1.0/25' },
    { id: 'sn-4', block_id: 'block-2', parent_subnet_id: null, name: 'DMZ', cidr: '192.168.1.0/24' },
  ];

  it('assigns top-level subnets to the correct block', () => {
    const tree = buildTree(blocks, subnets);

    const blockA = tree.find((b) => b.id === 'block-1')!;
    const blockB = tree.find((b) => b.id === 'block-2')!;

    expect(blockA.subnets).toHaveLength(2);
    expect(blockA.subnets.map((s) => s.name)).toContain('LAN-1');
    expect(blockA.subnets.map((s) => s.name)).toContain('LAN-2');

    expect(blockB.subnets).toHaveLength(1);
    expect(blockB.subnets[0].name).toBe('DMZ');
  });

  it('resolves child subnets nested under a parent subnet', () => {
    const tree = buildTree(blocks, subnets);
    const blockA = tree.find((b) => b.id === 'block-1')!;
    const lan1 = blockA.subnets.find((s) => s.id === 'sn-1')!;

    const children = blockA.children(lan1);
    expect(children).toHaveLength(1);
    expect(children[0].name).toBe('LAN-1-sub');
  });

  it('top-level subnets have no parent_subnet_id', () => {
    const tree = buildTree(blocks, subnets);
    for (const block of tree) {
      for (const subnet of block.subnets) {
        expect(subnet.parent_subnet_id).toBeNull();
      }
    }
  });
});
