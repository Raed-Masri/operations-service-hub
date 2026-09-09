export type RequestStatus =
  | 'SUBMITTED'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'WAITING_ON_REQUESTER'
  | 'RESOLVED'
  | 'CLOSED'
  | 'REJECTED'
  | 'CANCELLED';

export const ALL_STATUSES: RequestStatus[] = [
  'SUBMITTED',
  'ASSIGNED',
  'IN_PROGRESS',
  'WAITING_ON_REQUESTER',
  'RESOLVED',
  'CLOSED',
  'REJECTED',
  'CANCELLED',
];

export const ALLOWED_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  SUBMITTED: ['ASSIGNED', 'REJECTED', 'CANCELLED'],
  ASSIGNED: ['IN_PROGRESS', 'REJECTED', 'CANCELLED'],
  IN_PROGRESS: ['WAITING_ON_REQUESTER', 'RESOLVED', 'CANCELLED'],
  WAITING_ON_REQUESTER: ['IN_PROGRESS', 'CANCELLED'],
  RESOLVED: ['CLOSED'],
  CLOSED: [],
  REJECTED: [],
  CANCELLED: [],
};

/** One recorded status change. data-model.md: history, not just current state. */
export interface StatusEvent {
  from: RequestStatus | null;
  to: RequestStatus;
  changedBy: string;
  occurredAt: string;
}

export interface ServiceRequest {
  id: string;
  requesterId: string;
  departmentId: string;
  title: string;
  status: RequestStatus;
  history: StatusEvent[];
}
