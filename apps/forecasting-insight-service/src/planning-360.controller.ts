import { Controller, Get, Param } from '@nestjs/common';
import { Planning360Service } from './planning-360.service';

@Controller('insight/planning-360')
export class Planning360Controller {
  constructor(private readonly service: Planning360Service) {}

  @Get('subnet/:id')
  async getSubnet(@Param('id') id: string) {
    return this.service.getSubnet360(id);
  }

  @Get('pool/:id')
  async getPool(@Param('id') id: string) {
    return this.service.getPool360(id);
  }

  @Get('request/:id')
  async getRequest(@Param('id') id: string) {
    return this.service.getRequest360(id);
  }

  @Get('global')
  async getGlobalInsights() {
    return this.service.getGlobalInsights();
  }
}
