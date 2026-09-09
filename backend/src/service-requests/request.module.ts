import { Module } from '@nestjs/common';
import { ServiceRequestsController } from './request.controller';
import { ServiceRequestsService } from './request.service';

@Module({
  controllers: [ServiceRequestsController],
  providers: [ServiceRequestsService],
})
export class ServiceRequestsModule {}
