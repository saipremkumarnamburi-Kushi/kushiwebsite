CREATE TABLE IF NOT EXISTS interview_bookings (
 id uuid PRIMARY KEY,
 student_id text NOT NULL,
 student_name text NOT NULL CHECK(length(student_name) BETWEEN 2 AND 80),
 student_email text NOT NULL,
 starts_at timestamptz NOT NULL,
 topic text NOT NULL CHECK(topic IN ('D365 CRM','Power Automate','Azure Integration','JavaScript & APIs')),
 experience text NOT NULL CHECK(experience IN ('Beginner','Intermediate','Experienced')),
 notes text NOT NULL DEFAULT '' CHECK(length(notes)<=1000),
 status text NOT NULL DEFAULT 'confirmed' CHECK(status IN ('confirmed','cancelled')),
 meeting_url text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(),
 cancelled_at timestamptz,
 CHECK (extract(second from starts_at)=0)
);
CREATE UNIQUE INDEX IF NOT EXISTS one_confirmed_interview_per_slot ON interview_bookings(starts_at) WHERE status='confirmed';
CREATE INDEX IF NOT EXISTS student_interview_history ON interview_bookings(student_id, starts_at);
CREATE TABLE IF NOT EXISTS interview_blocks (
 starts_at timestamptz PRIMARY KEY,
 created_by text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
-- All access occurs in authenticated server routes, never directly from a browser.
-- A shared transaction advisory lock serializes slot reservations and instructor blocks.
-- Do not grant this database connection to browser code.
