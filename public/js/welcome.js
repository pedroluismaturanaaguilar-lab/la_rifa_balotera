(async function () {
  function applyColors(settings) {
    const root = document.documentElement.style;
    if (settings.color_primary) root.setProperty('--color-primary', settings.color_primary);
    if (settings.color_secondary) root.setProperty('--color-secondary', settings.color_secondary);
    if (settings.color_accent) root.setProperty('--color-accent', settings.color_accent);
  }

  async function loadSettings() {
    try {
      const res = await fetch('/api/settings/public');
      const data = await res.json();
      if (!data.ok) throw new Error('No se pudo cargar la configuración');
      return data.settings;
    } catch (err) {
      console.error(err);
      // Valores de respaldo si falla la API, para que la pantalla nunca quede vacía
      return {
        platform_name: 'La Rifa Ganadora',
        welcome_title: 'BIENVENIDO A LA RIFA GANADORA',
        welcome_subtitle: '¡Prepárate para ganar!',
        welcome_button_text: 'IR A RIFAR'
      };
    }
  }

  function render(settings) {
    document.title = settings.platform_name || 'La Rifa Ganadora';
    document.getElementById('platform-name').textContent = settings.platform_name || 'La Rifa Ganadora';
    document.getElementById('welcome-title').textContent = settings.welcome_title || 'BIENVENIDO';
    document.getElementById('welcome-subtitle').textContent = settings.welcome_subtitle || '';
    document.getElementById('go-button').textContent = settings.welcome_button_text || 'IR A RIFAR';
    applyColors(settings);
  }

  const settings = await loadSettings();
  render(settings);

  if (window.RifaParticles) {
    window.RifaParticles.init('particles-canvas', {
      colors: [
        settings.color_primary || '#00c853',
        settings.color_secondary || '#7c3aed',
        settings.color_accent || '#ffd700'
      ]
    });
  }

  document.getElementById('go-button').addEventListener('click', () => {
    // Lleva a la PANTALLA PÚBLICA del sorteo (la que ven los participantes / TV).
    // El panel del administrador vive en /admin/login y es completamente aparte.
    window.location.href = '/pantalla';
  });

  // Registrar el service worker para que la app sea instalable (PWA)
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js').catch((err) => {
      console.warn('No se pudo registrar el service worker:', err);
    });
  }

  // Botón nativo de instalación PWA
  let deferredPrompt;
  const installBtn = document.getElementById('install-button');
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (installBtn) installBtn.hidden = false;
  });
  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      installBtn.hidden = true;
    });
  }
})();
