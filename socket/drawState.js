// socket/drawState.js
//
// Estado del sorteo "en vivo" que conecta el panel del administrador con la
// pantalla pública en tiempo real. Por ahora los participantes se escriben
// directamente en el panel (rápido, para poder probar toda la secuencia de
// voz/animación ya mismo); cuando construyamos la Fase 3 completa, esto se
// alimentará desde la tabla "participants" de la base de datos en vez de
// una lista escrita a mano.
const crypto = require('crypto');

let state = {
  status: 'idle', // idle -> prepared -> drawing -> finished
  prize: '',
  participants: [],
  winner: null,
  startedAt: null
};

function getState() {
  return state;
}

function prepare(prize, participants) {
  state = {
    status: 'prepared',
    prize: (prize || '').trim(),
    participants: participants.filter(Boolean),
    winner: null,
    startedAt: null
  };
  return state;
}

function pickWinner() {
  if (!state.participants.length) {
    throw new Error('No hay participantes registrados.');
  }
  // Selección aleatoria segura del lado del servidor (no del navegador),
  // tal como lo exige el punto 23/36 de la especificación.
  const idx = crypto.randomInt(0, state.participants.length);
  state.winner = state.participants[idx];
  state.status = 'drawing';
  state.startedAt = Date.now();
  return state.winner;
}

function finish() {
  state.status = 'finished';
  return state;
}

function reset() {
  state = { status: 'idle', prize: '', participants: [], winner: null, startedAt: null };
  return state;
}

module.exports = { getState, prepare, pickWinner, finish, reset };
