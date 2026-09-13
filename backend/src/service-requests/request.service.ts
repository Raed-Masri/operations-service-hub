import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ALL_STATUSES,
  ALLOWED_TRANSITIONS,
  RequestStatus,
} from './request.model';

@Injectable()
export class RequestService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveViewer(userId?: string) {
    if (!userId) {
      throw new UnauthorizedException('Missing x-user-id header');
    }
    const employee = await this.prisma.employee.findUnique({
      where: { id: userId },
    });
    if (!employee) {
      throw new UnauthorizedException(`Unknown user ${userId}`);
    }
    return employee;
  }

  private assertMayAccess(
    request: { requesterId: string; departmentId: string },
    viewer: { id: string; departmentId: string; role: string },
  ) {
    const isOwnRequest = request.requesterId === viewer.id;
    const isDepartmentHandler =
      viewer.role === 'HANDLER' && viewer.departmentId === request.departmentId;

    if (!isOwnRequest && !isDepartmentHandler) {
      throw new ForbiddenException(
        'You may only access your own requests or requests owned by your department',
      );
    }
  }

  /** The requests this caller is entitled to see, newest first. */
  async findAllFor(viewer: { id: string; departmentId: string; role: string }) {
    return this.prisma.serviceRequest.findMany({
      where:
        viewer.role === 'HANDLER'
          ? {
              OR: [
                { requesterId: viewer.id },
                { departmentId: viewer.departmentId },
              ],
            }
          : { requesterId: viewer.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneFor(
    id: string,
    viewer: { id: string; departmentId: string; role: string },
  ) {
    const request = await this.prisma.serviceRequest.findUnique({
      where: { id },
      include: { history: { orderBy: { occurredAt: 'asc' } } },
    });

    // Expected failure, handled on purpose: an id that does not exist is a 404,
    // not a crash and not an empty 200.
    if (!request) {
      throw new NotFoundException(`No service request with id ${id}`);
    }

    this.assertMayAccess(request, viewer);
    return request;
  }

  async transition(
    id: string,
    to: string,
    viewer: { id: string; departmentId: string; role: string },
  ) {
    const request = await this.prisma.serviceRequest.findUnique({
      where: { id },
    });
    if (!request) {
      throw new NotFoundException(`No service request with id ${id}`);
    }

    this.assertMayAccess(request, viewer);

    // Invalid request, rejected on purpose: a status we do not recognise.
    if (!to || !ALL_STATUSES.includes(to as RequestStatus)) {
      throw new BadRequestException(
        `Unknown status "${to}". Valid statuses: ${ALL_STATUSES.join(', ')}`,
      );
    }

    const target = to as RequestStatus;
    const from = request.status as RequestStatus;

    // The business rule from Week 1, unchanged since v0.2.
    if (!ALLOWED_TRANSITIONS[from].includes(target)) {
      throw new BadRequestException(
        `Cannot transition from ${from} to ${target}`,
      );
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.serviceRequest.update({
        where: { id },
        data: { status: target },
        include: { history: { orderBy: { occurredAt: 'asc' } } },
      }),
      this.prisma.statusEvent.create({
        data: { requestId: id, from, to: target, changedBy: viewer.id },
      }),
    ]);

    return this.prisma.serviceRequest.findUnique({
      where: { id: updated.id },
      include: { history: { orderBy: { occurredAt: 'asc' } } },
    });
  }
}
