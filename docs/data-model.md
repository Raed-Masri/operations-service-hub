# Data Model — Internal Operations Service Hub

Inputs: `product-spec.md` and `architecture.md`. The spec said what must be true, the
architecture said who is responsible. This asks what must still be true tomorrow, after
the request is finished and the process has restarted.

Not a database schema. What the system remembers, and what keeps that memory trustworthy.

## Entities

- **Employee** — a person. Identity comes from the directory, so we keep a reference and
  the little we need locally, not a copy of the HR record.
- **Department** — IT, HR, Finance.
- **RequestType** — a configured kind of request. Carries the owning department and
  whether approval is needed.
- **Request** — one employee asking for one thing.
- **Assignment** — a handler taking ownership.
- **StatusEvent** — one recorded change of status.
- **Approval** — one person's decision on one request.
- **Comment** — a message by a named author at a known time.

## Relationships

- An employee submits many requests; a request has one requester.
- A type classifies many requests; a request has one type.
- A department owns many types, and through them many requests.
- A request has many status events, ordered, never fewer than one.
- A request has zero or more approvals; each names one deciding employee.
- A request has zero or more assignments, at most one active.
- A request collects many comments; each has one author.

Two of these are shaped by open questions. If U2 comes back as "always one approver,"
approvals collapse to at most one and the model simplifies. I would rather carry the
looser shape than bake in a guess.

Approval and assignment both look at first like they could be columns on Request, an
`approved` flag and an `owner` field. Both are their own entities because the relationship
carries data of its own: who, when, and what they decided. The approval side is in
ADR-001.

The Hub owns requests, assignments, events, approvals and comments. The directory owns
identity and department membership. The backend owns interpretation: routing, legal
transitions, who may act. Not the client.

## Lifecycle

```
SUBMITTED ──▶ ASSIGNED ──▶ IN_PROGRESS ──▶ RESOLVED ──▶ CLOSED
    │             │            │  ▲
    │             │            ▼  │
    │             │      WAITING_ON_REQUESTER
    │             └──────▶ REJECTED
    └──▶ CANCELLED  (from any open state)
```

ASSIGNED means a handler owns it; types needing approval wait there. CLOSED, REJECTED and
CANCELLED are terminal.

Can CLOSED go back to IN_PROGRESS?
No — reopening creates a new request referencing the old one, so each history stays a
straight line. Can SUBMITTED go straight to RESOLVED? No — something with no owner cannot
have been worked on. Do we need history as well as current state? Yes, AC6 asks for it.

## Invariants

- Every request belongs to one requester who exists in the directory.
- Every request belongs to one department, derived from its type.
- Every status event belongs to one request and records who caused it and when. A request
  always has at least the event that created it.
- A request cannot move to a state the lifecycle does not allow. Terminal states have no
  way out.
- A request whose type needs approval cannot enter IN_PROGRESS with no decision recorded.
- At most one assignment is active, held by a handler in the owning department.
- You read your own requests; a handler reads their department's. U3 would add a rule here
  if managers get visibility.
- Every comment and state change names a real employee. Nothing happens anonymously.

A field guarantees none of this. The question is which rule makes the data trustworthy.

## Where each rule lives

- **Database constraints** — uniqueness and required references. Every event points at a
  real request; at most one active assignment. Structural, cheap to enforce at the bottom.
- **Backend logic** — valid transitions and coordinated behaviour. CLOSED cannot go back.
  These need to reason about current state, so the database is the wrong place.
- **Authorization** — who may read and change. Depends on the caller, which the database
  does not know about.

## Current state alone loses the story

Keeping `current_status` on the request as well is deliberate duplication. The common read
is "show me open requests," and rebuilding state from events on every list query means
paying for history on reads that do not need it. The event log is the truth; the field is
a convenience that must only ever be written together with the event justifying it.

## Relational or document

Relational fits. The data is connected in every direction and queries cross those
connections constantly. Consistency between a status change and its event should be one
transaction. The shape is stable. And the rules I want enforced structurally are what
references are for.

Document would fit better if most reads stayed inside one aggregate and the shape varied
between types. Neither is true: the queue reads across many requests, and type differences
are configuration, not structure.

**Durable:** requests, events, approvals, assignments, comments — anything someone might
be asked to justify later. **Derived:** age, queue counts, overdue flags. Storing those
creates a second version of a truth the events already hold, and second versions drift.

## Access patterns and indexes

| The product needs            | The lookup                         | Index                        |
| ---------------------------- | ---------------------------------- | ---------------------------- |
| My requests (FR9)            | requester → requests, newest first | `(requester_id, created_at)` |
| Department queue (FR10)      | department + open states           | `(department_id, status)`    |
| One request's history (AC6)  | request → events by time           | `(request_id, occurred_at)`  |
| What needs my approval (FR8) | approver → pending approvals       | `(approver_id, decision)`    |

An index costs storage and slows writes. If I cannot name the access pattern it serves, it
should be dropped.

## Contradictions I checked

Spec asks for history, model records events. Spec makes approval a condition, model has
approvals as records and the lifecycle blocks IN_PROGRESS without one. Architecture puts
authorization in the backend, model makes ownership representable so there is something to
check. Spec requires audit, every event names an actor and a time.

The gap: U1 is open and the model has no event type for moving between departments. That
is deliberate. If U1 is answered yes, it is a new event type, not a redesign.
