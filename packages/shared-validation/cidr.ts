export interface CidrRange {
  network: number;
  broadcast: number;
  prefix: number;
  mask: number;
}

const ipToLong = (ip: string): number => {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    throw new Error(`Invalid IP: ${ip}`);
  }
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
};

export function parseCidr(cidr: string): CidrRange {
  const [ip, prefixStr] = cidr.split('/');
  if (!ip || prefixStr === undefined) throw new Error(`Invalid CIDR: ${cidr}`);
  const prefix = parseInt(prefixStr, 10);
  if (isNaN(prefix) || prefix < 0 || prefix > 32) throw new Error(`Invalid prefix: ${prefixStr}`);
  const ipLong = ipToLong(ip);
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  const network = (ipLong & mask) >>> 0;
  const broadcast = (network | (~mask >>> 0)) >>> 0;
  return { network, broadcast, prefix, mask };
}

export function isSubnetContained(child: string, parent: string): boolean {
  const c = parseCidr(child);
  const p = parseCidr(parent);
  return c.prefix >= p.prefix && c.network >= p.network && c.broadcast <= p.broadcast;
}

export function doSubnetsOverlap(a: string, b: string): boolean {
  const A = parseCidr(a);
  const B = parseCidr(b);
  return !(A.broadcast < B.network || A.network > B.broadcast);
}

export function isHostAddress(ip: string, cidr: string): boolean {
  const range = parseCidr(cidr);
  const ipLong = ipToLong(ip);
  if (ipLong < range.network || ipLong > range.broadcast) return false;
  // /31 and /32 are point-to-point or single-host — all addresses usable
  if (range.prefix >= 31) return true;
  return ipLong !== range.network && ipLong !== range.broadcast;
}
