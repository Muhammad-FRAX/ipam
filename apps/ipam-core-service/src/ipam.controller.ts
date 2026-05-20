import { Controller, Get, Post, Body, Param, Put } from '@nestjs/common';
import { IpamService } from './ipam.service';

@Controller('ipam')
export class IpamController {
  constructor(private readonly service: IpamService) {}

  @Get('health')
  async health() {
    return this.service.getHealth();
  }

  @Post('blocks')
  async createBlock(@Body() body: { name: string; cidr: string; domainId?: string; ownerId?: string }) {
    return this.service.createBlock(body.name, body.cidr, body.domainId, body.ownerId);
  }

  @Get('blocks')
  async getBlocks() {
    return this.service.getBlocks();
  }

  @Post('subnets')
  async createSubnet(@Body() body: any) {
    return this.service.createSubnet(
      body.blockId, body.parentSubnetId || null, body.name, body.cidr, body.domainId, body.vlanId, body.serviceType, body.ownerId,
      body.ipRangeType, body.serviceEndIf, body.gatewayEndIf, body.vlanType, body.connectedElements, body.requestDate, body.requesterName, body.requesterDepartment, body.spoc
    );
  }

  @Get('subnets')
  async getSubnets() {
    return this.service.getSubnets();
  }

  @Get('domains')
  async getDomains() {
    return this.service.getDomains();
  }

  @Post('domains')
  async createDomain(@Body() body: { name: string; vrfName?: string; description?: string }) {
    return this.service.createDomain(body.name, body.vrfName, body.description);
  }

  @Get('vlans')
  async getVlans() {
    return this.service.getVlans();
  }

  @Post('vlans')
  async createVlan(@Body() body: { vlanId: number; name: string; siteId?: string; domainId?: string; description?: string }) {
    return this.service.createVlan(body.vlanId, body.name, body.siteId, body.domainId, body.description);
  }

  @Get('sites')
  async getSites() {
    return this.service.getSites();
  }

  @Post('sites')
  async createSite(@Body() body: { name: string; region?: string; siteCode?: string }) {
    return this.service.createSite(body.name, body.region, body.siteCode);
  }

  @Get('devices')
  async getDevices() {
    return this.service.getDevices();
  }

  @Post('devices')
  async createDevice(@Body() body: { hostname: string; role?: string; siteId?: string; managementIp?: string }) {
    return this.service.createDevice(body.hostname, body.role, body.siteId, body.managementIp);
  }

  @Post('blocks/:id/delete')
  async deleteBlock(@Param('id') id: string) {
    return this.service.deleteBlock(id);
  }

  @Post('subnets/:id/delete')
  async deleteSubnet(@Param('id') id: string) {
    return this.service.deleteSubnet(id);
  }

  @Post('ips')
  async allocateIp(@Body() body: { subnetId: string; ipAddress: string; metadata?: any; deviceId?: string; isGateway?: boolean }) {
    return this.service.allocateIp(body.subnetId, body.ipAddress, body.metadata || {}, body.deviceId, body.isGateway);
  }

  @Put('ips/:id/release')
  async releaseIp(@Param('id') id: string) {
    return this.service.releaseIp(id);
  }
}
