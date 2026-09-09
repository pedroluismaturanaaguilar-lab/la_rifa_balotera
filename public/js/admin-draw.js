(function () {
  const socket = io();

  const prizeInput = document.getElementById('draw_prize');
  const participantsInput = document.getElementById('draw_participants');
  const prepareBtn = document.getElementById('draw-prepare-btn');
  const startBtn = document.getElementById('draw-start-btn');
  const resetBtn = document.getElementById('draw-reset-btn');
  const statusEl = document.getElementById('draw-status');

  async function api(path, method = 'POST', body) {
    const res = await fetch(path, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined
    });
    return res.json();
  }

  function parseParticipants() {
    return participantsInput.value
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  const loadSavedBtn = document.getElementById('draw-load-saved-btn');
  loadSavedBtn.addEventListener('click', async () => {
    const data = await api('/api/participants', 'GET');
    if (!data.ok || !data.participants.length) {
      statusEl.textContent = 'No hay participantes guardados todavía — agrégalos arriba primero.';
      return;
    }
    participantsInput.value = data.participants.map((p) => p.name).join('\n');
    statusEl.textContent = `Se cargaron ${data.participants.length} participante(s) guardado(s).`;
  });

  prepareBtn.addEventListener('click', async () => {
    const prize = prizeInput.value.trim();
    const participants = parseParticipants();

    if (!prize) {
      statusEl.textContent = 'Falta indicar el premio.';
      return;
    }
    if (participants.length === 0) {
      statusEl.textContent = 'Falta registrar al menos un participante.';
      return;
    }

    const data = await api('/api/draw/prepare', 'POST', { prize, participants });
    if (!data.ok) {
      statusEl.textContent = data.error || 'No se pudo preparar la rifa.';
      return;
    }
    statusEl.textContent = `Rifa preparada — ${participants.length} participante(s). Abre la pantalla pública y luego inicia el sorteo.`;
    startBtn.disabled = false;
  });

  startBtn.addEventListener('click', async () => {
    const confirmed = confirm('¿Está seguro de iniciar el sorteo? La pantalla pública comenzará la cuenta regresiva.');
    if (!confirmed) return;

    const data = await api('/api/draw/start', 'POST');
    if (!data.ok) {
      statusEl.textContent = data.error || 'No se pudo iniciar el sorteo.';
      return;
    }
    statusEl.textContent = `Sorteo en curso... (el ganador se revelará en la pantalla pública)`;
    startBtn.disabled = true;
  });

  resetBtn.addEventListener('click', async () => {
    const confirmed = confirm('¿Reiniciar el sorteo? Se borrará la preparación actual (participantes y premio de esta ronda).');
    if (!confirmed) return;

    await api('/api/draw/reset', 'POST');
    statusEl.textContent = 'Estado: sin preparar';
    startBtn.disabled = true;
  });
})();
