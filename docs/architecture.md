# Architecture — Internal Operations Service Hub

The specification is the input. Everything here exists because something in
`product-spec.md` needed it. If a box cannot be traced back to a requirement, challenge it.

Four requirements do most of the shaping: requests get one owning department and one named
owner (FR2, FR4); people only see and act on what they are entitled to (security,
privacy); status history has to survive and explain itself (FR11, audit); a notification
failure must not lose a request (AC8).

## System boundary

**We own:** the web app, the backend, and the request data (requests, assignments, status
history, approvals, comments).

**We rely on:** the employee directory for identity and department membership, and the
notification service for email.

The boundary decides where rules get enforced. The browser is inside our product but
outside our trust. The directory is outside our product entirely, so what it returns is
input, not automatic truth.

## Components

- **Web app** — collects input and shows state. Not a source of truth. It can hide a
  button the user may not press, but that is a courtesy, not a security control.
- **Backend** — owns every rule that matters: who the caller is, whether they may act on
  this specific request, routing, which state changes are legal, and what happens when a
  dependency fails. It is here because the spec puts security and ownership on the
  product, and those cannot live in a client we do not control. The transition rules in
  particular live here and nowhere else: the browser may grey out a button, but the
  backend is what actually refuses SUBMITTED going straight to RESOLVED. A rule only the
  client enforces is not enforced.
- **Request data store** — holds durable truth, because status and history must survive
  restarts.
- **Directory adapter** — one place that knows the directory's format, so a change or an
  outage there does not spread through the system.
- **Notification adapter** — same idea outbound, with one job: it must be able to fail
  without failing the request.

## Main flow: submitting a request

Employee submits → backend identifies them → validates content and resolves the type →
works out the owning department → **creates the request and records the first status
event** → asks the notification adapter to tell the department → returns the request.

The notification step comes last on purpose. The request is saved before anyone is told,
which is what makes AC8 work.

Reading is the same idea in reverse: identify the caller, then decide whether this caller
may read this specific request. That check is the decision itself, not a filter over a
list already fetched.

## Trust boundaries

**Browser to backend.** Everything crossing is a claim. A request id in a URL proves
nothing about entitlement.

**Backend to directory.** What comes back is external input, validated and translated into
our own employee representation before anything else uses it.

Authentication is who you are. Authorization is what you may do. Being logged in does not
entitle you to read someone else's employment letter request.

## Failure behaviour

| What fails                             | User sees                         | Still works                                                                                    |
| -------------------------------------- | --------------------------------- | ---------------------------------------------------------------------------------------------- |
| Notification service down              | Nothing unusual                   | Request created, queued, readable. Failure is logged, not shown as a failed submission.        |
| Directory down at login                | Cannot sign in                    | Existing sessions can still read requests                                                      |
| Directory returns something unexpected | Submission refused, clear message | Adapter rejects rather than storing garbage                                                    |
| Duplicate submit                       | One request                       | Second attempt does not create a second request                                                |
| Two handlers claim one request         | Second sees it is owned           | Ownership stays with one person                                                                |
| Data store down                        | Clear failure message             | Nothing. This is the one dependency we cannot degrade around, and it is more honest to say so. |

Fail in a way that keeps the useful part alive and tells the user what they are looking at.
A missing notification is survivable. A request accepted and then quietly lost is not.

## Decisions

**The backend owns both integrations; the web app never calls them directly.** The
alternative puts credentials in the browser and spreads authorization into a client we do
not control.

**The client asks; the server does not push.** Freshness requires that the status shown
reflects the last recorded change, not that it updates live. A page load satisfies that.

**Status history is recorded as events, not overwritten.** Audit and AC6 both need to
explain how a request reached its current state, and a mutable status field cannot answer
"when was this approved." The same reasoning applied to approvals is in ADR-001.

**One department owns a request at a time.** Follows the assumption in the spec and leaves
U1 open. Because history is events, adding reassignment later is a new event type rather
than a redesign.
