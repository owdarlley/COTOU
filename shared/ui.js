// Formatters
function formatBRL(v) {
  if (v == null || v === '') return '—';
  return 'R$ ' + parseFloat(v).toFixed(2).replace('.', ',').replace(/(\d)(?=(\d{3})+,)/g, '$1.');
}
function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR');
}
function formatDT(d) {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleDateString('pt-BR') + ' às ' + dt.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' });
}
function initials(name) {
  return (name||'?').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
}

// Tabs
function showTab(tabId, groupClass) {
  document.querySelectorAll('.' + (groupClass || 'tab-panel')).forEach(el => el.classList.add('hidden'));
  document.getElementById(tabId).classList.remove('hidden');
}
function setActiveTab(btn, groupClass) {
  document.querySelectorAll('.' + (groupClass || 'tab-btn')).forEach(el => {
    el.classList.remove('border-blue-600', 'text-blue-600');
    el.classList.add('border-transparent', 'text-slate-500');
  });
  btn.classList.add('border-blue-600', 'text-blue-600');
  btn.classList.remove('border-transparent', 'text-slate-500');
}

// Toast
function showToast(msg, type = 'success') {
  const colors = { success: 'bg-green-600', error: 'bg-red-600', info: 'bg-blue-600' };
  const t = document.createElement('div');
  t.className = `fixed bottom-6 right-6 ${colors[type]} text-white text-sm font-medium px-5 py-3 rounded-xl shadow-lg z-50 flex items-center gap-2 transition-all`;
  t.innerHTML = `<i class="bi bi-${type==='success'?'check-circle':'exclamation-circle'}"></i> ${msg}`;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

// Modal
function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

// Stepper
let currentStep = 1;
function stepTo(n) {
  document.querySelectorAll('.step-panel').forEach(el => el.classList.add('hidden'));
  const panel = document.getElementById('step-' + n);
  if (panel) panel.classList.remove('hidden');
  document.querySelectorAll('.step-indicator').forEach((el, i) => {
    if (i < n) {
      el.classList.add('bg-blue-600', 'text-white');
      el.classList.remove('bg-slate-200', 'text-slate-500');
    } else {
      el.classList.remove('bg-blue-600', 'text-white');
      el.classList.add('bg-slate-200', 'text-slate-500');
    }
  });
  document.querySelectorAll('.step-label').forEach((el, i) => {
    if (i < n) {
      el.classList.add('text-blue-600', 'font-semibold');
      el.classList.remove('text-slate-400');
    } else {
      el.classList.remove('text-blue-600', 'font-semibold');
      el.classList.add('text-slate-400');
    }
  });
  currentStep = n;
}

// Status badge
function statusBadge(status) {
  const cfg = {
    pendente:    { label:'Aguardando',   cls:'bg-amber-100 text-amber-700' },
    em_cotacao:  { label:'Em Cotação',   cls:'bg-blue-100 text-blue-700' },
    cotado:      { label:'Cotado',       cls:'bg-green-100 text-green-700' },
    peca_chegou: { label:'Peça Chegou',  cls:'bg-violet-100 text-violet-700' },
    cancelado:   { label:'Cancelado',    cls:'bg-red-100 text-red-700' }
  }[status] || { label: status, cls:'bg-slate-100 text-slate-600' };
  return `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.cls}"><span class="w-1.5 h-1.5 rounded-full bg-current opacity-70"></span>${cfg.label}</span>`;
}

// Role badge
function roleBadge(role) {
  const cfg = {
    admin:   { label:'Admin',   cls:'bg-purple-100 text-purple-700' },
    vendas:  { label:'Vendas',  cls:'bg-blue-100 text-blue-700' },
    compras: { label:'Compras', cls:'bg-green-100 text-green-700' }
  }[role] || { label: role, cls:'bg-slate-100 text-slate-600' };
  return `<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.cls}">${cfg.label}</span>`;
}

// Avatar circle
function avatarCircle(name, size = 'w-8 h-8', textSize = 'text-xs') {
  const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-amber-500', 'bg-red-500', 'bg-cyan-500'];
  const idx = (name || '?').charCodeAt(0) % colors.length;
  return `<div class="${size} ${colors[idx]} rounded-full flex items-center justify-center text-white font-bold ${textSize} flex-shrink-0">${initials(name)}</div>`;
}

// Notification icon by type
function notifIcon(type) {
  const icons = {
    cotacao_respondida: { icon: 'bi-clipboard-check', cls: 'bg-green-100 text-green-600' },
    peca_chegou:        { icon: 'bi-box-seam',         cls: 'bg-violet-100 text-violet-600' },
    status_atualizado:  { icon: 'bi-arrow-repeat',     cls: 'bg-blue-100 text-blue-600' },
    nova_cotacao:       { icon: 'bi-plus-circle',       cls: 'bg-amber-100 text-amber-600' },
    cotacao_atualizada: { icon: 'bi-check2-circle',     cls: 'bg-green-100 text-green-600' }
  };
  return icons[type] || { icon: 'bi-bell', cls: 'bg-slate-100 text-slate-600' };
}

// Relative time helpers (simple)
function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return mins + 'min atrás';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + 'h atrás';
  const days = Math.floor(hrs / 24);
  return days + ' dias atrás';
}
