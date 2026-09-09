(function () {
  const listEl = document.getElementById('participants-list');
  const nameInput = document.getElementById('p_name');
  const numberInput = document.getElementById('p_number');
  const addBtn = document.getElementById('p_add_btn');
  const errorEl = document.getElementById('p_error');
  const rowTemplate = document.getElementById('participant-row-template');

  async function api(path, method = 'GET', body) {
    const res = await fetch(path, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined
    });
    return res.json();
  }

  function renderParticipants(participants) {
    listEl.innerHTML = '';
    if (participants.length === 0) {
      listEl.innerHTML = '<p style="color:#9a9ac0; font-size:13px;">Todavía no hay participantes registrados.</p>';
      return;
    }
    participants.forEach((p) => {
      const node = rowTemplate.content.cloneNode(true);
      const root = node.querySelector('.card');
      root.querySelector('.p-name').textContent = p.name;
      root.querySelector('.p-number').textContent = p.assigned_number ? `#${p.assigned_number}` : '';
      root.querySelector('.p-ticket-count').textContent = `${p.ticket_count} boleta(s)`;

      root.querySelector('.p-delete').addEventListener('click', async () => {
        if (!confirm(`¿Eliminar a ${p.name}? También se borran sus boletas.`)) return;
        await api(`/api/participants/${p.id}`, 'DELETE');
        loadParticipants();
      });

      const ticketsBox = root.querySelector('.p-tickets-box');
      const toggleBtn = root.querySelector('.p-toggle-tickets');
      toggleBtn.addEventListener('click', async () => {
        ticketsBox.classList.toggle('hidden');
        if (!ticketsBox.classList.contains('hidden')) {
          await loadTicketsFor(p.id, ticketsBox);
        }
      });

      const ticketsInput = root.querySelector('.p-tickets-input');
      const ticketsAddBtn = root.querySelector('.p-tickets-add');
      const ticketsError = root.querySelector('.p-tickets-error');
      ticketsAddBtn.addEventListener('click', async () => {
        const codes = ticketsInput.value.split(',').map((c) => c.trim()).filter(Boolean);
        if (codes.length === 0) return;
        const data = await api('/api/tickets', 'POST', { participant_id: p.id, codes });
        if (data.rejected && data.rejected.length) {
          ticketsError.textContent = data.rejected.map((r) => r.reason).join(' ');
        } else {
          ticketsError.textContent = '';
        }
        ticketsInput.value = '';
        await loadTicketsFor(p.id, ticketsBox);
        loadParticipants();
      });

      listEl.appendChild(node);
    });
  }

  async function loadTicketsFor(participantId, ticketsBox) {
    const data = await api('/api/tickets');
    const own = data.tickets.filter((t) => t.participant_id === participantId);
    const box = ticketsBox.querySelector('.p-tickets-list');
    box.innerHTML = '';
    own.forEach((t) => {
      const chip = document.createElement('span');
      chip.style.cssText = 'background: rgba(0,200,83,0.15); border:1px solid rgba(0,200,83,0.4); padding:4px 10px; border-radius:999px; font-size:12px; display:flex; align-items:center; gap:6px;';
      chip.innerHTML = `${t.code} <span style="cursor:pointer; color:#ff6b6b;">✕</span>`;
      chip.querySelector('span').addEventListener('click', async () => {
        await api(`/api/tickets/${t.id}`, 'DELETE');
        await loadTicketsFor(participantId, ticketsBox);
        loadParticipants();
      });
      box.appendChild(chip);
    });
  }

  async function loadParticipants() {
    const data = await api('/api/participants');
    if (data.ok) renderParticipants(data.participants);
  }

  addBtn.addEventListener('click', async () => {
    errorEl.textContent = '';
    const name = nameInput.value.trim();
    const number = numberInput.value ? Number(numberInput.value) : null;
    if (!name) {
      errorEl.textContent = 'Escribe el nombre del participante.';
      return;
    }
    const data = await api('/api/participants', 'POST', { name, assigned_number: number });
    if (!data.ok) {
      errorEl.textContent = data.error;
      return;
    }
    nameInput.value = '';
    numberInput.value = '';
    loadParticipants();
  });

  loadParticipants();
  window.RifaLoadParticipants = loadParticipants; // usado por admin-draw.js
})();
