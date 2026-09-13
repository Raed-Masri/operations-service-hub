import { PrismaClient } from '@prisma/client';

export const EMPLOYEES = [
  { id: 'emp-001', name: 'Nour Haddad', departmentId: 'IT', role: 'REQUESTER' },
  { id: 'emp-002', name: 'Karim Saab', departmentId: 'HR', role: 'REQUESTER' },
  { id: 'it-100', name: 'Lina Aoun', departmentId: 'IT', role: 'HANDLER' },
  { id: 'hr-100', name: 'Samir Khoury', departmentId: 'HR', role: 'HANDLER' },
];

export const REQUESTS = [
  {
    id: '123',
    title: 'Laptop will not boot',
    status: 'SUBMITTED',
    requesterId: 'emp-001',
    departmentId: 'IT',
  },
  {
    id: '124',
    title: 'Employment letter for the bank',
    status: 'ASSIGNED',
    requesterId: 'emp-002',
    departmentId: 'HR',
  },
  {
    id: '125',
    title: 'Access to the billing system',
    status: 'IN_PROGRESS',
    requesterId: 'emp-001',
    departmentId: 'IT',
  },
];


export async function seedDatabase(prisma: PrismaClient) {
  await prisma.statusEvent.deleteMany();
  await prisma.serviceRequest.deleteMany();
  await prisma.employee.deleteMany();

  await prisma.employee.createMany({ data: EMPLOYEES });

  for (const request of REQUESTS) {
    await prisma.serviceRequest.create({
      data: {
        ...request,
        history: { create: { from: null, to: request.status, changedBy: 'seed' } },
      },
    });
  }
}

// Only runs when this file is executed directly, not when a test imports it.
if (require.main === module) {
  const prisma = new PrismaClient();
  seedDatabase(prisma)
    .then(() =>
      console.log(
        `Seeded ${EMPLOYEES.length} employees and ${REQUESTS.length} service requests.`,
      ),
    )
    .catch((error) => {
      console.error(error);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}