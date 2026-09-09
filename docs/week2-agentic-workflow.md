# Week 2 — Agentic Workflow

v0.2: the Service Request lifecycle from Week 1, implemented in NestJS with in-memory
state.

## Understand

From my Week 1 docs: `product-spec.md` FR5 names the states, `data-model.md` has the
lifecycle and invariants, `architecture.md` puts transition rules in the backend.

States implemented: **SUBMITTED → ASSIGNED → IN_PROGRESS → RESOLVED**.

Rules: a request must be assigned before work starts, and must be IN_PROGRESS before it can
be resolved.

Invariant: a request can only become RESOLVED if it is currently IN_PROGRESS.

Area: `backend/src/service-requests/` plus one import in `app.module.ts`.

Not doing this week: database, auth, frontend, approvals, comments, tests.

## Direct

Task set: one transition endpoint, allowed moves declared in one place, everything else
rejected.

Shape agreed before writing code — a transition table keyed by current state, a service
that does the lookup, a thin controller. I rejected if-statements in the controller because
that spreads one rule across several places and puts a business rule in the HTTP layer,
against `architecture.md`.

I **redirected** the state naming: Week 1 said TRIAGED, the class example said ASSIGNED. I
renamed it in the docs first and committed that separately so the code traces back cleanly.

I **stopped** suggestions to add persistence, validation decorators and tests. Useful, but
out of scope this week.

## Prove

Commands are in the README.

| #   | Transition              | Expected | Actual                                                 |
| --- | ----------------------- | -------- | ------------------------------------------------------ |
| 1   | SUBMITTED → ASSIGNED    | success  | 201, ASSIGNED, 2 history entries                       |
| 2   | ASSIGNED → IN_PROGRESS  | success  | 201, IN_PROGRESS, 3 history entries                    |
| 3   | SUBMITTED → RESOLVED    | 400      | 400, "Cannot transition from SUBMITTED to RESOLVED"    |
| 4   | SUBMITTED → IN_PROGRESS | 400      | 400, "Cannot transition from SUBMITTED to IN_PROGRESS" |
