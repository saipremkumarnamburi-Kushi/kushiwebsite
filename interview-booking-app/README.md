# Interview Studio — book a mock interview

Student booking app and instructor dashboard for Sai Kushal Chowdary. Vercel project: `prj_QH93ZMjvZZTXZtBVvZmFtBTX8TGa`; team: `team_GMT4UNXb8lxXdJfcINhLYex5`.

## Agreed availability
- 30-minute interviews.
- Monday–Friday, 7–9 PM IST (last start: 8:30 PM).
- Saturday–Sunday, 10 AM–1 PM IST (last start: 12:30 PM).
- Book between 2 hours and 28 days ahead.
- A student may hold up to 3 upcoming appointments.
- Students may cancel before a session starts; no rescheduling transaction is included (cancel then book again).

## Implemented
- Responsive booking page with D365 CRM, Power Automate, Azure Integration and JavaScript & APIs tracks.
- Clerk sign-in UI; server-verified session tokens and verified primary email.
- PostgreSQL bookings, private per-student history, cancellations and .ics calendar downloads.
- Instructor-only dashboard, student preparation notes, meeting links and blocked slots.
- A unique partial database index prevents duplicate confirmed reservations for one slot. A transaction advisory lock serializes booking and block inserts. ReadCommitted isolation ensures later statements see prior commits after the lock.
- Limits of 3 future confirmed bookings and 10 created bookings per hour per account, enforced inside the locked transaction.
- A setup notice and disabled booking controls until authentication, database and schema are present. No sample bookings or fake confirmations.
- Original practice app available at `/practice.html` (its history remains browser-local and it does not require sign-in).

## One-time setup required before real bookings
1. Connect the installed Clerk integration to `kushal-interview-studio` for Preview and Production. Required variables: `CLERK_SECRET_KEY` and `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (or `CLERK_PUBLISHABLE_KEY`). Configure sign-up and verified email in Clerk. Do not paste secret keys in chat.
2. Provision a Neon PostgreSQL database through Vercel Storage and connect it to this project. It must supply server-side `DATABASE_URL` for the target environments.
3. Run `db/schema.sql` once in the Neon SQL editor or using an authenticated migration process. It creates new tables and indexes and does not drop existing data.
4. Sign up as the instructor through the app. In the Clerk dashboard set that user's **private metadata** to `{"role":"instructor"}` (merge this key with any other private metadata). Alternatively set `INSTRUCTOR_CLERK_USER_ID` in Vercel to the instructor's exact Clerk user ID. Never use student-editable metadata for roles.
5. Configure the Clerk production domain and permitted redirect URLs. The app verifies tokens against `https://kushal-interview-studio.vercel.app`, the exact Vercel deployment/branch URLs, and any comma-separated `APP_ORIGINS` set by the owner. Do not add wildcard origins.
6. Redeploy after configuring environment variables. Confirm `/api/config` reports `ready: true`.

## Before launch
Run two separate student accounts and one instructor account through:
- Sign up, verify email, sign in, book, reload and view My interviews.
- Concurrent requests for the same slot: exactly one succeeds and one gets 409.
- Student A cannot read or cancel student B's appointments, and student tokens get 403 on instructor routes.
- Instructor block versus booking race: only one succeeds.
- Instructor sets a meeting link; the student sees it. Cancel releases the slot.
- Download .ics and inspect time in a calendar using IST and another timezone.
These live identity/database checks are pending provider connection. Do not treat a successful deployment as an end-to-end booking test.

## Development and validation
`npm ci`, `npm test`, `npm run build`.
Vercel deploys static files from `dist` and Node functions from `api`.
Runtime dependencies are `@clerk/backend` and `@neondatabase/serverless`.
Tests exercise schedule validation and fail-closed API behavior. No production credentials are included.

## Deliberate limitations
No automatic email notifications, payment collection, external calendar conflict detection, automatic Teams/Meet/Zoom creation, attendance tracking or instructor-set recurring hours editor. Add meeting URLs manually in the instructor dashboard and check it for new bookings. Calendar downloads do not automatically update after changes or cancellations. The availability in this app does not read your personal calendar. All appointment data stays on the server; the browser receives only the authenticated user's bookings (or instructor-authorized results).
