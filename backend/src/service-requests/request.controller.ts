import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
} from '@nestjs/common';
import { RequestService } from './request.service';

interface TransitionBody {
  to: string;
}

@Controller('service-requests')
export class RequestController {
  constructor(private readonly service: RequestService) {}

  @Get()
  async findAll(@Headers('x-user-id') userId: string) {
    const viewer = await this.service.resolveViewer(userId);
    return this.service.findAllFor(viewer);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Headers('x-user-id') userId: string) {
    const viewer = await this.service.resolveViewer(userId);
    return this.service.findOneFor(id, viewer);
  }

  // 200, not Nest's default 201: a transition updates an existing request,
  // it does not create one.
  @Post(':id/transition')
  @HttpCode(200)
  async transition(
    @Param('id') id: string,
    @Body() body: TransitionBody,
    @Headers('x-user-id') userId: string,
  ) {
    const viewer = await this.service.resolveViewer(userId);
    return this.service.transition(id, body?.to, viewer);
  }
}
