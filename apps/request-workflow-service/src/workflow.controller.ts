import { Controller, Get, Post, Body, Param, Put } from '@nestjs/common';
import { WorkflowService } from './workflow.service';

@Controller('workflow')
export class WorkflowController {
  constructor(private readonly service: WorkflowService) {}

  @Get('health')
  async health() {
    return this.service.getHealth();
  }

  @Post('requests')
  async createRequest(@Body() body: { type: string; requestedCidr: string; metadata?: any; submittedBy: string }) {
    return this.service.createRequest(body.type, body.requestedCidr, body.metadata || {}, body.submittedBy);
  }

  @Get('requests')
  async getRequests() {
    return this.service.getRequests();
  }

  @Put('requests/:id/approve')
  async approveRequest(@Param('id') id: string) {
    return this.service.approveRequest(id);
  }

  @Put('requests/:id/reject')
  async rejectRequest(@Param('id') id: string) {
    return this.service.rejectRequest(id);
  }
}
