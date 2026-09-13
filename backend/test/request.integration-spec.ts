import { Test } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import { RequestService } from '../src/service-requests/request.service';
import { seedDatabase } from '../prisma/seed';

/**
 * Integration test: the service against the real database.
 *
 * The point is not that the endpoint returns 200. It is that the write actually
 * landed, and that status and history landed *together*. Reading the response
 * would not prove that — these assertions query the database directly.
 */
describe('RequestService <-> database', () => {
  let service: RequestService;
  let prisma: PrismaService;
  const itHandler = { id: 'it-100', departmentId: 'IT', role: 'HANDLER' };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [RequestService, PrismaService],
    }).compile();

    service = moduleRef.get(RequestService);
    prisma = moduleRef.get(PrismaService);
    await prisma.$connect();
  });

  beforeEach(async () => {
    await seedDatabase(prisma as unknown as PrismaClient);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('persists the new status to the database', async () => {
    await service.transition('123', 'ASSIGNED', itHandler);

    const stored = await prisma.serviceRequest.findUnique({ where: { id: '123' } });
    expect(stored?.status).toBe('ASSIGNED');
  });

  it('writes a history row naming the actor and both states', async () => {
    await service.transition('123', 'ASSIGNED', itHandler);

    const events = await prisma.statusEvent.findMany({
      where: { requestId: '123' },
      orderBy: { occurredAt: 'asc' },
    });

    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({ from: null, to: 'SUBMITTED', changedBy: 'seed' });
    expect(events[1]).toMatchObject({
      from: 'SUBMITTED',
      to: 'ASSIGNED',
      changedBy: 'it-100',
    });
  });

  it('keeps the status column and the event log in agreement', async () => {
    await service.transition('123', 'ASSIGNED', itHandler);
    await service.transition('123', 'IN_PROGRESS', itHandler);

    const stored = await prisma.serviceRequest.findUnique({
      where: { id: '123' },
      include: { history: { orderBy: { occurredAt: 'asc' } } },
    });

    const lastEvent = stored!.history[stored!.history.length - 1];
    expect(stored!.status).toBe(lastEvent.to);
  });

  it('writes nothing when the transition is refused', async () => {
    await expect(service.transition('123', 'RESOLVED', itHandler)).rejects.toThrow(
      'Cannot transition from SUBMITTED to RESOLVED',
    );

    const stored = await prisma.serviceRequest.findUnique({
      where: { id: '123' },
      include: { history: true },
    });

    expect(stored?.status).toBe('SUBMITTED');
    expect(stored?.history).toHaveLength(1);
  });

  it('writes nothing when the caller is not entitled to the request', async () => {
    const hrHandler = { id: 'hr-100', departmentId: 'HR', role: 'HANDLER' };

    await expect(service.transition('123', 'ASSIGNED', hrHandler)).rejects.toThrow(
      ForbiddenException,
    );

    const stored = await prisma.serviceRequest.findUnique({ where: { id: '123' } });
    expect(stored?.status).toBe('SUBMITTED');
  });
});