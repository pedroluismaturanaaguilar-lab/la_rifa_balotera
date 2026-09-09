const { getDb } = require('../database/db');

async function listByRaffle(raffleId) {
  const db = await getDb();
  const participants = await db.all(
    `SELECT p.*, (SELECT COUNT(*) FROM tickets t WHERE t.participant_id = p.id) as ticket_count
     FROM participants p WHERE p.raffle_id = ? ORDER BY p.name COLLATE NOCASE ASC`,
    raffleId
  );
  return participants;
}

async function create(raffleId, name, assignedNumber) {
  const db = await getDb();
  const cleanName = (name || '').trim();
  if (!cleanName) throw new Error('El nombre del participante es obligatorio.');

  if (assignedNumber !== null && assignedNumber !== undefined && assignedNumber !== '') {
    const existing = await db.get(
      'SELECT id, name FROM participants WHERE raffle_id = ? AND assigned_number = ?',
      raffleId, assignedNumber
    );
    if (existing) {
      const err = new Error(`El número ${assignedNumber} ya está asignado a ${existing.name}.`);
      err.code = 'DUPLICATE_NUMBER';
      throw err;
    }
  }

  const result = await db.run(
    'INSERT INTO participants (raffle_id, name, assigned_number) VALUES (?, ?, ?)',
    raffleId, cleanName, assignedNumber || null
  );
  return db.get('SELECT * FROM participants WHERE id = ?', result.lastID);
}

async function update(id, name, assignedNumber) {
  const db = await getDb();
  const participant = await db.get('SELECT * FROM participants WHERE id = ?', id);
  if (!participant) throw new Error('Participante no encontrado.');

  if (assignedNumber !== null && assignedNumber !== undefined && assignedNumber !== '') {
    const existing = await db.get(
      'SELECT id, name FROM participants WHERE raffle_id = ? AND assigned_number = ? AND id != ?',
      participant.raffle_id, assignedNumber, id
    );
    if (existing) {
      const err = new Error(`El número ${assignedNumber} ya está asignado a ${existing.name}.`);
      err.code = 'DUPLICATE_NUMBER';
      throw err;
    }
  }

  await db.run(
    'UPDATE participants SET name = ?, assigned_number = ? WHERE id = ?',
    (name || '').trim(), assignedNumber || null, id
  );
  return db.get('SELECT * FROM participants WHERE id = ?', id);
}

async function remove(id) {
  const db = await getDb();
  await db.run('DELETE FROM participants WHERE id = ?', id);
}

module.exports = { listByRaffle, create, update, remove };
