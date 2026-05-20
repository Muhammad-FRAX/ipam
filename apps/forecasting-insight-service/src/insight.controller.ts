import { Controller, Get } from '@nestjs/common';
import { InsightService } from './insight.service';

@Controller('insight')
export class InsightController {
  constructor(private readonly service: InsightService) {}

  @Get('health')
  async health() { return this.service.getHealth(); }

  @Get('dashboard/metrics')
  async getDashboardMetrics() {
    return this.service.getDashboardMetrics();
  }

  @Get('dashboard/risks')
  async getRiskPools() {
    return this.service.getRiskPools();
  }
}
