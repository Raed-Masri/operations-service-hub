# Internal Operations Service Hub

One place for employees to submit internal requests (IT, HR, Finance) and follow what
happens to them. Today those requests travel through whatever channel is nearest, so they
get forgotten, reach the wrong person, and nobody can say who owns them or where they
stand.

**v0.3** delivers one narrow slice of that: a handler works a service request through its
lifecycle, and people see only what they are entitled to see. React frontend, NestJS
backend, SQLite via Prisma.

## Layout

```
backend/     NestJS API + Prisma schema, migrations and seed
frontend/    React (Vite) client
docs/
  product-spec.md                what the product must do
  architecture.md                which parts exist and who is responsible
  data-model.md                  what the system remembers and which rules protect it
  week2-agentic-workflow.md      how v0.2 was understood, directed and proved
  week3-full-stack-delivery.md   the v0.3 slice, its contract and its tests
  decisions/ADR-001.md           why approvals are records, not a boolean
```

## Requirements

Node 20.19 or newer. Node 20.18 fails to install Vite 8's native binding.

No database server needed — SQLite is a file.

## Install

```bash
# backend
cd backend
npm install
npx prisma migrate dev
npx prisma db seed

# frontend
cd ../frontend
npm install
```

`prisma migrate dev` creates `backend/prisma/dev.db` and applies the migrations.
`prisma db seed` loads four employees and three requests. Re-running the seed resets
everything to its starting state, which is useful when you have clicked a request forward
and want to start again.

## Run

Two terminals.

```bash
cd backend && npm run start:dev     # http://localhost:3000
cd frontend && npm run dev          # http://localhost:5173
```

Open http://localhost:5173.

## Exercise the flow

Everything below is done from the UI. The "Acting as" menu at the top right switches
identity — that is how you see the authorization rule work.

The seeded cast:

| id | who | role | department |
|---|---|---|---|
| `it-100` | Lina Aoun | handler | IT |
| `hr-100` | Samir Khoury | handler | HR |
| `emp-001` | Nour Haddad | requester | IT — owns requests 123 and 125 |
| `emp-002` | Karim Saab | requester | HR — owns request 124 |

1. **Acting as Lina (IT handler)**, click *Laptop will not boot*. The history shows one
   entry, from the seed.
2. Press **Resolved**. It is refused: *Cannot transition from SUBMITTED to RESOLVED*. A
   request must be worked on before it can be resolved.
3. Press **Assigned**, then **In progress**. Both succeed. The history grows and each entry
   names `it-100`.
4. Switch to **Samir (HR handler)**. The IT requests disappear from the list, because a
   handler only sees requests owned by their department.
5. Switch to **Karim**. He sees one request — his own.

To see the refusals at the HTTP level, with the backend running:

```bash
# allowed: the IT handler reads an IT request
curl -i http://localhost:3000/service-requests/123 -H "x-user-id: it-100"      # 200

# denied: the HR handler reads the same request
curl -i http://localhost:3000/service-requests/123 -H "x-user-id: hr-100"      # 403

# no identity at all
curl -i http://localhost:3000/service-requests                                 # 401

# a request that does not exist
curl -i -X POST http://localhost:3000/service-requests/nope/transition \
  -H "Content-Type: application/json" -H "x-user-id: it-100" -d '{"to":"ASSIGNED"}'   # 404
```

On Windows PowerShell use `curl.exe` and put the JSON body in a file, because PowerShell
mangles inline quotes:

```powershell
'{"to":"ASSIGNED"}' | Out-File -Encoding ascii to-assigned.json
curl.exe -i -X POST http://localhost:3000/service-requests/123/transition `
  -H "Content-Type: application/json" -H "x-user-id: it-100" -d "@to-assigned.json"
```

## Run the tests

From `backend`:

```bash
npm test                  # business rule — no database, no HTTP
npm run test:integration  # service against the real database
npm run test:e2e          # whole app over HTTP, plus regression checks
```

The integration and E2E suites reseed the database before each test, so they will reset
`dev.db` to its starting state. They run single-threaded because they share one SQLite
file.

What each suite protects is explained in `docs/week3-full-stack-delivery.md`.

## API

Every route needs an `x-user-id` header.

| Route | Success | Failures |
|---|---|---|
| `GET /service-requests` | 200, requests this caller may see | 401 |
| `GET /service-requests/:id` | 200, request with history | 401, 403, 404 |
| `POST /service-requests/:id/transition` `{"to":"ASSIGNED"}` | 200, updated request | 400, 401, 403, 404 |

The allowed moves live in one table, `ALLOWED_TRANSITIONS` in
`backend/src/service-requests/request.model.ts`. The service does one lookup against it and
refuses anything not listed.

