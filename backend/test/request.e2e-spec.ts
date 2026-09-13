import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { seedDatabase } from '../prisma/seed';

describe('Service Request flow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const as = (userId: string) => ({ 'x-user-id': userId });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await seedDatabase(prisma as unknown as PrismaClient);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('the happy path a handler walks through', () => {
    it('moves a request from SUBMITTED to IN_PROGRESS, keeping history', async () => {
      const assigned = await request(app.getHttpServer())
        .post('/service-requests/123/transition')
        .set(as('it-100'))
        .send({ to: 'ASSIGNED' })
        .expect(200);

      expect(assigned.body.status).toBe('ASSIGNED');
      expect(assigned.body.history).toHaveLength(2);

      const started = await request(app.getHttpServer())
        .post('/service-requests/123/transition')
        .set(as('it-100'))
        .send({ to: 'IN_PROGRESS' })
        .expect(200);

      expect(started.body.status).toBe('IN_PROGRESS');
      expect(started.body.history).toHaveLength(3);
      expect(started.body.history[2]).toMatchObject({
        from: 'ASSIGNED',
        to: 'IN_PROGRESS',
        changedBy: 'it-100',
      });
    });
  });

  describe('authorization', () => {
    it('ALLOWS the IT handler to read an IT request', async () => {
      const response = await request(app.getHttpServer())
        .get('/service-requests/123')
        .set(as('it-100'))
        .expect(200);

      expect(response.body.id).toBe('123');
    });

    it('ALLOWS a requester to read their own request', async () => {
      await request(app.getHttpServer())
        .get('/service-requests/123')
        .set(as('emp-001'))
        .expect(200);
    });

    it('DENIES the HR handler reading an IT request', async () => {
      await request(app.getHttpServer())
        .get('/service-requests/123')
        .set(as('hr-100'))
        .expect(403);
    });

    it('DENIES a requester reading someone else request', async () => {
      await request(app.getHttpServer())
        .get('/service-requests/124')
        .set(as('emp-001'))
        .expect(403);
    });

    it('refuses a caller who does not say who they are', async () => {
      await request(app.getHttpServer())
        .get('/service-requests/123')
        .expect(401);
    });

    it('lists only what the caller is entitled to see', async () => {
      const response = await request(app.getHttpServer())
        .get('/service-requests')
        .set(as('emp-002'))
        .expect(200);

      expect(response.body.map((r: { id: string }) => r.id)).toEqual(['124']);
    });
  });

  describe('rejections', () => {
    it('rejects a status that does not exist', async () => {
      const response = await request(app.getHttpServer())
        .post('/service-requests/123/transition')
        .set(as('it-100'))
        .send({ to: 'BANANA' })
        .expect(400);

      expect(response.body.message).toContain('Unknown status');
    });

    it('rejects a transition the lifecycle forbids', async () => {
      const response = await request(app.getHttpServer())
        .post('/service-requests/123/transition')
        .set(as('it-100'))
        .send({ to: 'RESOLVED' })
        .expect(400);

      expect(response.body.message).toBe(
        'Cannot transition from SUBMITTED to RESOLVED',
      );
    });

    it('handles a request id that does not exist', async () => {
      await request(app.getHttpServer())
        .post('/service-requests/does-not-exist/transition')
        .set(as('it-100'))
        .send({ to: 'ASSIGNED' })
        .expect(404);
    });
  });

  describe('regression — behaviour that already worked in v0.2', () => {
    it('still refuses SUBMITTED -> IN_PROGRESS', async () => {
      const response = await request(app.getHttpServer())
        .post('/service-requests/123/transition')
        .set(as('it-100'))
        .send({ to: 'IN_PROGRESS' })
        .expect(400);

      expect(response.body.message).toBe(
        'Cannot transition from SUBMITTED to IN_PROGRESS',
      );
    });

    it('still refuses ASSIGNED -> RESOLVED', async () => {
      const response = await request(app.getHttpServer())
        .post('/service-requests/124/transition')
        .set(as('hr-100'))
        .send({ to: 'RESOLVED' })
        .expect(400);

      expect(response.body.message).toBe(
        'Cannot transition from ASSIGNED to RESOLVED',
      );
    });

    it('still records who made each change', async () => {
      const response = await request(app.getHttpServer())
        .post('/service-requests/123/transition')
        .set(as('it-100'))
        .send({ to: 'ASSIGNED' })
        .expect(200);

      expect(response.body.history[1].changedBy).toBe('it-100');
    });
  });
});
