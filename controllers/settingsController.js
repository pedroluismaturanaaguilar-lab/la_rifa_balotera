const settingsModel = require('../models/settingsModel');

const PUBLIC_KEYS = [
  'platform_name',
  'welcome_title',
  'welcome_subtitle',
  'welcome_button_text',
  'color_primary',
  'color_secondary',
  'color_accent',
  'voice_enabled',
  'voice_rate',
  'voice_volume',
  'countdown_pace_seconds',
  'sound_enabled',
  'raffle_prize_name',
  'raffle_start_date',
  'raffle_end_date',
  'raffle_conditions',
  'raffle_info_visible'
];

async function buildPublicSettings() {
  const all = await settingsModel.getAllSettings();
  const publicSettings = {};
  for (const key of PUBLIC_KEYS) {
    publicSettings[key] = all[key] ?? null;
  }
  return publicSettings;
}

// GET /api/settings/public -> solo lo necesario para la pantalla de bienvenida / publica
async function getPublicSettings(req, res) {
  try {
    const publicSettings = await buildPublicSettings();
    res.json({ ok: true, settings: publicSettings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'No se pudo cargar la configuración.' });
  }
}

// GET /api/settings -> todas (protegido, admin)
async function getAllSettingsHandler(req, res) {
  try {
    const settings = await settingsModel.getAllSettings();
    res.json({ ok: true, settings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'No se pudo cargar la configuración.' });
  }
}

// PUT /api/settings -> actualizar varias (protegido, admin)
async function updateSettingsHandler(req, res) {
  try {
    const body = req.body || {};
    if (Object.keys(body).length === 0) {
      return res.status(400).json({ ok: false, error: 'No se enviaron datos para actualizar.' });
    }
    const settings = await settingsModel.setManySettings(body);

    // Avisar EN VIVO a la pantalla pública (sin esperar a que ella pregunte):
    // asi el checkbox "mostrar en pantalla" y cualquier otro cambio se ve
    // de inmediato, sin tener que esperar ni recargar.
    const io = req.app.get('io');
    if (io) {
      const publicSettings = await buildPublicSettings();
      io.to('public_screen').emit('settings:updated', publicSettings);
    }

    res.json({ ok: true, settings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'No se pudo guardar la configuración.' });
  }
}

module.exports = { getPublicSettings, getAllSettingsHandler, updateSettingsHandler };
