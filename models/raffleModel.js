const { getDb } = require('../database/db');

// Por ahora trabajamos con UNA rifa activa a la vez (se crea sola la primera
// vez). Cuando construyamos el módulo completo de "Configurar la rifa"
// (fechas, modos, premios), esto se reemplaza por selección real de rifas.
async function getOrCreateActiveRaffle() {
  const db = await getDb();
  let raffle = await db.get(
    "SELECT * FROM raffles WHERE status NOT IN ('finished','cancelled') ORDER BY id DESC LIMIT 1"
  );
  if (!raffle) {
    const result = await db.run(
      "INSERT INTO raffles (name, mode, status) VALUES (?, 'name', 'open')",
      'Gran Rifa Ganadora'
    );
    raffle = await db.get('SELECT * FROM raffles WHERE id = ?', result.lastID);
  }
  return raffle;
}

module.exports = { getOrCreateActiveRaffle };
