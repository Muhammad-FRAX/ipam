/**
 * Tests for the CIDR calculator logic used in the Discovery page.
 * The getSubnetRange function is inline in Discovery.tsx; this test
 * reproduces the same logic here to lock in correctness for the key
 * cases mentioned in PLAN.md Task 7.4.
 */
import { describe, it, expect } from 'vitest';

function ipToLong(ip: string): number {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) return 0;
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

function longToIp(n: number): string {
  return `${(n >>> 24) & 255}.${(n >>> 16) & 255}.${(n >>> 8) & 255}.${n & 255}`;
}

function getSubnetRange(cidr: string) {
  const [ip, prefixStr] = cidr.split('/');
  if (!ip || !prefixStr) return null;
  const prefix = parseInt(prefixStr, 10);
  if (isNaN(prefix) || prefix < 0 || prefix > 32) return null;

  const ipLong = ipToLong(ip);
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  const network = (ipLong & mask) >>> 0;
  const broadcast = (network | (~mask >>> 0)) >>> 0;

  return {
    network,
    broadcast,
    networkIp: longToIp(network),
    broadcastIp: longToIp(broadcast),
    firstIp: prefix >= 31 ? longToIp(network) : longToIp(network + 1),
    lastIp: prefix >= 31 ? longToIp(broadcast) : longToIp(broadcast - 1),
    totalHosts: prefix === 32 ? 1 : prefix === 31 ? 2 : Math.max(0, broadcast - network - 1),
    prefix,
  };
}

describe('Discovery CIDR calculator — getSubnetRange', () => {
  it('/8 network: correct network, broadcast, and host count', () => {
    const r = getSubnetRange('10.0.0.0/8');
    expect(r).not.toBeNull();
    expect(r!.networkIp).toBe('10.0.0.0');
    expect(r!.broadcastIp).toBe('10.255.255.255');
    expect(r!.firstIp).toBe('10.0.0.1');
    expect(r!.lastIp).toBe('10.255.255.254');
    expect(r!.totalHosts).toBe(16777214);
    expect(r!.prefix).toBe(8);
  });

  it('/24 network: correct network, broadcast, and 254 usable hosts', () => {
    const r = getSubnetRange('192.168.1.0/24');
    expect(r).not.toBeNull();
    expect(r!.networkIp).toBe('192.168.1.0');
    expect(r!.broadcastIp).toBe('192.168.1.255');
    expect(r!.firstIp).toBe('192.168.1.1');
    expect(r!.lastIp).toBe('192.168.1.254');
    expect(r!.totalHosts).toBe(254);
  });

  it('/30 network: only 2 usable hosts (gateway links)', () => {
    const r = getSubnetRange('10.0.0.0/30');
    expect(r).not.toBeNull();
    expect(r!.networkIp).toBe('10.0.0.0');
    expect(r!.broadcastIp).toBe('10.0.0.3');
    expect(r!.firstIp).toBe('10.0.0.1');
    expect(r!.lastIp).toBe('10.0.0.2');
    expect(r!.totalHosts).toBe(2);
  });

  it('/31 point-to-point: 2 addresses, both usable (RFC 3021)', () => {
    const r = getSubnetRange('10.0.0.0/31');
    expect(r).not.toBeNull();
    expect(r!.networkIp).toBe('10.0.0.0');
    expect(r!.broadcastIp).toBe('10.0.0.1');
    expect(r!.firstIp).toBe('10.0.0.0');  // no excluded network address
    expect(r!.lastIp).toBe('10.0.0.1');   // no excluded broadcast
    expect(r!.totalHosts).toBe(2);
  });

  it('/32 loopback/host: single address', () => {
    const r = getSubnetRange('172.16.0.1/32');
    expect(r).not.toBeNull();
    expect(r!.networkIp).toBe('172.16.0.1');
    expect(r!.broadcastIp).toBe('172.16.0.1');
    expect(r!.totalHosts).toBe(1);
    expect(r!.prefix).toBe(32);
  });

  it('returns null for invalid CIDR format', () => {
    expect(getSubnetRange('not-valid')).toBeNull();
    expect(getSubnetRange('10.0.0.0/33')).toBeNull();
    expect(getSubnetRange('10.0.0.0')).toBeNull();
  });
});
