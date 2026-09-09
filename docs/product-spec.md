# Product Specification — Internal Operations Service Hub

## Problem

Employees constantly need things from other departments: a broken laptop, access to a
system, an employment letter, approval for a work expense. These requests go through
whatever channel is nearest, so they get forgotten, reach the wrong person, and nobody can
say who owns them or where they stand.

The company wants one system where a request is submitted, handled and followed. The point
is not the form. It is that every request has an owner, a state, and a history.

## Actors

- **Requester** — any employee. Submits and follows their own requests.
- **Handler** — IT, HR or Finance staff. Works their department's queue.
- **Approver** — has to agree before certain requests move. A role for one request, not a
  job title.
- **Administrator** — configures request types and routing.
- **Employee directory** (external) — identity and department membership.
- **Notification service** (external) — sends the emails.

## Known facts

From the brief: employees ask for help through unstructured channels; the examples are a
laptop problem, system access, an employment letter and an expense approval; the pains are
forgotten requests, wrong recipient, unclear ownership, unclear status, unclear approval;
the company wants one system to submit, handle and follow them.

## Functional requirements

1. An employee can submit a request by choosing a type and describing what they need.
2. Each request is routed to exactly one owning department, based on its type.
3. A request always has a current status, visible to the requester.
4. A handler in the owning department can take ownership of an unassigned request.
5. A handler can move a request through the states the lifecycle allows, and no others.
   The states are SUBMITTED, ASSIGNED, IN_PROGRESS, RESOLVED, plus WAITING_ON_REQUESTER,
   REJECTED and CANCELLED. Two rules matter most: a request must be assigned before work
   starts, and it must be in progress before it can be resolved.
6. A handler can mark a request as waiting on the requester.
7. Requester and handler can comment. Each comment records who and when.
8. If a type needs approval, the request cannot enter a working state until an approval
   decision is recorded, with who decided and when.
9. A requester sees all of their own requests with status and history.
10. A handler sees the open queue for their department.
11. Every status change is kept, with who caused it and when.
12. A requester can cancel their own request while it is open.

## Non-functional requirements

- **Security** — submitting, handling and approving are three different permissions. Being
  logged in does not mean you may act on a given request.
- **Privacy** — you read your own requests; a handler reads their department's. An
  employment letter request touches personal data and should not be visible elsewhere.
- **Latency** — submitting and opening a list are interactive and should feel immediate.
- **Availability** — submitting and reading matter most. Delayed notifications are
  annoying; a failed submission is the system failing at its job.
- **Freshness** — the status shown reflects the last recorded change. Nothing requires
  live updating on screen.
- **Graceful degradation** — if notifications fail, the request is still created and still
  in the queue. A lost email cannot mean a lost request.
- **Auditability** — for any closed request we can say who asked, who handled it, who
  approved it, and when.

## Assumptions

Identity comes from the existing directory; we do not create accounts. A request belongs
to one department at a time. Request types are configured by an admin. Whether approval is
needed is a property of the type. Internal employees only.

## Constraints

The directory owns identity and reporting lines, and we must not become a second source of
truth for who works here. Notifications go through the company's existing email service.
One developer, one week per stage.

## Unknowns

- **U1.** Can a request move between departments after submission?
- **U2.** Can a request need more than one approver, and must all of them agree?
- **U3.** Should a manager see their team's requests, or only their own?
- **U4.** Are attachments needed at submission?

## Non-goals

Not replacing the directory. Not a chat product. Not for external or customer requests. No
dashboards or performance reporting. No AI classification. No mobile app.

## Acceptance criteria

1. An employee submits an IT request. It appears in the IT queue and in their own list.
2. An employee opening someone else's request is refused because of the ownership rule,
   not because the link was hidden.
3. A handler takes an unassigned request. A second handler now sees it is owned.
4. An HR handler cannot take a request owned by Finance.
5. A request needing approval cannot enter the working state with no approval recorded.
   Once one is recorded, the same move succeeds.
6. After a handler resolves a request, the history shows every earlier status with the
   time and the person.
7. A cancelled request leaves the department queue and stays readable by its requester.
8. With the notification service down, the request is still created and the requester is
   not told the submission failed.
9. Nothing shows a status the history cannot explain.
