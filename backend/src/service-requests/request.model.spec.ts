import { ALLOWED_TRANSITIONS, RequestStatus } from './request.model';

describe('Service Request lifecycle rules', () => {
  const canMove = (from: RequestStatus, to: RequestStatus) =>
    ALLOWED_TRANSITIONS[from].includes(to);

  describe('a request must be assigned before work starts', () => {
    it('allows SUBMITTED -> ASSIGNED', () => {
      expect(canMove('SUBMITTED', 'ASSIGNED')).toBe(true);
    });

    it('refuses SUBMITTED -> IN_PROGRESS', () => {
      expect(canMove('SUBMITTED', 'IN_PROGRESS')).toBe(false);
    });
  });

  describe('a request must be in progress before it can be resolved', () => {
    it('allows IN_PROGRESS -> RESOLVED', () => {
      expect(canMove('IN_PROGRESS', 'RESOLVED')).toBe(true);
    });

    it('refuses SUBMITTED -> RESOLVED', () => {
      expect(canMove('SUBMITTED', 'RESOLVED')).toBe(false);
    });

    it('refuses ASSIGNED -> RESOLVED', () => {
      expect(canMove('ASSIGNED', 'RESOLVED')).toBe(false);
    });

    it('is the only way in: RESOLVED is reachable from IN_PROGRESS and nowhere else', () => {
      const sources = (
        Object.keys(ALLOWED_TRANSITIONS) as RequestStatus[]
      ).filter((from) => canMove(from, 'RESOLVED'));
      expect(sources).toEqual(['IN_PROGRESS']);
    });
  });

  describe('terminal states', () => {
    it.each<RequestStatus>(['CLOSED', 'REJECTED', 'CANCELLED'])(
      '%s has no outgoing transitions',
      (state) => {
        expect(ALLOWED_TRANSITIONS[state]).toHaveLength(0);
      },
    );
  });
});
