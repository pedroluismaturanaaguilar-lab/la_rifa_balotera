const { getDb } = require('../database/db');

async function getAllSettings() {
  const db = await getDb();
  const rows = await db.all('SELECT key, value FROM settings');
  const settings = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  return settings;
}

async function getSetting(key) {
  const db = await getDb();
  const row = await db.get('SELECT value FROM settings WHERE key = ?', key);
  return row ? row.value : null;
}

async function setSetting(key, value) {
  const db = await getDb();
  await db.run(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
    key, value
  );
  return getSetting(key);
}

async function setManySettings(obj) {
  const db = await getDb();
  await db.exec('BEGIN TRANSACTION');
  try {
    for (const [key, value] of Object.entries(obj)) {
      await db.run(
        `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
        key, String(value)
      );
    }
    await db.exec('COMMIT');
  } catch (err) {
    await db.exec('ROLLBACK');
    throw err;
  }
  return getAllSettings();
}

module.exports = { getAllSettings, getSetting, setSetting, setManySettings };
