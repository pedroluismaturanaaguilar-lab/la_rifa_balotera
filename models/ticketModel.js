const { getDb } = require('../database/db');

async function listByRaffle(raffleId) {
  const db = await getDb();
  return db.all(
    `SELECT t.*, p.name as participant_name FROM tickets t
     JOIN participants p ON p.id = t.participant_id
     WHERE t.raffle_id = ? ORDER BY t.code ASC`,
    raffleId
  );
}

async function addCodes(raffleId, participantId, codes) {
  const db = await getDb();
  const cleanCodes = [...new Set(codes.map((c) => String(c).trim()).filter(Boolean))];
  const added = [];
  const rejected = [];

  for (const code of cleanCodes) {
    const existing = await db.get(
      `SELECT t.code, p.name as owner FROM tickets t
       JOIN participants p ON p.id = t.participant_id
       WHERE t.raffle_id = ? AND t.code = ?`,
      raffleId, code
    );
    if (existing) {
      rejected.push({ code, reason: `Este código ya está asignado a ${existing.owner}.` });
      continue;
    }
    await db.run(
      'INSERT INTO tickets (raffle_id, participant_id, code) VALUES (?, ?, ?)',
      raffleId, participantId, code
    );
    added.push(code);
  }

  return { added, rejected };
}

async function removeCode(ticketId) {
  const db = await getDb();
  await db.run('DELETE FROM tickets WHERE id = ?', ticketId);
}

module.exports = { listByRaffle, addCodes, removeCode };
