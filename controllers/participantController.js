const raffleModel = require('../models/raffleModel');
const participantModel = require('../models/participantModel');

async function list(req, res) {
  const raffle = await raffleModel.getOrCreateActiveRaffle();
  const participants = await participantModel.listByRaffle(raffle.id);
  res.json({ ok: true, raffleId: raffle.id, participants });
}

async function create(req, res) {
  try {
    const raffle = await raffleModel.getOrCreateActiveRaffle();
    const { name, assigned_number } = req.body || {};
    const participant = await participantModel.create(raffle.id, name, assigned_number);
    res.json({ ok: true, participant });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
}

async function update(req, res) {
  try {
    const { name, assigned_number } = req.body || {};
    const participant = await participantModel.update(req.params.id, name, assigned_number);
    res.json({ ok: true, participant });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
}

async function remove(req, res) {
  await participantModel.remove(req.params.id);
  res.json({ ok: true });
}

module.exports = { list, create, update, remove };
