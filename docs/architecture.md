# Purpose & Scope

Requirements driving this:

- employee submits a request, sees its status
- staff sees requests assigned to them, updates status
- manager approves/rejects expense requests
- only the request owner + assigned staff can see request details

Actors: Employee, Staff member, Manager

Boundary: everything under "We Own" is inside our system.

# Structure & Flow

## Major parts - why each one exists

- App (web) - the actual screen people use. Exists because both "submit request" and "check status" need some kind of UI
- Backend - where the real logic lives. Exists so this stuff isn't scattered across every screen
- Request data - stores each request.

## Minimal flow (diagram)

```
                    Employee
                        |
                        v  <- identity crosses here
   +----------------- Our system ------------------+
   |                                                |
   |   +------------+      +----------------+       |
   |   |    App     | ---> |    Backend     |       |
   |   +------------+      +----------------+       |
   |                          |                     |
   |                          v                     |
   |                  +---------------+             |
   |                  | Request data  |             |
   |                  +---------------+             |
   +------------------------------------------------+
```

everything inside "Our system" = ours, we control it.

# Trust & Resilience

## Trust boundary

Browser to backend. Everything crossing is a claim. The client sends an identity token and a request id. A request id in a URL proves nothing about entitlement.

Backend to directory. What comes back is external input. It gets validated and translated into our own employee representation before anything else uses it. We do not keep a copy of the directory and call it truth.

Authentication is who you are. Authorization is what you may do. Being logged in does not entitle you to read someone else's employment letter request.

## Identity vs Permission

being logged in just proves who you are. doesn't mean you get to see everything.

employee only sees their OWN requests. staff only sees what's assigned to their team.

# Decisions

- One department owns a request at a time.
- The backend owns both integrations. The web app never calls the directory or the mail service directly.
