# Data Model — Internal Operations Service Hub

Inputs: `product-spec.md` and `architecture.md`.

This is not a database schema. It is what the system remembers and what keeps that memory
trustworthy.

## Entities

Things the system has to identify and follow over time.

- **Employee** — a person in the company. Identity comes from the directory, so we keep a
  reference and the little we need locally, not a second copy of the HR record.
- **Department** — IT, HR, Finance.
- **RequestType** — a configured kind of request. Carries the owning department and
  whether approval is needed.
- **Request** — one employee asking for one thing. The centre of the model.
- **Assignment** — a handler taking ownership.
- **StatusEvent** — one recorded change of status.
- **Approval** — one person's decision on one request.
- **Comment** — a message on a request, by a named author, at a known time.

## Relationships

- An employee submits many requests. A request has one requester.
- A request type classifies many requests. A request has one type.
- A department owns many request types, and through them many requests.
- A request has many status events, ordered, and never fewer than one.
- A request has zero or more approvals. Each approval belongs to one request and names one
  deciding employee.
- A request collects many comments. Each comment has one author.

## Ownership

The Hub owns requests, assignments, status events, approvals and comments. Nothing else
writes them. The directory owns employee identity and department membership. The backend
owns interpretation: routing, legal transitions, and who may act. Not the client.

## Lifecycle

```
SUBMITTED ──▶  IN_PROGRESS ──▶ RESOLVED ──▶ CLOSED
    │             │            │  ▲
    │             │            ▼  │
    │             │      WAITING_ON_REQUESTER
    │             │
    │             └──────▶ REJECTED
    │
    └──▶ CANCELLED  (from any open state)
```

- SUBMITTED: created and routed, nobody owns it yet.
- IN_PROGRESS: actively worked. Needs a recorded approval if the type demands one.
- WAITING_ON_REQUESTER: the handler asked for something. Goes back to IN_PROGRESS when
  answered.
- RESOLVED, CLOSED, REJECTED, CANCELLED: the last three are terminal.

## Invariants

- Every request belongs to one requester who exists in the directory.
- Every request belongs to one department, derived from its type.
- Every status event belongs to one request, records who caused it, and has a time.
- A request cannot move to a state the lifecycle does not allow from where it is.

## Where each rule lives

**Database constraints** — uniqueness and required references. Every status event points
at a real request. At most one active assignment per request. Structural, cheap to enforce
at the bottom.

**Backend / domain logic** — valid transitions and coordinated behaviour. CLOSED cannot go
back. IN_PROGRESS needs an approval when the type demands one. These need to reason about
current state, so the database is the wrong place.

**Authorization** — who may read and who may change. This depends on the caller, which the
database does not know about.

## Current state alone loses the story

Two shapes were possible:

- **A, current only:** `request.status = RESOLVED`. Small and fast.
- **B, current plus events:** `current_status` on the request, alongside status events
  with who and when.

Only B answers "when was this approved" or "how long did it sit waiting on the requester."

## Relational or document

The data is connected in every direction and the queries cross those connections
constantly. Consistency between a status change and its event matters and should be one
transaction.

A document store would fit better if most reads stayed inside one aggregate and the shape
varied meaningfully between types.

## Access patterns

The queries the product actually runs, taken from the requirements:

| The product needs                         | The lookup                         |
| ----------------------------------------- | ---------------------------------- |
| My requests (FR9)                         | requester → requests, newest first |
| Department open queue (FR10)              | department + open states           |
| One request with history (FR11, AC6)      | request → events ordered by time   |
| Unassigned requests in a department (FR4) | department + no active assignment  |
| What needs my approval (FR8)              | approver → pending approvals       |

Indexes, only where a named pattern pays for one:

- `(requester_id, created_at)` for "my requests," which every employee runs.
- `(department_id, status)` for the handler queue, the busiest read in the product.
- `(request_id, occurred_at)` on status events, for reading one history in order.
- `(approver_id, decision)` for pending approvals.
