(function () {
  const socket = io();
  socket.on('connect', () => socket.emit('join_public_screen'));

  // ---------- Elementos ----------
  const els = {
    idle: document.getElementById('state-idle'),
    prepared: document.getElementById('state-prepared'),
    preparedPrize: document.getElementById('prepared-prize'),
    countdown: document.getElementById('state-countdown'),
    countdownNumber: document.getElementById('countdown-number'),
    missed: document.getElementById('state-missed'),
    missedNumber: document.getElementById('missed-number'),
    spinning: document.getElementById('state-spinning'),
    reelContainer: document.getElementById('reel-container'),
    revealCountdown: document.getElementById('state-reveal-countdown'),
    revealCountdownNumber: document.getElementById('reveal-countdown-number'),
    winner: document.getElementById('state-winner'),
    winnerName: document.getElementById('winner-name-el'),
    winnerPrize: document.getElementById('winner-prize-el')
  };

  function showOnly(key) {
    ['idle', 'prepared', 'countdown', 'missed', 'spinning', 'revealCountdown', 'winner'].forEach((k) => {
      els[k].classList.toggle('hidden', k !== key);
    });
  }

  // ---------- Ajustes (velocidad de voz / ritmo) ----------
  let voiceRate = 0.85;
  let paceSeconds = 1.6;

  async function loadVoiceSettings() {
    try {
      const res = await fetch('/api/settings/public');
      const data = await res.json();
      if (data.ok) {
        voiceRate = parseFloat(data.settings.voice_rate) || 0.85;
        paceSeconds = parseFloat(data.settings.countdown_pace_seconds) || 1.6;
      }
    } catch (err) {
      console.warn('No se pudo cargar la configuración de voz, usando valores por defecto.');
    }
  }

  // ---------- Voz (Web Speech API) ----------
  let spanishVoice = null;
  function loadVoices() {
    const voices = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
    spanishVoice = voices.find((v) => v.lang && v.lang.toLowerCase().startsWith('es')) || voices[0] || null;
  }
  if (window.speechSynthesis) {
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }

  // speak() ESPERA a que la voz termine de decir la frase antes de continuar.
  // Así el número/animación en pantalla y lo que dice la voz siempre quedan
  // alineados, en vez de que la voz se adelante o se atrase.
  function speak(text, { rate } = {}) {
    return new Promise((resolve) => {
      if (!window.speechSynthesis) return resolve();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'es-ES';
      if (spanishVoice) utter.voice = spanishVoice;
      utter.rate = rate != null ? rate : voiceRate;
      utter.volume = 1;
      utter.onend = resolve;
      utter.onerror = resolve;
      window.speechSynthesis.speak(utter);
    });
  }

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Muestra el número Y dice la palabra, y espera lo que dure lo más largo
  // entre la voz y el "ritmo" configurado por el administrador — así nunca
  // se ven descoordinados.
  async function speakNumberSynced(n, numberEl) {
    numberEl.textContent = String(n);
    numberEl.style.animation = 'none';
    void numberEl.offsetWidth;
    numberEl.style.animation = 'countdown-pop 0.5s ease';
    await Promise.all([speak(String(n)), wait(paceSeconds * 1000)]);
  }

  // ---------- Confeti ----------
  const confettiCanvas = document.getElementById('confetti-canvas');
  const confettiCtx = confettiCanvas.getContext('2d');
  let confettiPieces = [];
  let confettiRunning = false;

  function resizeConfettiCanvas() {
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resizeConfettiCanvas);
  resizeConfettiCanvas();

  function burstConfetti(durationMs = 4000) {
    const colors = ['#00c853', '#7c3aed', '#ffd700', '#ffffff'];
    confettiPieces = Array.from({ length: 160 }, () => ({
      x: Math.random() * confettiCanvas.width,
      y: -20 - Math.random() * confettiCanvas.height * 0.4,
      w: 6 + Math.random() * 6,
      h: 10 + Math.random() * 8,
      color: colors[Math.floor(Math.random() * colors.length)],
      vy: 2 + Math.random() * 3,
      vx: (Math.random() - 0.5) * 2,
      rot: Math.random() * Math.PI,
      vrot: (Math.random() - 0.5) * 0.3
    }));
    confettiRunning = true;
    const stopAt = Date.now() + durationMs;

    function tick() {
      confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
      confettiPieces.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vrot;
        confettiCtx.save();
        confettiCtx.translate(p.x, p.y);
        confettiCtx.rotate(p.rot);
        confettiCtx.fillStyle = p.color;
        confettiCtx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        confettiCtx.restore();
      });
      if (Date.now() < stopAt) {
        requestAnimationFrame(tick);
      } else {
        confettiRunning = false;
        confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
      }
    }
    if (!confettiRunning) requestAnimationFrame(tick);
  }

  // ---------- Reel (carrete tipo máquina de sorteo, modo nombre) ----------
  const REEL_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

  function buildReel(targetText) {
    const chars = targetText.toUpperCase().split('');
    els.reelContainer.innerHTML = '';
    return chars.map((targetChar) => {
      const slot = document.createElement('div');
      slot.className = 'reel-slot';
      slot.textContent = targetChar === ' ' ? '·' : targetChar;
      els.reelContainer.appendChild(slot);
      return { slot, targetChar };
    });
  }

  async function spinReel(targetText, totalDurationMs = 3200) {
    const slots = buildReel(targetText);
    const spinners = slots.map((s, i) => {
      const interval = setInterval(() => {
        s.slot.textContent = REEL_CHARS[Math.floor(Math.random() * REEL_CHARS.length)];
      }, 60 + i * 4);
      return interval;
    });

    const lockDelay = totalDurationMs / slots.length;
    for (let i = 0; i < slots.length; i++) {
      await wait(lockDelay);
      clearInterval(spinners[i]);
      slots[i].slot.textContent = slots[i].targetChar === ' ' ? '·' : slots[i].targetChar;
      slots[i].slot.classList.add('locked');
    }
  }

  // ---------- Info de la rifa (Gran Rifa / Inicio / Fin / Condiciones) ----------
  const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  function formatFecha(isoDate) {
    if (!isoDate) return '—';
    const [y, m, d] = isoDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y} (${DIAS[date.getDay()]})`;
  }

  async function refreshRaffleInfoCard() {
    const card = document.getElementById('raffle-info-card');
    try {
      const res = await fetch('/api/settings/public');
      const data = await res.json();
      if (!data.ok) return;
      const s = data.settings;
      if (s.raffle_info_visible === 'true') {
        document.getElementById('info-gran-rifa').textContent = `GRAN RIFA: ${s.raffle_prize_name || '—'}`;
        document.getElementById('info-start').textContent = formatFecha(s.raffle_start_date);
        document.getElementById('info-end').textContent = formatFecha(s.raffle_end_date);
        document.getElementById('info-conditions').textContent = s.raffle_conditions || '';
        card.classList.remove('hidden');
      } else {
        card.classList.add('hidden');
      }
    } catch (err) {
      console.warn('No se pudo cargar la información de la rifa.');
    }
  }

  // ---------- Secuencia compartida: cuenta regresiva de selección + revelación ----------
  // 1) Cuenta 10 -> 0 hablada (elige al ganador).
  // 2) "Ya tengo un feliz ganador/a" (con animación).
  // 3) Cuenta 5 -> 0 hablada (para revelar).
  // 4) Revelar con confeti + mensajes finales.
  async function runSelectionCountdown() {
    showOnly('countdown');
    for (let n = 10; n >= 0; n--) {
      await speakNumberSynced(n, els.countdownNumber);
    }
  }

  async function runRevealCountdown() {
    showOnly('revealCountdown');
    for (let n = 5; n >= 0; n--) {
      await speakNumberSynced(n, els.revealCountdownNumber);
    }
  }

  async function announceWinnerFound() {
    await speak('En estos momentos ya tengo un feliz ganador, o ganadora.');
  }

  async function celebrateWinner(winnerLabel, prize, winnerNameForVoice) {
    showOnly('winner');
    els.winnerName.textContent = winnerLabel;
    els.winnerPrize.textContent = `Premio: ${prize}`;
    burstConfetti(4500);

    await speak(`¡Felicitaciones ${winnerNameForVoice}! Te ganaste: ${prize}. Por favor acércate a reclamar tu premio.`);
    await speak('Muchas gracias por participar. Nos vemos en la próxima rifa.');
    await refreshRaffleInfoCard(); // ya se jugó -> el servidor oculta la info, esto la refleja
  }

  // ---------- Eventos del servidor ----------
  socket.on('draw:prepared', async ({ prize }) => {
    els.preparedPrize.textContent = prize;
    showOnly('prepared');
    await speak(`Ya está todo listo para iniciar la rifa. Hoy nos estamos jugando: ${prize}.`);
  });

  socket.on('draw:reset', () => {
    showOnly('idle');
  });

  socket.on('draw:start', async (payload) => {
    await loadVoiceSettings(); // por si el admin cambió la velocidad justo antes de iniciar

    // 1) Cuenta regresiva de selección (10 -> 0)
    await runSelectionCountdown();
    await announceWinnerFound();

    if (payload.mode === 'number') {
      // Modo NÚMERO: mostrar cada ronda fallida antes del número ganador.
      showOnly('missed');
      for (const n of payload.missedNumbers) {
        els.missedNumber.textContent = String(n);
        document.getElementById('missed-text').textContent = 'No hay ganador. Nueva ronda...';
        await speak(`El número es ${n}. No hay ganador. Nueva ronda.`);
        await wait(400);
      }

      // 2) Cuenta regresiva de revelación (5 -> 0)
      await runRevealCountdown();

      // 3) Revelar número + nombre ganador
      els.missedNumber.textContent = String(payload.winningNumber);
      document.getElementById('missed-text').textContent = '¡Tenemos número ganador!';
      await wait(600);
      await celebrateWinner(`${payload.winner} — N.° ${payload.winningNumber}`, payload.prize, payload.winner);
    } else {
      // Modo NOMBRE: animación de carrete con el nombre ganador.
      showOnly('spinning');
      await spinReel(payload.winner, 3200);

      // 2) Cuenta regresiva de revelación (5 -> 0)
      await runRevealCountdown();

      await celebrateWinner(payload.winner, payload.prize, payload.winner);
    }
  });

  // ---------- Pantalla completa (para TV) ----------
  document.getElementById('fullscreen-btn').addEventListener('click', () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  });

  // ---------- Arranque ----------
  showOnly('idle');
  loadVoiceSettings();
  refreshRaffleInfoCard();
  setInterval(refreshRaffleInfoCard, 15000); // por si el admin la activa mientras esta pantalla ya está abierta

  const enableSoundBtn = document.getElementById('enable-sound-btn');
  const soundReadyMsg = document.getElementById('sound-ready-msg');
  if (enableSoundBtn) {
    enableSoundBtn.addEventListener('click', async () => {
      await speak('Sonido activado.');
      enableSoundBtn.classList.add('hidden');
      soundReadyMsg.classList.remove('hidden');
    });
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js').catch((err) => {
      console.warn('No se pudo registrar el service worker:', err);
    });
  }
})();
