const raffleModel = require('../models/raffleModel');
const ticketModel = require('../models/ticketModel');

async function list(req, res) {
  const raffle = await raffleModel.getOrCreateActiveRaffle();
  const tickets = await ticketModel.listByRaffle(raffle.id);
  res.json({ ok: true, tickets });
}

async function addCodes(req, res) {
  try {
    const raffle = await raffleModel.getOrCreateActiveRaffle();
    const { participant_id, codes } = req.body || {};
    if (!participant_id) {
      return res.status(400).json({ ok: false, error: 'Falta indicar el participante.' });
    }
    const codeList = Array.isArray(codes) ? codes : String(codes || '').split(/[\n,]/);
    const result = await ticketModel.addCodes(raffle.id, participant_id, codeList);
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
}

async function remove(req, res) {
  await ticketModel.removeCode(req.params.id);
  res.json({ ok: true });
}

module.exports = { list, addCodes, remove };
