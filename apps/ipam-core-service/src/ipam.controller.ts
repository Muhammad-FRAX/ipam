import { Controller, Get, Post, Body, Param, Put, Req, Query } from '@nestjs/common';
import { IpamService } from './ipam.service';

function isAdminUser(req: any): boolean {
  try {
    const roles: string[] = JSON.parse(req.headers['x-user-roles'] || '[]');
    return roles.includes('ADMIN');
  } catch {
    return false;
  }
}

@Controller('ipam')
export class IpamController {
  constructor(private readonly service: IpamService) {}

  @Get('health')
  async health() {
    return this.service.getHealth();
  }

  @Post('blocks')
  async createBlock(@Body() body: { name: string; cidr: string; domainId?: string; ownerId?: string }, @Req() req: any) {
    const userId: string | null = req.headers['x-user-id'] || null;
    return this.service.createBlock(body.name, body.cidr, body.domainId, body.ownerId, userId);
  }

  @Get('blocks')
  async getBlocks(@Query('page') page?: string, @Query('pageSize') pageSize?: string, @Req() req?: any) {
    const userId: string | null = req?.headers['x-user-id'] || null;
    const admin = isAdminUser(req);
    return this.service.getBlocks(page ? parseInt(page, 10) : 1, pageSize ? parseInt(pageSize, 10) : 50, userId, admin);
  }

  @Post('subnets')
  async createSubnet(@Body() body: any, @Req() req: any) {
    const userId: string | null = req.headers['x-user-id'] || null;
    return this.service.createSubnet(
      body.blockId, body.parentSubnetId || null, body.name, body.cidr, body.domainId, body.vlanId, body.serviceType, body.ownerId,
      body.ipRangeType, body.serviceEndIf, body.gatewayEndIf, body.vlanType, body.connectedElements, body.requestDate, body.requesterName, body.requesterDepartment, body.spoc,
      userId,
    );
  }

  @Get('subnets')
  async getSubnets(@Query('page') page?: string, @Query('pageSize') pageSize?: string, @Req() req?: any) {
    const userId: string | null = req?.headers['x-user-id'] || null;
    const admin = isAdminUser(req);
    return this.service.getSubnets(page ? parseInt(page, 10) : 1, pageSize ? parseInt(pageSize, 10) : 50, userId, admin);
  }

  @Get('domains')
  async getDomains(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.service.getDomains(page ? parseInt(page, 10) : 1, pageSize ? parseInt(pageSize, 10) : 100);
  }

  @Post('domains')
  async createDomain(@Body() body: { name: string; vrfName?: string; description?: string }, @Req() req: any) {
    const userId: string | null = req.headers['x-user-id'] || null;
    return this.service.createDomain(body.name, body.vrfName, body.description, userId);
  }

  @Get('vlans')
  async getVlans(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.service.getVlans(page ? parseInt(page, 10) : 1, pageSize ? parseInt(pageSize, 10) : 100);
  }

  @Post('vlans')
  async createVlan(@Body() body: { vlanId: number; name: string; siteId?: string; domainId?: string; description?: string }, @Req() req: any) {
    const userId: string | null = req.headers['x-user-id'] || null;
    return this.service.createVlan(body.vlanId, body.name, body.siteId, body.domainId, body.description, userId);
  }

  @Get('sites')
  async getSites(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.service.getSites(page ? parseInt(page, 10) : 1, pageSize ? parseInt(pageSize, 10) : 100);
  }

  @Post('sites')
  async createSite(@Body() body: { name: string; region?: string; siteCode?: string }, @Req() req: any) {
    const userId: string | null = req.headers['x-user-id'] || null;
    return this.service.createSite(body.name, body.region, body.siteCode, userId);
  }

  @Get('devices')
  async getDevices(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.service.getDevices(page ? parseInt(page, 10) : 1, pageSize ? parseInt(pageSize, 10) : 100);
  }

  @Post('devices')
  async createDevice(@Body() body: { hostname: string; role?: string; siteId?: string; managementIp?: string }, @Req() req: any) {
    const userId: string | null = req.headers['x-user-id'] || null;
    return this.service.createDevice(body.hostname, body.role, body.siteId, body.managementIp, userId);
  }

  @Post('blocks/:id/delete')
  async deleteBlock(@Param('id') id: string, @Req() req: any) {
    const userId: string | null = req.headers['x-user-id'] || null;
    return this.service.deleteBlock(id, userId);
  }

  @Post('subnets/:id/delete')
  async deleteSubnet(@Param('id') id: string, @Req() req: any) {
    const userId: string | null = req.headers['x-user-id'] || null;
    return this.service.deleteSubnet(id, userId);
  }

  @Post('ips')
  async allocateIp(@Body() body: { subnetId: string; ipAddress: string; metadata?: any; deviceId?: string; isGateway?: boolean }, @Req() req: any) {
    const userId: string | null = req.headers['x-user-id'] || null;
    return this.service.allocateIp(body.subnetId, body.ipAddress, body.metadata || {}, body.deviceId, body.isGateway, userId);
  }

  @Put('ips/:id/release')
  async releaseIp(@Param('id') id: string, @Req() req: any) {
    const userId: string | null = req.headers['x-user-id'] || null;
    return this.service.releaseIp(id, userId);
  }
}
