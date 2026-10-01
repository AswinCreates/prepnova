import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { pool } from '../config/db.js'

const initialAdmin = {
  name: process.env.INITIAL_ADMIN_NAME || 'Admin_Aswin',
  email: (process.env.INITIAL_ADMIN_EMAIL || 'aswin@admin.prepnova').trim().toLowerCase(),
  password: process.env.INITIAL_ADMIN_PASSWORD || 'aswinadm123',
}

async function seedAdmin() {
  const existing = await pool.query('SELECT id FROM users WHERE lower(email) = $1', [initialAdmin.email])
  if (existing.rowCount > 0) {
    await pool.query("UPDATE users SET role = 'admin' WHERE id = $1", [existing.rows[0].id])
    console.log(`Admin account is ready: ${initialAdmin.email}`)
    return
  }

  const passwordHash = await bcrypt.hash(initialAdmin.password, 12)
  await pool.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, 'admin')`,
    [initialAdmin.name, initialAdmin.email, passwordHash]
  )
  console.log(`Initial admin account created: ${initialAdmin.email}`)
}

seedAdmin()
  .catch((error) => {
    console.error('Admin account setup failed:', error.message)
    process.exitCode = 1
  })
  .finally(() => pool.end())
