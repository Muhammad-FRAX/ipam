import { Controller, Get, Post, Body, Param, Put, Req, Query } from '@nestjs/common';
import { WorkflowService } from './workflow.service';

@Controller('workflow')
export class WorkflowController {
  constructor(private readonly service: WorkflowService) {}

  @Get('health')
  async health() {
    return this.service.getHealth();
  }

  @Post('requests')
  async createRequest(
    @Body() body: { type: string; requestedCidr: string; blockId?: string; metadata?: any; submittedBy: string },
    @Req() req: any,
  ) {
    const userId: string | null = req.headers['x-user-id'] || null;
    return this.service.createRequest(
      body.type,
      body.requestedCidr,
      body.blockId || null,
      body.metadata || {},
      body.submittedBy,
      userId,
    );
  }

  @Get('requests')
  async getRequests(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.service.getRequests(page ? parseInt(page, 10) : 1, pageSize ? parseInt(pageSize, 10) : 50);
  }

  @Put('requests/:id/approve')
  async approveRequest(@Param('id') id: string, @Req() req: any) {
    const userId: string | null = req.headers['x-user-id'] || null;
    return this.service.approveRequest(id, userId);
  }

  @Put('requests/:id/reject')
  async rejectRequest(@Param('id') id: string, @Req() req: any) {
    const userId: string | null = req.headers['x-user-id'] || null;
    return this.service.rejectRequest(id, userId);
  }
}
