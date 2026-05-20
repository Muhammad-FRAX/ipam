export interface User {
  id: string;
  email: string;
  role: string;
}

export interface Site {
  id: string;
  siteCode: string;
  region?: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface Device {
  id: string;
  siteId: string;
  hostname: string;
  type?: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface NetworkDomain {
  id: string;
  name: string;
  description?: string;
}

export interface VLAN {
  id: string;
  domainId: string;
  vlanId: number;
  name?: string;
  description?: string;
}

export interface IPBlock {
  id: string;
  name: string;
  cidr: string;
  domainId?: string;
  ownerId?: string;
  status: 'ACTIVE' | 'RETIRED';
}

export interface Subnet {
  id: string;
  blockId: string;
  parentSubnetId?: string;
  domainId?: string;
  vlanId?: string;
  ownerId?: string;
  name: string;
  cidr: string;
  serviceType?: string;
  status: 'AVAILABLE' | 'RESERVED' | 'ALLOCATED';
}

export interface IPAddress {
  id: string;
  subnetId: string;
  ipAddress: string;
  deviceId?: string;
  isGateway?: boolean;
  status: 'AVAILABLE' | 'ALLOCATED' | 'RESERVED';
  metadata?: Record<string, any>;
}

export interface IPAllocationRequest {
  id: string;
  requestedCidr: string;
  status: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'ALLOCATED';
  metadata: Record<string, any>;
}
