const userId = window.__USER_ID__;
if (!userId) { /* não autenticado */ }

const socket = typeof io !== 'undefined' ? io() : null;

if (socket && userId) {
  socket.emit('registrar', { userId });

  socket.on('nova_notificacao', (data) => {
    updateBadge(data.unreadCount);
    showToast(data.title, data.message, 'primary');

    const list = document.getElementById('notif-list');
    if (list) {
      const href = data.quotationId ? `/cotacoes/${data.quotationId}` : '#';
      const item = document.createElement('a');
      item.href = href;
      item.className = 'dropdown-item py-2 border-bottom notif-unread';
      item.innerHTML = `<div class="fw-semibold small">${data.title}</div>
        <div class="text-muted small">${(data.message || '').substring(0, 70)}</div>`;
      list.insertBefore(item, list.firstChild);
      if (list.children.length > 5) list.lastChild.remove();
    }
  });

  socket.on('connect_error', () => {});
}

function updateBadge(count) {
  const badge = document.getElementById('notif-badge');
  if (!badge) return;
  if (count > 0) {
    badge.textContent = count;
    badge.classList.remove('d-none');
  } else {
    badge.classList.add('d-none');
  }
}

function showToast(title, message, type = 'primary') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'position-fixed bottom-0 end-0 p-3';
    container.style.zIndex = '9999';
    document.body.appendChild(container);
  }

  const id = 'toast-' + Date.now();
  const div = document.createElement('div');
  div.id = id;
  div.className = `toast align-items-center text-bg-${type} border-0`;
  div.setAttribute('role', 'alert');
  div.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">
        <strong>${title}</strong><br>${message}
      </div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>`;
  container.appendChild(div);

  const toast = new bootstrap.Toast(div, { delay: 5000 });
  toast.show();
  div.addEventListener('hidden.bs.toast', () => div.remove());
}

window.showToast = showToast;
