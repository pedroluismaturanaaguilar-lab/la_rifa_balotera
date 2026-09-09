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
    spinning: document.getElementById('state-spinning'),
    reelContainer: document.getElementById('reel-container'),
    winner: document.getElementById('state-winner'),
    winnerName: document.getElementById('winner-name-el'),
    winnerPrize: document.getElementById('winner-prize-el')
  };

  function showOnly(key) {
    ['idle', 'prepared', 'countdown', 'spinning', 'winner'].forEach((k) => {
      els[k].classList.toggle('hidden', k !== key);
    });
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

  function speak(text, { rate = 1, volume = 1 } = {}) {
    return new Promise((resolve) => {
      if (!window.speechSynthesis) return resolve();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'es-ES';
      if (spanishVoice) utter.voice = spanishVoice;
      utter.rate = rate;
      utter.volume = volume;
      utter.onend = resolve;
      utter.onerror = resolve;
      window.speechSynthesis.speak(utter);
    });
  }

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
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

  // ---------- Reel (carrete tipo máquina de sorteo) ----------
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

    // Los carretes se van "clavando" de izquierda a derecha, como una
    // máquina de sorteo, hasta completar el nombre/código ganador.
    const lockDelay = totalDurationMs / slots.length;
    for (let i = 0; i < slots.length; i++) {
      await wait(lockDelay);
      clearInterval(spinners[i]);
      slots[i].slot.textContent = slots[i].targetChar === ' ' ? '·' : slots[i].targetChar;
      slots[i].slot.classList.add('locked');
    }
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

  socket.on('draw:start', async ({ prize, winner }) => {
    // 1) Cuenta regresiva hablada, 10 -> 0
    showOnly('countdown');
    for (let n = 10; n >= 0; n--) {
      els.countdownNumber.textContent = String(n);
      els.countdownNumber.style.animation = 'none';
      // Forzar reinicio de la animación en cada número
      void els.countdownNumber.offsetWidth;
      els.countdownNumber.style.animation = 'countdown-pop 0.5s ease';
      speak(String(n)); // no se espera: debe sonar al ritmo de 1 por segundo
      await wait(950);
    }

    await speak('¡Ya inicié la rifa!');

    // 2) Animación de búsqueda del ganador + anuncio de suspenso
    showOnly('spinning');
    const spinPromise = spinReel(winner, 3200);
    await Promise.all([
      spinPromise,
      speak('En estos momentos ya tengo a la persona ganadora...')
    ]);

    // 3) Revelar ganador con celebración
    showOnly('winner');
    els.winnerName.textContent = winner;
    els.winnerPrize.textContent = `Premio: ${prize}`;
    burstConfetti(4500);

    await speak(`¡Felicitaciones ${winner}! Te ganaste: ${prize}. Por favor acércate a reclamar tu premio.`);
    await speak('Muchas gracias por participar. Nos vemos en la próxima rifa.');
  });

  // ---------- Pantalla completa (para TV) ----------
  document.getElementById('fullscreen-btn').addEventListener('click', () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  });

  showOnly('idle');

  // Los navegadores bloquean la voz hasta que hay un clic humano en la
  // página. Este botón "desbloquea" el audio con una frase corta y silenciosa
  // en volumen, para que luego toda la secuencia hablada suene sin problema.
  const enableSoundBtn = document.getElementById('enable-sound-btn');
  const soundReadyMsg = document.getElementById('sound-ready-msg');
  if (enableSoundBtn) {
    enableSoundBtn.addEventListener('click', async () => {
      await speak('Sonido activado.', { volume: 1 });
      enableSoundBtn.classList.add('hidden');
      soundReadyMsg.classList.remove('hidden');
    });
  }

  // Registrar el service worker: esta pantalla también es instalable
  // como app aparte (manifest-pantalla.json), independiente del panel admin.
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js').catch((err) => {
      console.warn('No se pudo registrar el service worker:', err);
    });
  }
})();
