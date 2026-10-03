-- ======================================================================
-- PrepNova - PostgreSQL Schema
-- Run via: npm run db:migrate   (creates <PGDATABASE> tables if absent)
-- ======================================================================

CREATE TABLE IF NOT EXISTS users (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(120) NOT NULL,
  email           VARCHAR(255) NOT NULL UNIQUE,
  password_hash   VARCHAR(255) NOT NULL,
  preferred_domain VARCHAR(100),
  target_skills   TEXT[] NOT NULL DEFAULT '{}',
  role            VARCHAR(20) NOT NULL DEFAULT 'user',
  login_count     INTEGER NOT NULL DEFAULT 0,
  last_login_at   TIMESTAMPTZ,
  headline        VARCHAR(160),
  experience_level VARCHAR(30),
  location        VARCHAR(120),
  state           VARCHAR(120),
  country         VARCHAR(120),
  target_role     VARCHAR(160),
  bio             TEXT,
  linkedin_url    TEXT,
  portfolio_url   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS headline VARCHAR(160);
ALTER TABLE users ADD COLUMN IF NOT EXISTS experience_level VARCHAR(30);
ALTER TABLE users ADD COLUMN IF NOT EXISTS location VARCHAR(120);
ALTER TABLE users ADD COLUMN IF NOT EXISTS state VARCHAR(120);
ALTER TABLE users ADD COLUMN IF NOT EXISTS country VARCHAR(120);
ALTER TABLE users ADD COLUMN IF NOT EXISTS target_role VARCHAR(160);
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS portfolio_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user';
ALTER TABLE users ADD COLUMN IF NOT EXISTS login_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'users_role_check' AND conrelid = 'users'::regclass
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('user', 'admin'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS login_events (
  id          BIGSERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  logged_in_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_login_events_logged_in_at ON login_events(logged_in_at);
CREATE INDEX IF NOT EXISTS idx_login_events_user ON login_events(user_id);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

CREATE TABLE IF NOT EXISTS notifications (
  id          BIGSERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        VARCHAR(40) NOT NULL,
  title       VARCHAR(140) NOT NULL,
  message     TEXT NOT NULL,
  link        VARCHAR(255),
  dedupe_key  VARCHAR(180) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at     TIMESTAMPTZ,
  UNIQUE (user_id, dedupe_key)
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread
  ON notifications(user_id) WHERE read_at IS NULL;

CREATE TABLE IF NOT EXISTS support_tickets (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject     VARCHAR(160) NOT NULL,
  category    VARCHAR(40) NOT NULL CHECK (category IN ('Question','Technical issue','Account','Feedback','Complaint','Other')),
  status      VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','closed')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at   TIMESTAMPTZ,
  closed_by   INTEGER REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user_updated
  ON support_tickets(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status_updated
  ON support_tickets(status, updated_at DESC);

CREATE TABLE IF NOT EXISTS support_ticket_messages (
  id          BIGSERIAL PRIMARY KEY,
  ticket_id   INTEGER NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_id   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  sender_role VARCHAR(20) NOT NULL CHECK (sender_role IN ('user','admin')),
  message     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_ticket
  ON support_ticket_messages(ticket_id, created_at, id);

-- Registration signs users in immediately, so count that initial session for
-- accounts created before registration began recording login events.
INSERT INTO login_events (user_id, logged_in_at)
SELECT users.id, users.created_at
FROM users
WHERE users.role = 'user'
  AND users.login_count = 0
  AND users.last_login_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM login_events WHERE login_events.user_id = users.id
  );

UPDATE users
SET login_count = 1, last_login_at = created_at
WHERE role = 'user'
  AND login_count = 0
  AND last_login_at IS NULL
  AND EXISTS (
    SELECT 1 FROM login_events
    WHERE login_events.user_id = users.id
      AND login_events.logged_in_at = users.created_at
  );

CREATE TABLE IF NOT EXISTS interviews (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mode          VARCHAR(20) NOT NULL CHECK (mode IN ('Technical','HR')),
  domain        VARCHAR(100) NOT NULL,
  difficulty    VARCHAR(20) NOT NULL CHECK (difficulty IN ('Easy','Medium','Hard')),
  target_role   VARCHAR(160),
  job_description TEXT,
  status        VARCHAR(20) NOT NULL DEFAULT 'in_progress'
                CHECK (status IN ('in_progress','completed','cancelled')),
  total_score   INTEGER,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at  TIMESTAMPTZ
);

ALTER TABLE interviews ADD COLUMN IF NOT EXISTS target_role VARCHAR(160);
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS job_description TEXT;

CREATE INDEX IF NOT EXISTS idx_interviews_user ON interviews(user_id);

-- Store the active leaderboard epoch without deleting interview history.
CREATE TABLE IF NOT EXISTS leaderboard_control (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  reset_at TIMESTAMPTZ,
  reset_by INTEGER
);

INSERT INTO leaderboard_control (id, reset_at)
VALUES (1, NULL)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS questions (
  id            SERIAL PRIMARY KEY,
  mode          VARCHAR(20) NOT NULL DEFAULT 'Technical',
  domain        VARCHAR(100) NOT NULL,
  difficulty    VARCHAR(20) NOT NULL DEFAULT 'Medium'
                CHECK (difficulty IN ('Easy','Medium','Hard')),
  question_text TEXT NOT NULL UNIQUE,
  sample_answer TEXT,
  category      VARCHAR(80)
);

ALTER TABLE questions ADD COLUMN IF NOT EXISTS is_compulsory BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS question_type VARCHAR(10) NOT NULL DEFAULT 'written';
ALTER TABLE questions ADD COLUMN IF NOT EXISTS options JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS correct_option_index SMALLINT;
ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_question_type_check;
ALTER TABLE questions ADD CONSTRAINT questions_question_type_check CHECK (question_type IN ('written', 'mcq'));
ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_correct_option_index_check;
ALTER TABLE questions ADD CONSTRAINT questions_correct_option_index_check
  CHECK (correct_option_index IS NULL OR correct_option_index BETWEEN 0 AND 3);

-- These three behavioral prompts are part of every interview, regardless of
-- the selected mode or domain. Upsert them so existing question banks migrate safely.
INSERT INTO questions (mode, domain, difficulty, question_text, category, is_compulsory)
VALUES
  ('Both', 'General', 'Easy', 'Tell me about yourself.', 'Core behavioral', true),
  ('Both', 'General', 'Medium', 'What are your greatest strengths, and how have you used them?', 'Core behavioral', true),
  ('Both', 'General', 'Medium', 'What is one weakness you are working to improve, and what steps are you taking to overcome it?', 'Core behavioral', true),
  ('HR', 'HR / Behavioral', 'Medium', 'Why should we hire you for this role?', 'Behavioral', false),
  ('HR', 'HR / Behavioral', 'Easy', 'What motivates you in your work?', 'Behavioral', false),
  ('HR', 'HR / Behavioral', 'Medium', 'Tell me about a mistake you made and what you learned from it.', 'Behavioral', false),
  ('HR', 'HR / Behavioral', 'Medium', 'Describe a time you handled pressure at work or school.', 'Behavioral', false),
  ('HR', 'HR / Behavioral', 'Medium', 'Tell me about a time you received critical feedback and applied it.', 'Behavioral', false),
  ('HR', 'HR / Behavioral', 'Medium', 'How do you prioritize when you have multiple deadlines?', 'Behavioral', false),
  ('HR', 'HR / Behavioral', 'Easy', 'What kind of work environment helps you do your best work?', 'Behavioral', false),
  ('HR', 'HR / Behavioral', 'Medium', 'Tell me about a time you took initiative on a project.', 'Behavioral', false),
  ('HR', 'HR / Behavioral', 'Medium', 'How do you handle disagreements with a teammate?', 'Behavioral', false),
  ('HR', 'HR / Behavioral', 'Easy', 'What professional accomplishment are you most proud of?', 'Behavioral', false),
  ('HR', 'HR / Behavioral', 'Medium', 'How do you adapt when priorities change unexpectedly?', 'Behavioral', false),
  ('HR', 'HR / Behavioral', 'Easy', 'What are you looking for in your next role?', 'Behavioral', false),
  ('HR', 'HR / Behavioral', 'Medium', 'Describe working with someone whose style differed from yours.', 'Behavioral', false),
  ('HR', 'HR / Behavioral', 'Medium', 'How do you build trust with new teammates?', 'Behavioral', false)
ON CONFLICT (question_text) DO UPDATE
SET mode = EXCLUDED.mode,
    domain = EXCLUDED.domain,
    difficulty = EXCLUDED.difficulty,
    category = EXCLUDED.category,
    is_compulsory = EXCLUDED.is_compulsory;

UPDATE questions SET domain = 'Frontend Development' WHERE domain = 'Web Development' AND mode = 'Technical';
UPDATE questions SET domain = 'Data Structures & Algorithms' WHERE domain = 'DSA' AND mode = 'Technical';

INSERT INTO questions
  (mode, domain, difficulty, question_text, sample_answer, category, question_type, options, correct_option_index)
VALUES
  ('Technical', 'Frontend Development', 'Easy', 'Which HTML element is used to create a hyperlink?', 'The anchor element, <a>.', 'HTML', 'mcq', jsonb_build_array('<link>', '<a>', '<href>', '<url>'), 1),
  ('Technical', 'Frontend Development', 'Medium', 'What is the main purpose of the virtual DOM in React?', 'It compares UI trees and minimizes updates to the real DOM.', 'React', 'mcq', jsonb_build_array('To replace JavaScript', 'To minimize real DOM updates', 'To store server data permanently', 'To compile CSS'), 1),
  ('Technical', 'Frontend Development', 'Medium', 'How would you improve the accessibility of a form?', 'Use associated labels, semantic controls, clear errors, keyboard access, and suitable ARIA only when needed.', 'Accessibility', 'written', '[]'::jsonb, NULL),
  ('Technical', 'Backend Development', 'Easy', 'Which HTTP status code commonly indicates a successfully created resource?', '201 Created.', 'HTTP', 'mcq', jsonb_build_array('200', '201', '301', '404'), 1),
  ('Technical', 'Backend Development', 'Medium', 'How would you protect an API endpoint that updates a user profile?', 'Authenticate the user, authorize ownership, validate input, use parameterized queries, and apply rate limits where appropriate.', 'API Security', 'written', '[]'::jsonb, NULL),
  ('Technical', 'Backend Development', 'Hard', 'How would you make a payment endpoint safe to retry after a network timeout?', 'Use idempotency keys, persist request state transactionally, and return the original result for duplicate requests.', 'Distributed Systems', 'written', '[]'::jsonb, NULL),
  ('Technical', 'Full Stack Development', 'Medium', 'A form submits successfully but the page shows stale data. How would you debug it?', 'Trace the request and response, verify state/cache invalidation, inspect errors, and update the UI from the saved response.', 'Debugging', 'written', '[]'::jsonb, NULL),
  ('Technical', 'Full Stack Development', 'Easy', 'Where should input validation happen in a full stack application?', 'Validate in the client for fast feedback and again on the server as the security and data-integrity boundary.', 'Architecture', 'mcq', jsonb_build_array('Only in the browser', 'Only in a database report', 'In the client and on the server', 'Only after data is saved'), 2),
  ('Technical', 'Full Stack Development', 'Hard', 'How would you trace a slow user request across the browser, API, and database?', 'Correlate request IDs, inspect browser/network timing, instrument service spans and database queries, then profile the slow segment.', 'Observability', 'written', '[]'::jsonb, NULL),
  ('Technical', 'Mobile App Development', 'Easy', 'What is the purpose of a mobile app lifecycle callback?', 'It lets the app respond to transitions such as foregrounding, backgrounding, or termination.', 'App Lifecycle', 'written', '[]'::jsonb, NULL),
  ('Technical', 'Mobile App Development', 'Medium', 'Why should long-running work avoid the main UI thread?', 'Blocking it makes the interface unresponsive; background work keeps rendering and input responsive.', 'Performance', 'mcq', jsonb_build_array('To reduce app permissions', 'To keep the interface responsive', 'To make requests synchronous', 'To disable rendering'), 1),
  ('Technical', 'Mobile App Development', 'Hard', 'How would you handle an app workflow when connectivity is unreliable?', 'Cache needed data, queue safe writes, expose sync state, resolve conflicts deliberately, and retry with backoff.', 'Offline Support', 'written', '[]'::jsonb, NULL),
  ('Technical', 'Database Management', 'Easy', 'Which SQL clause filters rows before they are grouped?', 'WHERE filters rows before GROUP BY.', 'SQL', 'mcq', jsonb_build_array('ORDER BY', 'HAVING', 'WHERE', 'LIMIT'), 2),
  ('Technical', 'Database Management', 'Hard', 'When would you add a database index, and what trade-off does it introduce?', 'Indexes speed up suitable reads but consume storage and add work to inserts, updates, and deletes.', 'Indexing', 'written', '[]'::jsonb, NULL),
  ('Technical', 'Database Management', 'Medium', 'What problem does a database transaction solve?', 'It groups operations so they commit or roll back together while preserving consistency under concurrent access.', 'Transactions', 'written', '[]'::jsonb, NULL),
  ('Technical', 'Cloud Computing', 'Easy', 'What does autoscaling do in a cloud environment?', 'It adjusts the number of resources to match load or configured policies.', 'Cloud Fundamentals', 'mcq', jsonb_build_array('Encrypts every database field', 'Adjusts resources to changing demand', 'Replaces application monitoring', 'Removes the need for backups'), 1),
  ('Technical', 'Cloud Computing', 'Medium', 'How would you design a reliable backup and recovery plan for a cloud service?', 'Define RPO/RTO, automate encrypted backups, retain copies across failure domains, and test restores regularly.', 'Reliability', 'written', '[]'::jsonb, NULL),
  ('Technical', 'Cloud Computing', 'Hard', 'A cloud service must remain available if one region fails. What would you plan for?', 'Use multi-region architecture where justified, replicate data with understood consistency, route traffic safely, and test failover.', 'High Availability', 'written', '[]'::jsonb, NULL),
  ('Technical', 'DevOps & SRE', 'Easy', 'What is the main purpose of a CI pipeline?', 'To automatically build and validate changes as they are integrated.', 'CI/CD', 'mcq', jsonb_build_array('To replace code review', 'To automatically build and validate changes', 'To store production passwords in source', 'To prevent deployments'), 1),
  ('Technical', 'DevOps & SRE', 'Hard', 'A deployment increases error rates. How would you respond?', 'Use alerts and deployment markers, mitigate or roll back, assess impact, communicate, then investigate and prevent recurrence.', 'Incident Response', 'written', '[]'::jsonb, NULL),
  ('Technical', 'DevOps & SRE', 'Medium', 'What is the difference between a service-level indicator and a service-level objective?', 'An SLI is a measured reliability signal; an SLO is the target range for that signal over a defined window.', 'Reliability', 'written', '[]'::jsonb, NULL),
  ('Technical', 'Cybersecurity', 'Easy', 'Which practice best protects passwords stored by an application?', 'Hash passwords with a purpose-built adaptive algorithm and unique salt.', 'Application Security', 'mcq', jsonb_build_array('Store them as plain text', 'Encrypt with a shared hard-coded key', 'Hash with a unique salt using an adaptive algorithm', 'Encode them with Base64'), 2),
  ('Technical', 'Cybersecurity', 'Medium', 'What is SQL injection, and how do parameterized queries prevent it?', 'It is untrusted input altering SQL structure; parameters keep data separate from executable query syntax.', 'Application Security', 'written', '[]'::jsonb, NULL),
  ('Technical', 'Cybersecurity', 'Hard', 'How would you respond after discovering a leaked production credential?', 'Revoke and rotate it, assess access and logs, contain exposure, notify responsible teams, and remove the secret from future builds.', 'Incident Response', 'written', '[]'::jsonb, NULL),
  ('Technical', 'QA & Testing', 'Easy', 'What does a unit test usually verify?', 'A small unit of code in isolation.', 'Testing Fundamentals', 'mcq', jsonb_build_array('A full production deployment', 'A small unit of code in isolation', 'Only the user interface visually', 'Network availability across regions'), 1),
  ('Technical', 'QA & Testing', 'Medium', 'How would you choose which regression tests to run first after a risky change?', 'Prioritize changed code paths, high-impact workflows, recent defect areas, and fast automated checks.', 'Test Strategy', 'written', '[]'::jsonb, NULL),
  ('Technical', 'QA & Testing', 'Hard', 'What makes an automated test flaky, and how would you make it reliable?', 'Timing, shared state, uncontrolled dependencies, or randomness can cause flakes; isolate state and use deterministic synchronization.', 'Test Reliability', 'written', '[]'::jsonb, NULL),
  ('Technical', 'Machine Learning & AI', 'Easy', 'What does a model learn from its training data?', 'Patterns that help map input features to target outcomes.', 'Machine Learning', 'written', '[]'::jsonb, NULL),
  ('Technical', 'Machine Learning & AI', 'Medium', 'Which data split should be used to estimate how a model performs on unseen examples?', 'A held-out test set that was not used for training or model selection.', 'Model Evaluation', 'mcq', jsonb_build_array('Training set', 'Held-out test set', 'The full dataset after training', 'Only the largest class'), 1),
  ('Technical', 'Machine Learning & AI', 'Hard', 'How would you detect and reduce data leakage in a machine learning pipeline?', 'Audit feature timing and preprocessing, split before fitting transforms, and ensure no target-derived information reaches training features.', 'Model Quality', 'written', '[]'::jsonb, NULL),
  ('Technical', 'Networking', 'Easy', 'What does DNS primarily do?', 'It resolves domain names to IP addresses.', 'Networking Basics', 'mcq', jsonb_build_array('Encrypts files', 'Resolves domain names to IP addresses', 'Assigns database indexes', 'Compresses HTTP responses'), 1),
  ('Technical', 'Networking', 'Medium', 'How would you distinguish a DNS issue from an application server issue?', 'Check name resolution independently, then test connectivity and HTTP response using the resolved address and service logs.', 'Troubleshooting', 'written', '[]'::jsonb, NULL),
  ('Technical', 'Networking', 'Hard', 'A client can resolve a hostname but cannot connect to the service. What would you investigate?', 'Check routing, firewall rules, port listening state, TLS negotiation, and server-side logs, testing each layer separately.', 'Troubleshooting', 'written', '[]'::jsonb, NULL),
  ('Technical', 'Product & UI Engineering', 'Medium', 'How would you measure whether a new UI flow is easier for users?', 'Define a task success metric, observe usability sessions, compare completion and error rates, and gather qualitative feedback.', 'Product Quality', 'written', '[]'::jsonb, NULL),
  ('Technical', 'Product & UI Engineering', 'Easy', 'Which practice helps keep a user interface usable with a keyboard?', 'Provide visible focus states and ensure controls can be reached and activated with keyboard input.', 'Accessibility', 'mcq', jsonb_build_array('Remove focus outlines', 'Use only hover interactions', 'Provide visible focus and keyboard-operable controls', 'Make all controls decorative'), 2),
  ('Technical', 'Product & UI Engineering', 'Hard', 'How would you decide between adding a new feature and fixing a usability issue?', 'Compare user impact, evidence, reach, risk, and effort, then make the trade-off visible to stakeholders.', 'Product Judgment', 'written', '[]'::jsonb, NULL),
  ('Technical', 'Embedded Systems & IoT', 'Easy', 'Why do embedded systems often have strict memory and power budgets?', 'They run on constrained devices where memory, energy, heat, and cost are limited.', 'Embedded Fundamentals', 'written', '[]'::jsonb, NULL),
  ('Technical', 'Embedded Systems & IoT', 'Medium', 'How can a microcontroller communicate reliably with a sensor over an unreliable bus?', 'Validate readings, use timeouts and retries where safe, detect bus errors, and provide a known recovery path.', 'Device Reliability', 'written', '[]'::jsonb, NULL),
  ('Technical', 'Embedded Systems & IoT', 'Hard', 'How would you investigate intermittent resets on a battery-powered device?', 'Capture reset causes and power traces, reproduce under load and temperature changes, and inspect brownout, watchdog, and firmware paths.', 'Debugging', 'written', '[]'::jsonb, NULL),
  ('Technical', 'Blockchain & Web3', 'Easy', 'What is the purpose of a cryptographic hash in a blockchain?', 'It creates a fixed-size digest that helps link blocks and detect data changes.', 'Blockchain Fundamentals', 'mcq', jsonb_build_array('To hide all transaction fees', 'To link blocks and detect changes', 'To make every transaction reversible', 'To replace digital signatures'), 1),
  ('Technical', 'Blockchain & Web3', 'Medium', 'Why should smart contracts be tested for re-entrancy vulnerabilities?', 'A malicious external call may re-enter a function before state updates, potentially repeating an operation.', 'Smart Contract Security', 'written', '[]'::jsonb, NULL),
  ('Technical', 'Blockchain & Web3', 'Hard', 'What trade-offs would you explain when choosing an on-chain versus off-chain data design?', 'Compare decentralization, cost, throughput, privacy, integrity needs, and how off-chain data can be verified.', 'Architecture', 'written', '[]'::jsonb, NULL),
  ('HR', 'Communication', 'Easy', 'How do you make a complex idea understandable to someone outside your field?', 'Adapt vocabulary to the audience, lead with the main point, and use a concrete example.', 'Communication', 'written', '[]'::jsonb, NULL),
  ('HR', 'Communication', 'Medium', 'Tell me about a time you had to share difficult news with a colleague or customer.', 'Be candid and empathetic, explain the facts and impact, and clarify next steps.', 'Communication', 'written', '[]'::jsonb, NULL),
  ('HR', 'Communication', 'Easy', 'What would you do if you realized your message had been misunderstood?', 'Check what the other person understood, clarify in plain language, and confirm agreement on next steps.', 'Communication', 'written', '[]'::jsonb, NULL),
  ('HR', 'Leadership & Teamwork', 'Medium', 'Tell me about a time you helped a team deliver a shared goal.', 'Use a specific example, clarify your contribution, collaboration, and the result.', 'Teamwork', 'written', '[]'::jsonb, NULL),
  ('HR', 'Leadership & Teamwork', 'Hard', 'How do you bring a quiet or overlooked teammate into a group decision?', 'Create space for input, invite views without pressure, and ensure the decision reflects relevant perspectives.', 'Inclusive Leadership', 'written', '[]'::jsonb, NULL),
  ('HR', 'Leadership & Teamwork', 'Easy', 'What does being a dependable teammate mean to you?', 'Follow through on commitments, communicate early about risks, and offer help responsibly.', 'Teamwork', 'written', '[]'::jsonb, NULL),
  ('HR', 'Conflict Resolution', 'Medium', 'A teammate disagrees with your approach shortly before a deadline. What do you do?', 'Listen to their concerns, compare options against shared criteria, agree on a timely decision, and keep communication respectful.', 'Conflict Resolution', 'written', '[]'::jsonb, NULL),
  ('HR', 'Conflict Resolution', 'Easy', 'How do you keep a disagreement focused on the work rather than the person?', 'Use specific facts, ask questions, listen actively, and agree on a shared goal and next step.', 'Conflict Resolution', 'written', '[]'::jsonb, NULL),
  ('HR', 'Conflict Resolution', 'Hard', 'Tell me about a disagreement that changed your perspective.', 'Describe the original view, what you listened to or learned, and how you adjusted your position.', 'Conflict Resolution', 'written', '[]'::jsonb, NULL),
  ('HR', 'Adaptability & Resilience', 'Medium', 'Describe a time you had to adjust quickly when priorities changed.', 'Explain the change, how you reprioritized and communicated, and what happened.', 'Adaptability', 'written', '[]'::jsonb, NULL),
  ('HR', 'Adaptability & Resilience', 'Easy', 'How do you respond when you are asked to use an unfamiliar tool or process?', 'Clarify the expected outcome, learn the essentials, ask focused questions, and seek feedback early.', 'Adaptability', 'written', '[]'::jsonb, NULL),
  ('HR', 'Adaptability & Resilience', 'Hard', 'Tell me about a setback that required you to change your plan.', 'Explain how you assessed the setback, revised the plan, communicated changes, and learned from the result.', 'Resilience', 'written', '[]'::jsonb, NULL),
  ('HR', 'Career Motivation', 'Easy', 'What interests you about this kind of work?', 'Connect genuine interests and strengths to the work and the value you want to contribute.', 'Motivation', 'written', '[]'::jsonb, NULL),
  ('HR', 'Career Motivation', 'Medium', 'What skills are you hoping to develop in your next role?', 'Identify relevant growth goals and explain how they connect to meaningful contributions.', 'Career Goals', 'written', '[]'::jsonb, NULL),
  ('HR', 'Career Motivation', 'Easy', 'What kind of work gives you a sense of accomplishment?', 'Describe the work and outcomes that motivate you, using an honest example.', 'Motivation', 'written', '[]'::jsonb, NULL),
  ('HR', 'Problem Solving', 'Medium', 'Tell me about a problem you solved with limited information.', 'Describe how you clarified assumptions, gathered evidence, evaluated options, and checked the outcome.', 'Problem Solving', 'written', '[]'::jsonb, NULL),
  ('HR', 'Problem Solving', 'Easy', 'What do you do first when a task is unclear?', 'Clarify the desired result, identify assumptions and constraints, and agree on the next step.', 'Problem Solving', 'written', '[]'::jsonb, NULL),
  ('HR', 'Problem Solving', 'Hard', 'Tell me about a decision where you had to balance speed and quality.', 'Explain the risks and constraints, how you chose an acceptable level of quality, and what you monitored.', 'Judgment', 'written', '[]'::jsonb, NULL),
  ('HR', 'Situational Judgment', 'Hard', 'You notice a serious mistake in work that is about to be presented. What would you do?', 'Raise it promptly and respectfully, share evidence, help correct or disclose it, and follow up on prevention.', 'Situational Judgment', 'written', '[]'::jsonb, NULL),
  ('HR', 'Situational Judgment', 'Medium', 'A stakeholder asks you to promise a deadline you are not sure you can meet. How do you respond?', 'Clarify scope and dependencies, give an evidence-based estimate, explain uncertainty, and agree when you will update them.', 'Judgment', 'written', '[]'::jsonb, NULL),
  ('HR', 'Situational Judgment', 'Easy', 'You have made a mistake that could affect a teammate. What do you do?', 'Tell the affected person promptly, own the mistake, help fix the impact, and share what you will change.', 'Accountability', 'written', '[]'::jsonb, NULL),
  ('HR', 'Work Ethic & Ownership', 'Medium', 'Tell me about a time you took responsibility for an outcome beyond your assigned tasks.', 'Explain why you stepped in, how you kept others informed, and the result without overstating your role.', 'Ownership', 'written', '[]'::jsonb, NULL),
  ('HR', 'Work Ethic & Ownership', 'Easy', 'How do you make sure you follow through on a commitment?', 'Track the commitment, break it into steps, and communicate early if something threatens delivery.', 'Accountability', 'written', '[]'::jsonb, NULL),
  ('HR', 'Work Ethic & Ownership', 'Hard', 'Tell me about a time you raised a risk others had not noticed.', 'Describe the evidence, how you raised it constructively, and the action or result that followed.', 'Ownership', 'written', '[]'::jsonb, NULL),
  ('HR', 'Time Management & Prioritization', 'Medium', 'How do you decide what to work on when several requests are urgent?', 'Compare impact, deadlines, dependencies, and effort; communicate trade-offs and agree on priorities.', 'Prioritization', 'written', '[]'::jsonb, NULL),
  ('HR', 'Time Management & Prioritization', 'Easy', 'How do you plan your work when a deadline is approaching?', 'Clarify the deliverable, break work into milestones, protect focus time, and surface risks early.', 'Time Management', 'written', '[]'::jsonb, NULL),
  ('HR', 'Time Management & Prioritization', 'Hard', 'Tell me about a time you had to renegotiate a deadline.', 'Explain why the original plan changed, how you communicated impact and options, and the agreed outcome.', 'Prioritization', 'written', '[]'::jsonb, NULL),
  ('HR', 'Culture & Values', 'Easy', 'What team values help you do your best work?', 'Name values that matter to you and explain how you demonstrate them in everyday work.', 'Work Style', 'written', '[]'::jsonb, NULL),
  ('HR', 'Culture & Values', 'Medium', 'Tell me about a time you had to work with someone whose priorities differed from yours.', 'Describe how you understood their priorities and aligned on shared outcomes respectfully.', 'Collaboration', 'written', '[]'::jsonb, NULL),
  ('HR', 'Culture & Values', 'Easy', 'What does a respectful workplace look like to you?', 'Describe practical behaviors such as listening, fairness, clear communication, and accountability.', 'Work Style', 'written', '[]'::jsonb, NULL),
  ('HR', 'People Management', 'Hard', 'How would you support a team member whose performance has recently declined?', 'Discuss privately, listen for causes, agree on clear support and expectations, and follow up consistently.', 'People Leadership', 'written', '[]'::jsonb, NULL),
  ('HR', 'People Management', 'Medium', 'How do you give constructive feedback to someone on your team?', 'Use specific observations, explain impact, invite their perspective, and agree on practical next steps.', 'People Leadership', 'written', '[]'::jsonb, NULL),
  ('HR', 'People Management', 'Easy', 'How would you help a new teammate feel included and productive?', 'Provide context, introductions, clear first steps, and regular opportunities to ask questions.', 'People Leadership', 'written', '[]'::jsonb, NULL)
ON CONFLICT (question_text) DO UPDATE
SET mode = EXCLUDED.mode,
    domain = EXCLUDED.domain,
    difficulty = EXCLUDED.difficulty,
    sample_answer = EXCLUDED.sample_answer,
    category = EXCLUDED.category,
    question_type = EXCLUDED.question_type,
    options = EXCLUDED.options,
    correct_option_index = EXCLUDED.correct_option_index;

CREATE TABLE IF NOT EXISTS answers (
  id                 SERIAL PRIMARY KEY,
  interview_id       INTEGER NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  question_id        INTEGER NOT NULL REFERENCES questions(id),
  user_id            INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  answer_text        TEXT,
  answer_mode        VARCHAR(10) NOT NULL DEFAULT 'typed'
                     CHECK (answer_mode IN ('typed','voice')),
  time_taken_seconds INTEGER,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (interview_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_answers_interview ON answers(interview_id);

CREATE TABLE IF NOT EXISTS evaluations (
  id                        SERIAL PRIMARY KEY,
  interview_id              INTEGER NOT NULL UNIQUE REFERENCES interviews(id) ON DELETE CASCADE,
  overall_score             INTEGER,
  summary                   TEXT,
  strengths                 TEXT[] NOT NULL DEFAULT '{}',
  weaknesses                TEXT[] NOT NULL DEFAULT '{}',
  improvements              TEXT[] NOT NULL DEFAULT '{}',
  question_evaluations_json JSONB,
  raw_ai_response           JSONB,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);
