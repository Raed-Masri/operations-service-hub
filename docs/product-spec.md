# Problem

Right now if an employee needs something - laptop is broken, needs access to some system, needs a letter from HR, wants an expense approved, they just message someone or walk over to their desk.
There's no single place for this.

Problem with that: stuff gets forgotten, goes to the wrong person, and once it's out there nobody knows who's supposed to be handling it or where it stands.

Company wants one system for all of this instead.

# Actors

- Employee - the one asking for something
- Staff (IT, HR, ...) - picks up the request, works on it
- Manager - approves stuff

# Functional Requirements

- employee submits a request, picks what kind it is (IT, access, HR doc, expense, ...)
- employee can check status of their own requests
- staff can see the requests that are theirs to handle
- manager approves/rejects expense requests specifically
- maybe add a notification system for both sides

# Non-Functional Requirements

- works on phone and laptop browsers, not just one
- submitting shouldn't take forever, maybe under a minute
- people shouldn't be able to see each other's requests - only your own, or the staff assigned to it

# Known Facts

- employees currently ask through chat, email, in person. No single system
- this causes lost requests, wrong-person routing, unclear ownership
- company wants it only in one system

# Assumptions

- assuming every employee already has some login account
- assuming Manager is its own role separate from staff, only used for expense approval

# Unknowns

- does the system auto-assign a request to the right team, or does a person do that manually?
- can a request get moved between teams after it's submitted?
- is there urgency/priority on requests or are they all treated the same?

# Non-Goals

- not doing a mobile app, browser is enough
- not handling actual payment for expenses, just approve/reject
- internal only, not building anything customer facing

# Acceptance Criteria

- request shows up in the right team's queue immediately after submitting
- employee sees updated status when staff changes it
- expense can't be marked done without manager approving it first
