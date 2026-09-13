# Week 3 — Full-Stack Delivery

v0.3. One narrow, user-facing flow across React, NestJS and a real database, with the
boundaries protected and the confidence automated.

## The slice

**A handler works a service request through its lifecycle, and people only see what they
are entitled to see.**

React lists the requests you may view, opens one, shows its history, and offers the moves.
NestJS decides who you are, whether you may act on this request, and whether the move is
legal. SQLite via Prisma keeps the status and the history.

Everything else in the Week 1 model — approvals, comments, assignments, departments as
their own entity — is still out of scope. One flow, protected properly, rather than five
half-built ones.

## API contract

Every route requires an `x-user-id` header. There is no real authentication this week, so
the caller states who they are and the backend looks them up. Unknown or missing is
refused rather than defaulted.

| Route | Success | Failures |
|---|---|---|
| `GET /service-requests` | 200, only the requests this caller may see | 401 |
| `GET /service-requests/:id` | 200, request with full history | 401, 403, 404 |
| `POST /service-requests/:id/transition` body `{"to":"ASSIGNED"}` | 200, updated request with history | 400, 401, 403, 404 |

Errors use Nest's standard shape, so the frontend can show the backend's own message:

```json
{ "message": "Cannot transition from SUBMITTED to RESOLVED", "error": "Bad Request", "statusCode": 400 }
```

## The authorization rule

From `product-spec.md` (Privacy) and `data-model.md` (Access): **you may access your own
requests, or requests owned by your department if you are a handler.** Nothing else.

It lives in one method, `assertMayAccess` in `request.service.ts`, and guards both reading
and transitioning.

- **Allowed:** `it-100`, an IT handler, opens request 123 (IT) → 200.
- **Denied:** `hr-100`, an HR handler, opens the same request → 403.

Also denied: `emp-001` opening request 124, which belongs to `emp-002`. Being a known
employee is not permission. The list endpoint applies the same rule as a filter, so a
requester sees only their own rows.

## Deliberate rejections and failures

**Invalid request, rejected on purpose.** `{"to":"BANANA"}` → 400, `Unknown status
"BANANA". Valid statuses: ...`. The status is checked against the enum before the
transition table is consulted, so a typo never reaches the rule.

**Expected failure, handled on purpose.** A transition on an id that does not exist → 404
with `No service request with id X`. The service looks the request up first and refuses
rather than letting Prisma throw an unhandled error.

**The business rule itself.** SUBMITTED → RESOLVED → 400, `Cannot transition from
SUBMITTED to RESOLVED`. This is the Week 1 invariant: a request must be IN_PROGRESS before
it can be resolved.

## How the database write is protected

Status and its history event are written in one `prisma.$transaction`. `data-model.md` says
the event log is the truth and `status` is a maintained convenience, so the two must never
be written separately — a crash between them would leave a status the history cannot
explain.

Two integration tests assert the other half of that: a refused transition leaves the status
unchanged and adds no history row.

## Automated confidence

| Test | What it protects | Command |
|---|---|---|
| `src/service-requests/request.model.spec.ts` | the business rule, with no database or HTTP | `npm test` |
| `test/request.integration-spec.ts` | the write actually lands, and status and history land together | `npm run test:integration` |
| `test/request.e2e-spec.ts` | the real flow over HTTP, plus every boundary above | `npm run test:e2e` |

The unit test asserts RESOLVED is reachable from IN_PROGRESS **and nowhere else**, so
adding a shortcut to the transition table breaks the build rather than the product.

**Regression protection.** The E2E file has a block covering what already worked in v0.2:
SUBMITTED → IN_PROGRESS still refused, ASSIGNED → RESOLVED still refused, and every change
still records who made it. Those passed before the database existed and they pass now —
which is the point, since swapping in-memory state for Prisma was exactly the kind of
change that could have broken them quietly.

## Traceability

- The lifecycle and the two rules → `product-spec.md` FR5.
- Transition rules in the backend, not the client → `architecture.md`.
- Status as convenience over an event log; the indexes in `schema.prisma` → `data-model.md`
  (access patterns).
- The authorization rule → `product-spec.md` Privacy, `data-model.md` Access.

The frontend offers all four moves without checking legality. That is deliberate: pressing
an illegal one shows the server refusing, which makes visible what `architecture.md`
already claimed — a rule only the client enforces is not enforced.