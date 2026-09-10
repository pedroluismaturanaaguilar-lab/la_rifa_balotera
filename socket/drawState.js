// socket/drawState.js
const crypto = require('crypto');

let state = {
  status: 'idle', // idle -> prepared -> drawing -> finished
  mode: 'name', // 'name' | 'number'
  prize: '',
  participants: [], // modo nombre: ["Pedro","Juan"] | modo numero: [{name,number}]
  range: null, // modo numero: { min, max }
  winner: null,
  winningNumber: null,
  missedNumbers: [], // modo numero: numeros que salieron sin ganador antes del definitivo
  startedAt: null
};

function getState() {
  return state;
}

function prepareByName(prize, participants) {
  state = {
    status: 'prepared',
    mode: 'name',
    prize: (prize || '').trim(),
    participants: participants.filter(Boolean),
    range: null,
    winner: null,
    winningNumber: null,
    missedNumbers: [],
    startedAt: null
  };
  return state;
}

function prepareByNumber(prize, participants, min, max) {
  // participants: [{ name, number }]
  state = {
    status: 'prepared',
    mode: 'number',
    prize: (prize || '').trim(),
    participants: participants.filter((p) => p && p.name && p.number != null),
    range: { min: Number(min), max: Number(max) },
    winner: null,
    winningNumber: null,
    missedNumbers: [],
    startedAt: null
  };
  return state;
}

function pickWinnerByName() {
  if (!state.participants.length) {
    throw new Error('No hay participantes registrados.');
  }
  const idx = crypto.randomInt(0, state.participants.length);
  state.winner = state.participants[idx];
  state.status = 'drawing';
  state.startedAt = Date.now();
  return { winner: state.winner };
}

// Simula rondas reales: numero al azar dentro del rango; si nadie tiene ese
// numero, es una ronda sin ganador y se repite. La seleccion es 100% del
// lado del servidor (nunca del navegador), tal como exige el punto 23/36.
function pickWinnerByNumber() {
  const { min, max } = state.range;
  if (!state.participants.length) {
    throw new Error('No hay participantes con número registrado.');
  }
  const byNumber = new Map(state.participants.map((p) => [Number(p.number), p.name]));

  const missed = [];
  const SAFETY_MAX_ROUNDS = 60; // evita una secuencia absurdamente larga en casos extremos
  let winnerNumber = null;
  let winnerName = null;

  for (let i = 0; i < SAFETY_MAX_ROUNDS; i++) {
    const n = crypto.randomInt(min, max + 1);
    if (byNumber.has(n)) {
      winnerNumber = n;
      winnerName = byNumber.get(n);
      break;
    }
    missed.push(n);
  }

  if (winnerNumber === null) {
    // Caso extremo (rango muy grande / muy pocos participantes): en vez de
    // seguir sorteando indefinidamente, se hace un sorteo final directo
    // entre los numeros SI registrados (sigue siendo aleatorio y justo).
    const registeredNumbers = [...byNumber.keys()];
    winnerNumber = registeredNumbers[crypto.randomInt(0, registeredNumbers.length)];
    winnerName = byNumber.get(winnerNumber);
  }

  // Para que la animacion no se vuelva eterna, solo se muestran las
  // ultimas rondas fallidas (el resultado real ya quedo decidido arriba).
  state.missedNumbers = missed.slice(-10);
  state.winner = winnerName;
  state.winningNumber = winnerNumber;
  state.status = 'drawing';
  state.startedAt = Date.now();

  return { winner: winnerName, winningNumber: winnerNumber, missedNumbers: state.missedNumbers };
}

function finish() {
  state.status = 'finished';
  return state;
}

function reset() {
  state = {
    status: 'idle', mode: 'name', prize: '', participants: [], range: null,
    winner: null, winningNumber: null, missedNumbers: [], startedAt: null
  };
  return state;
}

module.exports = { getState, prepareByName, prepareByNumber, pickWinnerByName, pickWinnerByNumber, finish, reset };
