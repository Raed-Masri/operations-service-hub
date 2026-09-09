import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ServiceRequestsService } from './request.service';

interface TransitionBody {
  to: string;
  changedBy?: string;
}

@Controller('service-requests')
export class ServiceRequestsController {
  constructor(private readonly service: ServiceRequestsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post(':id/transition')
  transition(@Param('id') id: string, @Body() body: TransitionBody) {
    return this.service.transition(
      id,
      body?.to,
      body?.changedBy ?? 'handler-001',
    );
  }
}
