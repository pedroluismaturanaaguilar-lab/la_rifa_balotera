(function () {
  async function getSettings() {
    const res = await fetch('/api/settings');
    return res.json();
  }
  async function putSettings(payload) {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  }

  // ---------- Info de la rifa ----------
  const raffleForm = document.getElementById('raffle-info-form');
  const raffleStatus = document.getElementById('raffle-info-status');

  async function loadRaffleInfo() {
    const data = await getSettings();
    if (!data.ok) return;
    const s = data.settings;
    document.getElementById('raffle_prize_name').value = s.raffle_prize_name || '';
    document.getElementById('raffle_start_date').value = s.raffle_start_date || '';
    document.getElementById('raffle_end_date').value = s.raffle_end_date || '';
    document.getElementById('raffle_conditions').value = s.raffle_conditions || '';
    document.getElementById('raffle_info_visible').checked = s.raffle_info_visible === 'true';
  }

  raffleForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    raffleStatus.textContent = 'Guardando...';
    const payload = {
      raffle_prize_name: document.getElementById('raffle_prize_name').value,
      raffle_start_date: document.getElementById('raffle_start_date').value,
      raffle_end_date: document.getElementById('raffle_end_date').value,
      raffle_conditions: document.getElementById('raffle_conditions').value,
      raffle_info_visible: document.getElementById('raffle_info_visible').checked ? 'true' : 'false'
    };
    const data = await putSettings(payload);
    raffleStatus.textContent = data.ok
      ? '✔ Guardado. Esta información queda guardada hasta que se juegue la rifa.'
      : 'Error al guardar: ' + data.error;
    raffleStatus.className = data.ok ? 'ok' : 'err';
  });

  // ---------- Velocidad de voz ----------
  const voiceForm = document.getElementById('voice-form');
  const voiceStatus = document.getElementById('voice-status');
  const voiceRateInput = document.getElementById('voice_rate');
  const paceInput = document.getElementById('countdown_pace_seconds');
  const voiceRateValue = document.getElementById('voice_rate_value');
  const paceValue = document.getElementById('countdown_pace_value');

  function updateSliderLabels() {
    voiceRateValue.textContent = `Velocidad actual: ${voiceRateInput.value}`;
    paceValue.textContent = `${paceInput.value} segundos por número`;
  }
  voiceRateInput.addEventListener('input', updateSliderLabels);
  paceInput.addEventListener('input', updateSliderLabels);

  async function loadVoiceSettings() {
    const data = await getSettings();
    if (!data.ok) return;
    voiceRateInput.value = data.settings.voice_rate || '0.85';
    paceInput.value = data.settings.countdown_pace_seconds || '1.6';
    updateSliderLabels();
  }

  voiceForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    voiceStatus.textContent = 'Guardando...';
    const data = await putSettings({
      voice_rate: voiceRateInput.value,
      countdown_pace_seconds: paceInput.value
    });
    voiceStatus.textContent = data.ok ? '✔ Guardado. Ya se aplica en la pantalla pública.' : 'Error: ' + data.error;
    voiceStatus.className = data.ok ? 'ok' : 'err';
  });

  loadRaffleInfo();
  loadVoiceSettings();
})();
