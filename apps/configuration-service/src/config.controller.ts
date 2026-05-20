import { Controller, Get, Post, Body, Put, Param } from '@nestjs/common';
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
  async setConfig(@Param('key') key: string, @Body() body: { value: any }) {
    return this.service.setConfig(key, body.value);
  }
}
