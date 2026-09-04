// COTOU — Shell (sidebar + topbar + notifications dropdown)

const { useState, useEffect, useRef } = React;

const NAV_ITEMS_BY_ROLE = {
  vendas:  ['dashboard', 'quotations', 'new-quotation', 'customers', 'catalog', 'notifications'],
  compras: ['dashboard', 'quotations', 'customers', 'suppliers', 'catalog', 'notifications'],
  admin:   ['dashboard', 'quotations', 'reports', 'customers', 'suppliers', 'catalog', 'admin-users', 'admin-settings', 'notifications'],
};
const NAV_META = {
  'dashboard':       { label: 'Dashboard',         icon: 'bi-grid-1x2' },
  'quotations':      { label: 'Cotações',          icon: 'bi-clipboard-data' },
  'new-quotation':   { label: 'Nova cotação',      icon: 'bi-plus-square' },
  'reports':         { label: 'Relatórios',        icon: 'bi-bar-chart-line' },
  'customers':       { label: 'Clientes',          icon: 'bi-person-lines-fill' },
  'suppliers':       { label: 'Fornecedores',      icon: 'bi-truck' },
  'catalog':         { label: 'Catálogo de peças', icon: 'bi-box-seam' },
  'admin-users':     { label: 'Usuários',          icon: 'bi-people' },
  'admin-settings':  { label: 'Configurações',     icon: 'bi-gear' },
  'notifications':   { label: 'Notificações',      icon: 'bi-bell' },
};

function Sidebar() {
  const { state, dispatch, currentUser, unreadCount } = useStore();
  const visible = NAV_ITEMS_BY_ROLE[currentUser.role] || [];
  const connected = currentUser.whatsapp_connected;
  const [showGuide, setShowGuide] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-mark"><i className="bi bi-car-front-fill"></i></div>
        <div>
          <div className="sidebar-brand-wm">COTOU</div>
          <div className="sidebar-brand-sub">ERP autopeças</div>
        </div>
      </div>
      <nav className="sidebar-nav scrollbar-thin">
        <div className="sidebar-section">Operações</div>
        {visible.map(key => {
          const meta = NAV_META[key];
          const active = state.route.name === key;
          const badge = key === 'notifications' && unreadCount > 0 ? unreadCount : null;
          return (
            <button
              key={key}
              data-tour={key}
              className={`nav-item ${active ? 'active' : ''}`}
              onClick={() => dispatch({ type: 'navigate', name: key })}
              title={meta.label}
              aria-label={meta.label}
            >
              <i className={`bi ${meta.icon} nav-icon`}></i>
              <span>{meta.label}</span>
              {badge && <span className="nav-badge">{badge}</span>}
            </button>
          );
        })}

        <div className="sidebar-section" style={{ marginTop: 4 }}>Atalhos</div>
        <button className="nav-item" onClick={() => dispatch({ type: 'navigate', name: 'quotations', params: { filter: 'pendente' } })}>
          <i className="bi bi-hourglass-split nav-icon" style={{ color: 'var(--st-pendente)' }}></i>
          <span>Pendentes</span>
        </button>
        <button className="nav-item" onClick={() => dispatch({ type: 'navigate', name: 'quotations', params: { filter: 'em_cotacao' } })}>
          <i className="bi bi-currency-exchange nav-icon" style={{ color: 'var(--st-em-cotacao)' }}></i>
          <span>Em cotação</span>
        </button>
        <button className="nav-item" onClick={() => dispatch({ type: 'navigate', name: 'quotations', params: { filter: 'cotado' } })}>
          <i className="bi bi-check2-square nav-icon" style={{ color: 'var(--st-cotado)' }}></i>
          <span>Cotadas</span>
        </button>
      </nav>

      {/* WhatsApp connection strip */}
      <div className="wa-strip-section">
        <button
          disabled={disconnecting}
          onClick={async () => {
            if (connected) {
              setDisconnecting(true);
              try {
                await fetch(`${PLATE_PROXY_URL}/api/whatsapp/instancia/desconectar`, { method: 'DELETE', credentials: 'include' });
                dispatch({ type: 'whatsapp_disconnect', userId: currentUser.id });
              } catch (_) {
                dispatch({ type: 'toast', tone: 'error', message: 'Erro ao desconectar WhatsApp. Tente novamente.' });
              } finally {
                setDisconnecting(false);
              }
            } else {
              dispatch({ type: 'open_wa_connect' });
            }
          }}
          className="wa-strip"
          title={connected ? 'Desconectar WhatsApp' : 'Conectar meu WhatsApp'}
          data-tour="wa-strip"
        >
          <i className={`bi ${disconnecting ? 'bi-arrow-clockwise' : 'bi-whatsapp'}`}
             style={{ fontSize: 15, color: connected ? 'var(--success)' : 'var(--text-faint)', flexShrink: 0,
                      animation: disconnecting ? 'spin 1s linear infinite' : 'none' }}></i>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="wa-strip-name">Meu WhatsApp</div>
            <div className="wa-strip-status" style={{ color: connected ? 'var(--success)' : 'var(--text-faint)' }}>
              {disconnecting ? '○ Desconectando…' : connected ? '● Conectado' : '○ Desconectado'}
            </div>
          </div>
          {!disconnecting && (
            <i className={`bi ${connected ? 'bi-x-circle' : 'bi-qr-code-scan'}`} style={{ fontSize: 13, color: 'var(--text-faint)', flexShrink: 0 }}></i>
          )}
        </button>
      </div>

      <div className="sidebar-user">
        <div className="avatar brand">
          {currentUser.name.split(' ').map(s => s[0]).slice(0, 2).join('')}
        </div>
        <div className="user-text" style={{ flex: 1, minWidth: 0 }}>
          <div className="semibold" style={{ fontSize: 12.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentUser.name}</div>
          <div className="faint tiny" style={{ fontFamily: 'var(--mono)' }}>{currentUser.role}</div>
        </div>
        <button className="icon-btn" data-tour="tour-help" title="Ajuda / Tutorial" onClick={() => setShowGuide(true)}>
          <i className="bi bi-question-circle" style={{ fontSize: 14 }}></i>
        </button>
        <button className="icon-btn" onClick={() => dispatch({ type: 'logout' })} title="Sair">
          <i className="bi bi-box-arrow-right" style={{ fontSize: 14 }}></i>
        </button>
      </div>

      {showGuide && <GuidedTour onClose={() => setShowGuide(false)} />}
    </aside>
  );
}

