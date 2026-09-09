// scripts/reset-admin.js
//
// Uso:
//   node scripts/reset-admin.js ADMIN ADMIN123
//
// Crea el usuario administrador si no existe, o le cambia la contraseña
// si ya existe. No borra rifas, participantes, boletas ni historial:
// solo toca la tabla "users".

require('dotenv').config();
const { getDb } = require('../database/db');
const userModel = require('../models/userModel');
const bcrypt = require('bcryptjs');

async function run() {
  const username = process.argv[2] || process.env.ADMIN_USER || 'ADMIN';
  const password = process.argv[3] || process.env.ADMIN_PASSWORD || 'ADMIN123';

  if (password.length < 6) {
    console.error('La contraseña debe tener al menos 6 caracteres.');
    process.exit(1);
  }

  const db = await getDb();
  const existing = await userModel.findByUsername(username);
  const hash = await bcrypt.hash(password, 10);

  if (existing) {
    await db.run('UPDATE users SET password_hash = ?, username = ? WHERE id = ?', hash, username, existing.id);
    console.log(`Contraseña actualizada para el usuario "${username}".`);
  } else {
    await userModel.createUser(username, password, 'admin');
    console.log(`Usuario administrador "${username}" creado.`);
  }

  console.log(`Usuario:    ${username}`);
  console.log(`Contraseña: ${password}`);
  process.exit(0);
}

run().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
