const userId = window.__USER_ID__;
if (!userId) { /* não autenticado */ }

const socket = typeof io !== 'undefined' ? io() : null;

if (socket && userId) {
  socket.emit('registrar', { userId });

  socket.on('nova_notificacao', (data) => {
    updateBadge(data.unreadCount);
    showToast(data.title, data.message, 'primary');
  });

  socket.on('connect_error', () => {});
}

function updateBadge(count) {
  const dot = document.querySelector('.icon-btn .dot');
  const navBadges = document.querySelectorAll('.nav-badge.orange');

  if (dot) {
    dot.style.display = count > 0 ? 'block' : 'none';
  }

  navBadges.forEach(badge => {
    if (count > 0) {
      badge.textContent = count;
      badge.style.display = '';
    } else {
      badge.style.display = 'none';
    }
  });

  const navNotifBadge = document.querySelector('.sidebar .nav-link[href="/notificacoes"] .nav-badge');
  if (navNotifBadge) {
    if (count > 0) {
      navNotifBadge.textContent = count;
      navNotifBadge.style.display = '';
    } else {
      navNotifBadge.style.display = 'none';
    }
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
