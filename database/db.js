const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'rifa.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

let dbInstance = null;

async function getDb() {
  if (dbInstance) return dbInstance;

  dbInstance = await open({
    filename: DB_PATH,
    driver: sqlite3.Database
  });

  await dbInstance.exec('PRAGMA foreign_keys = ON;');

  const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
  await dbInstance.exec(schema);

  return dbInstance;
}

module.exports = { getDb, DB_PATH };
