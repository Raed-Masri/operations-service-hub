const BASE_URL = 'http://localhost:3000';

export type Status =
  | 'SUBMITTED'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'WAITING_ON_REQUESTER'
  | 'RESOLVED'
  | 'CLOSED'
  | 'REJECTED'
  | 'CANCELLED';

export interface StatusEvent {
  id: string;
  from: Status | null;
  to: Status;
  changedBy: string;
  occurredAt: string;
}

export interface ServiceRequest {
  id: string;
  title: string;
  status: Status;
  requesterId: string;
  departmentId: string;
  createdAt: string;
  history?: StatusEvent[];
}

/** The four seeded people, so you can switch identity and see the rule work. */
export const PEOPLE = [
  { id: 'it-100', label: 'Lina Aoun — IT handler' },
  { id: 'hr-100', label: 'Samir Khoury — HR handler' },
  { id: 'emp-001', label: 'Nour Haddad — IT, requester' },
  { id: 'emp-002', label: 'Karim Saab — HR, requester' },
];


export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function call<T>(path: string, userId: string, init?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
        ...init?.headers,
      },
    });
  } catch {
    throw new ApiError(0, 'Cannot reach the service. Is the backend running on port 3000?');
  }

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      (body && typeof body.message === 'string' && body.message) ||
      `Request failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return body as T;
}

export const api = {
  list: (userId: string) => call<ServiceRequest[]>('/service-requests', userId),

  get: (id: string, userId: string) =>
    call<ServiceRequest>(`/service-requests/${id}`, userId),

  transition: (id: string, to: Status, userId: string) =>
    call<ServiceRequest>(`/service-requests/${id}/transition`, userId, {
      method: 'POST',
      body: JSON.stringify({ to }),
    }),
};