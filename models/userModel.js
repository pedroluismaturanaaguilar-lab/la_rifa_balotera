const bcrypt = require('bcryptjs');
const { getDb } = require('../database/db');

async function findByUsername(username) {
  const db = await getDb();
  // COLLATE NOCASE: "ADMIN", "admin" o "Admin" deben funcionar igual para no
  // generar falsos "usuario o contraseña incorrectos" por mayúsculas/minúsculas.
  return db.get('SELECT * FROM users WHERE username = ? COLLATE NOCASE', (username || '').trim());
}

async function createUser(username, plainPassword, role = 'admin') {
  const db = await getDb();
  const hash = await bcrypt.hash(plainPassword, 10);
  const result = await db.run(
    'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
    username, hash, role
  );
  return { id: result.lastID, username, role };
}

async function verifyPassword(user, plainPassword) {
  if (!user) return false;
  return bcrypt.compare(plainPassword, user.password_hash);
}

async function countUsers() {
  const db = await getDb();
  const row = await db.get('SELECT COUNT(*) as count FROM users');
  return row.count;
}

module.exports = { findByUsername, createUser, verifyPassword, countUsers };
