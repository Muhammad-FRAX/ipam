import { Controller, Get, Post, Body } from '@nestjs/common';
import { ValidationService } from './validation.service';

@Controller('validation')
export class ValidationController {
  constructor(private readonly service: ValidationService) {}

  @Get('health')
  async health() {
    return this.service.getHealth();
  }

  @Post('cidr')
  async validateCidr(@Body() body: { cidr: string }) {
    return this.service.validateCidr(body.cidr);
  }

  @Post('overlap')
  async validateOverlap(@Body() body: { cidr: string }) {
    return this.service.validateOverlap(body.cidr);
  }

  @Post('duplicate')
  async validateDuplicateIp(@Body() body: { ipAddress: string, subnetId: string }) {
    return this.service.validateDuplicateIp(body.ipAddress, body.subnetId);
  }
}
