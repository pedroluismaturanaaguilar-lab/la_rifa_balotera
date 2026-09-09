const drawState = require('../socket/drawState');

function prepare(req, res) {
  const { prize, participants } = req.body || {};
  if (!prize || !prize.trim()) {
    return res.status(400).json({ ok: false, error: 'Debes indicar el premio.' });
  }
  const list = Array.isArray(participants)
    ? participants.map((p) => String(p).trim()).filter(Boolean)
    : [];

  if (list.length === 0) {
    return res.status(400).json({ ok: false, error: 'Debes registrar al menos un participante.' });
  }

  const state = drawState.prepare(prize.trim(), list);

  const io = req.app.get('io');
  io.to('public_screen').emit('draw:prepared', {
    prize: state.prize,
    totalParticipants: state.participants.length
  });

  res.json({ ok: true, state });
}

function start(req, res) {
  const state = drawState.getState();
  if (state.status !== 'prepared') {
    return res.status(400).json({ ok: false, error: 'Primero debes preparar la rifa.' });
  }

  const winner = drawState.pickWinner();

  const io = req.app.get('io');
  io.to('public_screen').emit('draw:start', {
    prize: state.prize,
    participants: state.participants,
    winner,
    countdownFrom: 10
  });

  res.json({ ok: true, winner });
}

function finish(req, res) {
  const state = drawState.finish();
  res.json({ ok: true, state });
}

function reset(req, res) {
  const state = drawState.reset();
  const io = req.app.get('io');
  io.to('public_screen').emit('draw:reset');
  res.json({ ok: true, state });
}

function status(req, res) {
  res.json({ ok: true, state: drawState.getState() });
}

module.exports = { prepare, start, finish, reset, status };
