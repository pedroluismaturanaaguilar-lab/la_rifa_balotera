(async function () {
  if (window.RifaParticles) {
    window.RifaParticles.init('particles-canvas', { count: 35 });
  }

  const form = document.getElementById('settings-form');
  const statusBox = document.getElementById('save-status');
  const fields = ['platform_name', 'welcome_title', 'welcome_subtitle', 'welcome_button_text', 'color_primary', 'color_secondary', 'color_accent'];

  async function loadSettings() {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (!data.ok) {
        if (res.status === 401) {
          window.location.href = '/admin/login';
          return;
        }
        throw new Error(data.error);
      }
      for (const key of fields) {
        const el = document.getElementById(key);
        if (el && data.settings[key] != null) el.value = data.settings[key];
      }
    } catch (err) {
      console.error(err);
      statusBox.textContent = 'No se pudo cargar la configuración actual.';
      statusBox.className = 'err';
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    statusBox.textContent = 'Guardando...';
    statusBox.className = '';

    const payload = {};
    for (const key of fields) {
      payload[key] = document.getElementById(key).value;
    }

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Error al guardar.');
      statusBox.textContent = '✔ Cambios guardados. Ya se reflejan en la pantalla de bienvenida.';
      statusBox.className = 'ok';
    } catch (err) {
      statusBox.textContent = 'No se pudo guardar: ' + err.message;
      statusBox.className = 'err';
    }
  });

  document.getElementById('logout-btn').addEventListener('click', async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/admin/login';
  });

  loadSettings();
})();
