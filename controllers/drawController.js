  const drawState = require('../socket/drawState');
  const settingsModel = require('../models/settingsModel');
  const raffleModel = require('../models/raffleModel');
  const participantModel = require('../models/participantModel');

  async function prepare(req, res) {
    const { mode, prize, participants } = req.body || {};
    if (!prize || !prize.trim()) {
      return res.status(400).json({ ok: false, error: 'Debes indicar el premio.' });
    }

    try {
      let state;
      if (mode === 'number') {
        const { min, max } = req.body || {};
        if (min == null || max == null || Number(min) >= Number(max)) {
          return res.status(400).json({ ok: false, error: 'Indica un rango válido (mínimo menor que máximo).' });
        }
        // Se toman los participantes YA registrados en el módulo de
        // Participantes que tengan número asignado dentro del rango.
        const raffle = await raffleModel.getOrCreateActiveRaffle();
        const all = await participantModel.listByRaffle(raffle.id);
        const withNumbers = all
          .filter((p) => p.assigned_number != null && p.assigned_number >= Number(min) && p.assigned_number <= Number(max))
          .map((p) => ({ name: p.name, number: p.assigned_number }));

        if (withNumbers.length === 0) {
          return res.status(400).json({
            ok: false,
            error: 'No hay participantes con número dentro de ese rango. Regístralos en "Participantes" con su número antes de preparar.'
          });
        }
        state = drawState.prepareByNumber(prize.trim(), withNumbers, min, max);
      } else {
        const list = Array.isArray(participants)
          ? participants.map((p) => String(p).trim()).filter(Boolean)
          : [];
        if (list.length === 0) {
          return res.status(400).json({ ok: false, error: 'Debes registrar al menos un participante.' });
        }
        state = drawState.prepareByName(prize.trim(), list);
      }

      const io = req.app.get('io');
      io.to('public_screen').emit('draw:prepared', {
        mode: state.mode,
        prize: state.prize,
        totalParticipants: state.participants.length,
        range: state.range
      });

      res.json({ ok: true, state });
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  }

  async function start(req, res) {
    const state = drawState.getState();
    if (state.status !== 'prepared') {
      return res.status(400).json({ ok: false, error: 'Primero debes preparar la rifa.' });
    }

    try {
      const io = req.app.get('io');

      if (state.mode === 'number') {
        const result = drawState.pickWinnerByNumber();
        io.to('public_screen').emit('draw:start', {
          mode: 'number',
          prize: state.prize,
          range: state.range,
          winner: result.winner,
          winningNumber: result.winningNumber,
          missedNumbers: result.missedNumbers,
          countdownFrom: 10
        });
        res.json({ ok: true, winner: result.winner, winningNumber: result.winningNumber });
      } else {
        const result = drawState.pickWinnerByName();
        io.to('public_screen').emit('draw:start', {
          mode: 'name',
          prize: state.prize,
          participants: state.participants,
          winner: result.winner,
          countdownFrom: 10
        });
        res.json({ ok: true, winner: result.winner });
      }

      // La rifa ya se jugó: la info (Gran Rifa / Inicio / Fin / Condiciones)
      // se oculta sola de la pantalla pública, tal como se pidió.
      await settingsModel.setSetting('raffle_info_visible', 'false');
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
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
