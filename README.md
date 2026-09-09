# Internal Operations Service Hub

One place for employees to submit internal requests (IT, HR, Finance) and follow what
happens to them.

Right now people ask for these things through whatever channel is nearest: a chat message,
an email, walking over to someone's desk. Requests get forgotten, reach the wrong person,
and nobody can say who owns them or where they stand.

## What is in here

```
README.md
backend/                        NestJS service (v0.2)
docs/
  product-spec.md               what the product must do
  architecture.md               which parts exist and who is responsible for what
  data-model.md                 what the system remembers and which rules protect it
  week2-agentic-workflow.md     how v0.2 was understood, directed and proved
  decisions/
    ADR-001.md                  why approvals are records and not a true/false field
```

Read the docs in order. Each one takes the previous one as input.

## Status

**v0.2 — first verified implementation.** One bounded slice of the Service Request
lifecycle, running on in-memory state.

Not included yet: frontend, database, authentication, approvals, comments, test suite.

## Run

```bash
cd backend
npm install
npm run start:dev
```

The service listens on `http://localhost:3000`.

State is in memory and is seeded on startup, so **restarting the server resets every
request to its starting status**. That matters when verifying, because a request left in
IN_PROGRESS by an earlier command will accept moves that a fresh SUBMITTED request refuses.

Seeded requests:

| id | department | starting status |
|---|---|---|
| 123 | IT | SUBMITTED |
| 124 | HR | ASSIGNED |
| 125 | FINANCE | IN_PROGRESS |

## Verify

`GET /service-requests` and `GET /service-requests/:id` read state.
`POST /service-requests/:id/transition` with a body of `{"to":"<STATUS>"}` moves it.

On Windows PowerShell, put the body in a file — PowerShell mangles inline JSON quotes:

```powershell
'{"to":"ASSIGNED"}'    | Out-File -Encoding ascii to-assigned.json
'{"to":"IN_PROGRESS"}' | Out-File -Encoding ascii to-inprogress.json
'{"to":"RESOLVED"}'    | Out-File -Encoding ascii to-resolved.json
```

### Valid transitions — start from a fresh server

```powershell
curl.exe -i -X POST http://localhost:3000/service-requests/123/transition -H "Content-Type: application/json" -d "@to-assigned.json"
curl.exe -i -X POST http://localhost:3000/service-requests/123/transition -H "Content-Type: application/json" -d "@to-inprogress.json"
```

Both succeed. Request 123 ends as IN_PROGRESS with three history entries.

### Invalid transitions — restart the server first

```powershell
curl.exe -i -X POST http://localhost:3000/service-requests/123/transition -H "Content-Type: application/json" -d "@to-resolved.json"
curl.exe -i -X POST http://localhost:3000/service-requests/123/transition -H "Content-Type: application/json" -d "@to-inprogress.json"
```

Both return `400 Bad Request`:

```
Cannot transition from SUBMITTED to RESOLVED
Cannot transition from SUBMITTED to IN_PROGRESS
```

These are the two rules from `docs/product-spec.md` (FR5): a request must be assigned
before work starts, and it must be in progress before it can be resolved.

On macOS or Linux the same commands work with inline JSON:

```bash
curl -i -X POST http://localhost:3000/service-requests/123/transition \
  -H "Content-Type: application/json" -d '{"to":"ASSIGNED"}'
```

## Where the rule lives

All allowed moves are declared in one table, `ALLOWED_TRANSITIONS` in
`backend/src/service-requests/service-request.model.ts`. The service does one lookup
against it and rejects anything not listed. The controller only unpacks the HTTP request.

This follows `docs/architecture.md`: transition rules live in the backend and nowhere else.
A rule only the client enforces is not enforced.