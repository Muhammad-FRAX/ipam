import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { AuditService } from './audit.service';

@Controller('audit')
export class AuditController {
  constructor(private readonly service: AuditService) {}

  @Get('health')
  async health() { return this.service.getHealth(); }

  @Post('record')
  async recordAction(@Body() body: { action: string; entity: string; entityId: string; userId: string; details: any }) {
    return this.service.recordAction(body.action, body.entity, body.entityId, body.userId, body.details);
  }

  @Get()
  async getLogs(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.service.getLogs(page ? parseInt(page, 10) : 1, pageSize ? parseInt(pageSize, 10) : 50);
  }
}