/* =========================================================
   Notifications dropdown
   ========================================================= */
function NotificationsBell() {
  const { myNotifs, unreadCount, dispatch } = useStore();
  const [open, setOpen] = useState(false);
  const [ringing, setRinging] = useState(false);
  const prevCountRef = useRef(unreadCount);
  const ref = useRef(null);

  useEffect(() => {
    if (unreadCount > prevCountRef.current) {
      setRinging(true);
      const t = setTimeout(() => setRinging(false), 800);
      prevCountRef.current = unreadCount;
      return () => clearTimeout(t);
    }
    prevCountRef.current = unreadCount;
  }, [unreadCount]);

  useEffect(() => {
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);
  const recent = myNotifs.slice(0, 7);
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="icon-btn" data-tour="notif-bell" onClick={() => setOpen(o => !o)} title={`Notificações${unreadCount ? ` (${unreadCount} não lidas)` : ''}`}>
        <i className={`bi ${ringing ? 'bi-bell-fill' : 'bi-bell'}${ringing ? ' bell-ring' : ''}`}></i>
        {unreadCount > 0 && <span className="notif-count-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>}
      </button>
      {open && (
        <div className="dropdown">
          <div className="dropdown-head">
            <strong>Notificações</strong>
            <div className="row" style={{ gap: 4 }}>
              {unreadCount > 0 && (
                <button className="btn btn-ghost btn-sm" onClick={() => dispatch({ type: 'mark_all_read' })}>Marcar todas</button>
              )}
              {recent.length > 0 && (
                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => {
                  if (!confirm('Limpar todas as notificações?')) return;
                  dispatch({ type: 'clear_notifications' });
                  fetch(`${PLATE_PROXY_URL}/api/notificacoes`, { method: 'DELETE', credentials: 'include' }).catch(() => {});
                }}>Limpar</button>
              )}
            </div>
          </div>
          <div className="dropdown-list scrollbar-thin">
            {recent.length === 0 && (
              <EmptyState icon="bi-bell-slash" title="Nenhuma notificação" />
            )}
            {recent.map(n => (
              <div
                key={n.id}
                className="notif-item"
                onClick={() => {
                  dispatch({ type: 'mark_notification_read', id: n.id });
                  if (n.quotation_id) dispatch({ type: 'navigate', name: 'quotation-detail', params: { id: n.quotation_id } });
                  setOpen(false);
                }}
              >
                <div className={`notif-icon ${!n.read_at ? 'unread' : ''}`}>
                  <i className={`bi ${n.type === 'nova_cotacao' ? 'bi-plus-square' :
                                       n.type === 'cotacao_respondida' ? 'bi-currency-exchange' :
                                       n.type === 'peca_chegou' ? 'bi-box-seam' :
                                       n.type === 'cotacao_atualizada' ? 'bi-arrow-repeat' :
                                       n.type === 'nova_mensagem' ? 'bi-chat-dots-fill' : 'bi-bell'}`}></i>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="notif-title">{n.title}</div>
                  <div className="notif-msg">{n.message}</div>
                  <div className="notif-time">{n.time_label || fmt.ago(n.created_at)}</div>
                </div>
                {!n.read_at && <div className="notif-unread-dot"></div>}
              </div>
            ))}
          </div>
          <div className="dropdown-head" style={{ borderTop: '1px solid var(--border)', borderBottom: 0, justifyContent: 'center' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => { dispatch({ type: 'navigate', name: 'notifications' }); setOpen(false); }}>
              Ver todas <i className="bi bi-arrow-right"></i>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   Topbar
   ========================================================= */
function Topbar({ title, subtitle, actions }) {
  const { dispatch } = useStore();
  const [theme, setTheme] = React.useState(document.documentElement.dataset.theme || 'light');

  React.useEffect(() => {
    const handler = (e) => setTheme(e.detail);
    window.addEventListener('cotou-theme', handler);
    return () => window.removeEventListener('cotou-theme', handler);
  }, []);

  return (
    <div className="topbar">
      <div>
        <h1>{title}</h1>
        {subtitle && <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{subtitle}</p>}
      </div>
      <div className="topbar-actions">
        {actions}
        <button
          className="icon-btn"
          onClick={() => {
            const next = theme === 'dark' ? 'light' : 'dark';
            document.documentElement.dataset.theme = next;
            window.dispatchEvent(new CustomEvent('cotou-theme', { detail: next }));
          }}
          title="Trocar tema"
        >
          <i className={`bi ${theme === 'dark' ? 'bi-sun' : 'bi-moon-stars'}`}></i>
        </button>
        <NotificationsBell />
      </div>
    </div>
  );
}

Object.assign(window, { Sidebar, Topbar, NotificationsBell, NAV_META });

