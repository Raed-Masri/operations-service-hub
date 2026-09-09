import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ALL_STATUSES,
  ALLOWED_TRANSITIONS,
  RequestStatus,
  ServiceRequest,
} from './request.model';

@Injectable()
export class ServiceRequestsService {
  private readonly requests = new Map<string, ServiceRequest>();

  constructor() {
    this.seed();
  }

  findOne(id: string): ServiceRequest {
    const request = this.requests.get(id);
    if (!request) {
      throw new NotFoundException(`No service request with id ${id}`);
    }
    return request;
  }

  findAll(): ServiceRequest[] {
    return [...this.requests.values()];
  }

  transition(id: string, to: string, changedBy: string): ServiceRequest {
    const request = this.findOne(id);

    if (!ALL_STATUSES.includes(to as RequestStatus)) {
      throw new BadRequestException(
        `Unknown status "${to}". Valid statuses: ${ALL_STATUSES.join(', ')}`,
      );
    }

    const target = to as RequestStatus;
    const from = request.status;

    if (!ALLOWED_TRANSITIONS[from].includes(target)) {
      throw new BadRequestException(
        `Cannot transition from ${from} to ${target}`,
      );
    }

    request.status = target;
    request.history.push({
      from,
      to: target,
      changedBy,
      occurredAt: new Date().toISOString(),
    });

    return request;
  }

  private seed(): void {
    const now = new Date().toISOString();
    const fixtures: Array<Omit<ServiceRequest, 'history'>> = [
      {
        id: '123',
        requesterId: 'emp-001',
        departmentId: 'IT',
        title: 'Laptop will not boot',
        status: 'SUBMITTED',
      },
      {
        id: '124',
        requesterId: 'emp-002',
        departmentId: 'HR',
        title: 'Employment letter for the bank',
        status: 'ASSIGNED',
      },
      {
        id: '125',
        requesterId: 'emp-003',
        departmentId: 'FINANCE',
        title: 'Approve conference expense',
        status: 'IN_PROGRESS',
      },
    ];

    for (const fixture of fixtures) {
      this.requests.set(fixture.id, {
        ...fixture,
        history: [
          {
            from: null,
            to: fixture.status,
            changedBy: 'seed',
            occurredAt: now,
          },
        ],
      });
    }
  }
}
