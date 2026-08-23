/**
 * PrepNova - Seed data
 * Inserts a balanced question bank (technical + HR) across Easy/Medium/Hard
 * tiers, plus a demo user for quick local testing.
 * Run via: npm run db:seed
 */
import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { pool } from '../config/db.js'

// [mode, domain, difficulty, question, category, sample_answer]
const questions = [
  // ---------- Web Development ----------
  ['Technical', 'Web Development', 'Easy', 'What is the difference between let, const, and var in JavaScript?', 'JavaScript Basics', 'var is function-scoped and hoisted, let/const are block-scoped; const cannot be reassigned.'],
  ['Technical', 'Web Development', 'Easy', 'Explain the difference between `==` and `===` in JavaScript.', 'JavaScript Basics', '== performs type coercion, === requires strict equality of value and type.'],
  ['Technical', 'Web Development', 'Medium', 'Explain how the virtual DOM works in React.', 'React', 'React builds an in-memory representation of the UI, diffs changes, and patches only the affected real-DOM nodes.'],
  ['Technical', 'Web Development', 'Medium', 'What is a closure in JavaScript and how is it useful?', 'JavaScript Basics', 'A function that retains access to its lexical scope even after the outer function returns; useful for data privacy and currying.'],
  ['Technical', 'Web Development', 'Hard', 'How would you optimize the performance of a web application?', 'Performance', 'Lazy loading, code splitting, memoization, reducing re-renders, caching, CDN, minification, CDN + HTTP caching, image optimization.'],
  ['Technical', 'Web Development', 'Hard', 'Explain how React reconciliation and keys work under the hood.', 'React', 'React reconciles by comparing element trees, using keys to track element identity and avoid expensive re-creation.'],

  // ---------- Data Science ----------
  ['Technical', 'Data Science', 'Easy', 'What is the difference between supervised and unsupervised learning?', 'Machine Learning', 'Supervised uses labeled data to predict outputs; unsupervised finds structure in unlabeled data.'],
  ['Technical', 'Data Science', 'Medium', 'Explain overfitting and how you would prevent it.', 'Machine Learning', 'Model performs well on training but poorly on unseen data; prevent with regularization, cross-validation, more data, simpler models.'],
  ['Technical', 'Data Science', 'Medium', 'What is the difference between precision and recall?', 'Metrics', 'Precision = TP/(TP+FP); recall = TP/(TP+FN). Trade-off captured by the F1 score.'],
  ['Technical', 'Data Science', 'Hard', 'Describe how gradient descent works and what learning rate does.', 'Optimization', 'Iteratively adjusts parameters to minimize loss; learning rate controls step size and affects convergence.'],
  ['Technical', 'Data Science', 'Hard', 'How would you handle missing values in a dataset?', 'Data Cleaning', 'Impute with mean/median/mode, use model-based imputation, or drop rows based on missingness threshold; note bias trade-offs.'],

  // ---------- DSA ----------
  ['Technical', 'DSA', 'Easy', 'What is the time complexity of binary search and why?', 'Complexity', 'O(log n) because the search space halves each step.'],
  ['Technical', 'DSA', 'Easy', 'What is the difference between a stack and a queue?', 'Data Structures', 'Stack is LIFO, queue is FIFO.'],
  ['Technical', 'DSA', 'Medium', 'Describe how a hash map works and common collision handling strategies.', 'Data Structures', 'Key is hashed to an index; collisions handled via chaining or open addressing.'],
  ['Technical', 'DSA', 'Medium', 'Explain the difference between breadth-first search and depth-first search.', 'Graphs', 'BFS explores neighbors level-by-level (queue); DFS explores as far as possible along a branch (stack/recursion).'],
  ['Technical', 'DSA', 'Hard', 'How would you implement an LRU cache and what data structures would you use?', 'Design', 'A hash map plus a doubly-linked list for O(1) get/put and eviction of the least recently used entries.'],
  ['Technical', 'DSA', 'Hard', 'Explain dynamic programming and the difference between memoization and tabulation.', 'Algorithm Design', 'DP solves overlapping subproblems; memoization is top-down caching, tabulation is bottom-up iterative.'],

  // ---------- System Design ----------
  ['Technical', 'System Design', 'Medium', 'How would you design a scalable URL shortener?', 'System Design', 'Generate short unique ids, store mapping in DB, add caching and redirect; consider capacity planning.'],
  ['Technical', 'System Design', 'Medium', 'Explain how you would design a rate limiter.', 'System Design', 'Token bucket or sliding window counters; enforce per-user/API limits, return 429, optionally via Redis.'],
  ['Technical', 'System Design', 'Hard', 'How would you design a social media feed for millions of users?', 'System Design', 'Fan-out on write vs read, CDN/caching, pagination, consistent reads, event-driven ingestion.'],
  ['Technical', 'System Design', 'Hard', 'What is the CAP theorem and how does it apply to database choices?', 'System Design', 'Consistency, availability, partition tolerance trade-off; different DBs optimize for different pairs.'],

  // ---------- HR / Behavioral ----------
  ['HR', 'HR / Behavioral', 'Easy', 'Tell me about yourself.', 'Behavioral', 'Give a concise pitch covering background, relevant skills, and what you are looking for.'],
  ['HR', 'HR / Behavioral', 'Medium', 'Describe a challenging bug you fixed and how you approached it.', 'Behavioral', 'Use STAR: situation, task, action, result.'],
  ['HR', 'HR / Behavioral', 'Medium', 'Why do you want to work for this company?', 'Behavioral', 'Research the company; align your goals with their mission and products.'],
  ['HR', 'HR / Behavioral', 'Hard', 'Describe a time you had a conflict with a teammate and how you resolved it.', 'Behavioral', 'Use STAR; emphasize communication, empathy, and a constructive outcome.'],
  ['HR', 'HR / Behavioral', 'Hard', 'Where do you see yourself in five years?', 'Behavioral', 'Show ambition aligned with the role and company growth; be honest and specific.'],
]
// Demo account (email/password) for quick testing.
const demoUser = { name: 'Demo User', email: 'demo@prepnova.com', password: 'Demo123!' }

async function seed() {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    for (const [mode, domain, difficulty, question_text, category, sample_answer] of questions) {
      await client.query(
        `INSERT INTO questions (mode, domain, difficulty, question_text, sample_answer, category)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (question_text) DO NOTHING`,
        [mode, domain, difficulty, question_text, sample_answer, category]
      )
    }

    // Demo user (skip if email already exists).
    const existing = await client.query('SELECT id FROM users WHERE email = $1', [demoUser.email])
    if (existing.rowCount === 0) {
      const hash = await bcrypt.hash(demoUser.password, 10)
      await client.query(
        `INSERT INTO users (name, email, password_hash, preferred_domain)
         VALUES ($1,$2,$3,$4)`,
        [demoUser.name, demoUser.email, hash, 'Web Development']
      )
    }

    await client.query('COMMIT')
    const questionCount = await client.query('SELECT COUNT(*)::int AS n FROM questions')
    console.log(`✅ Seed complete: ${questionCount.rows[0].n} questions ready.`)
    console.log(`✅ Demo user ready: ${demoUser.email} / ${demoUser.password}`)
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

seed()
  .catch((err) => {
    console.error('❌ Seed failed:', err.message)
    process.exitCode = 1
  })
  .finally(() => pool.end())