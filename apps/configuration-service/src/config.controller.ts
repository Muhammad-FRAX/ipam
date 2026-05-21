import { Controller, Get, Post, Body, Put, Param, Req } from '@nestjs/common';
import { ConfigService } from './config.service';

@Controller('config')
export class ConfigController {
  constructor(private readonly service: ConfigService) {}

  @Get('health')
  async health() { return this.service.getHealth(); }

  @Get()
  async getConfigs() {
    return this.service.getConfigs();
  }

  @Put(':key')
  async setConfig(@Param('key') key: string, @Body() body: { value: any }, @Req() req: any) {
    const userId: string | null = req.headers['x-user-id'] || null;
    return this.service.setConfig(key, body.value, userId);
  }
}
