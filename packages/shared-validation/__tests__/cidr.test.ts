import { parseCidr, isSubnetContained, doSubnetsOverlap, isHostAddress } from '../cidr';

describe('parseCidr', () => {
  it('parses 10.0.0.0/24 correctly', () => {
    const r = parseCidr('10.0.0.0/24');
    expect(r.network).toBe(0x0A000000);
    expect(r.broadcast).toBe(0x0A0000FF);
    expect(r.prefix).toBe(24);
  });
  it('rejects garbage', () => {
    expect(() => parseCidr('not-a-cidr')).toThrow();
    expect(() => parseCidr('10.0.0.0/33')).toThrow();
  });
});

describe('isSubnetContained', () => {
  it('returns true for child inside parent', () => {
    expect(isSubnetContained('10.1.0.0/16', '10.0.0.0/8')).toBe(true);
  });
  it('returns false for child outside parent', () => {
    expect(isSubnetContained('8.8.8.0/24', '10.0.0.0/8')).toBe(false);
  });
  it('returns false for child larger than parent', () => {
    expect(isSubnetContained('10.0.0.0/8', '10.0.0.0/16')).toBe(false);
  });
});

describe('doSubnetsOverlap', () => {
  it('detects adjacent /25s as non-overlapping', () => {
    expect(doSubnetsOverlap('10.0.0.0/25', '10.0.0.128/25')).toBe(false);
  });
  it('detects identical ranges as overlapping', () => {
    expect(doSubnetsOverlap('10.0.0.0/24', '10.0.0.0/24')).toBe(true);
  });
  it('detects nested ranges as overlapping', () => {
    expect(doSubnetsOverlap('10.0.0.0/24', '10.0.0.128/25')).toBe(true);
  });
});

describe('isHostAddress', () => {
  it('excludes network address for /24', () => {
    expect(isHostAddress('10.0.0.0', '10.0.0.0/24')).toBe(false);
  });
  it('excludes broadcast address for /24', () => {
    expect(isHostAddress('10.0.0.255', '10.0.0.0/24')).toBe(false);
  });
  it('accepts middle address for /24', () => {
    expect(isHostAddress('10.0.0.5', '10.0.0.0/24')).toBe(true);
  });
  it('accepts both addresses for /31 (point-to-point)', () => {
    expect(isHostAddress('10.0.0.0', '10.0.0.0/31')).toBe(true);
    expect(isHostAddress('10.0.0.1', '10.0.0.0/31')).toBe(true);
  });
});
