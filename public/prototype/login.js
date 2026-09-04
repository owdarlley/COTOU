// COTOU — Login + auth-adjacent screens

const { useState } = React;

function LoginScreen() {
  const { state, dispatch } = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loggingIn, setLoggingIn] = React.useState(false);
  const [loginUsers, setLoginUsers] = React.useState([]);
  const [picked, setPicked] = React.useState(null);
  const pwdRef = React.useRef(null);

  React.useEffect(() => {
    fetch(PLATE_PROXY_URL + '/auth/users')
      .then(r => r.json()).then(d => { if (d.ok) setLoginUsers(d.users); }).catch(() => {});
  }, []);

  // Backend URL configurator — necessário quando o frontend está no GitHub Pages
  const [backendUrl, setBackendUrl] = React.useState(PLATE_PROXY_URL);
  const [editingBackend, setEditingBackend] = React.useState(false);
  const [backendDraft, setBackendDraft] = React.useState(PLATE_PROXY_URL);

  function applyBackend(url) {
    const clean = (url || '').trim().replace(/\/$/, '');
    if (!clean) return;
    try { localStorage.setItem('cotou_backend_url', clean); } catch (_) {}
    PLATE_PROXY_URL = clean;
    setBackendUrl(clean);
    setBackendDraft(clean);
    setEditingBackend(false);
  }

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoggingIn(true);
    try {
      const res = await fetch(PLATE_PROXY_URL + '/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (res.status === 429) {
        dispatch({ type: 'toast', tone: 'error', message: 'Muitas tentativas de login. Aguarde alguns minutos antes de tentar novamente.' });
        return;
      }
      const data = await res.json();
      if (!data.ok) {
        dispatch({ type: 'toast', tone: 'error', message: data.error || 'Credenciais inválidas' });
        return;
      }
      let u = state.users.find(u => u.email === email);
      if (!u) {
        u = { id: data.user.id, name: data.user.name, email, role: data.user.role, active: true,
              phone_whatsapp: '', whatsapp_instance: null, whatsapp_connected: false };
        dispatch({ type: 'upsert_user', user: u });
      }
      if (data.csrfToken) { _csrfToken = data.csrfToken; window.__PLATE_PROXY_URL = PLATE_PROXY_URL; }
      dispatch({ type: 'login', userId: data.user.id });
      // Sync real WA connection status from backend right after login
      try {
        const stRes = await fetch(PLATE_PROXY_URL + '/api/whatsapp/instancia/status', { credentials: 'include' });
        const stData = await stRes.json().catch(() => ({}));
        if (stData.connected) {
          dispatch({ type: 'whatsapp_connect', userId: data.user.id });
        } else {
          dispatch({ type: 'whatsapp_disconnect', userId: data.user.id });
        }
      } catch (_) {
        dispatch({ type: 'whatsapp_disconnect', userId: data.user.id });
      }
    } catch (err) {
      dispatch({ type: 'toast', tone: 'error', message: `Erro de conexão: ${err?.message || String(err)} | URL: ${PLATE_PROXY_URL}` });
    } finally {
      setLoggingIn(false);
    }
  };

  return (
    <div className="login-bg">
      {/* Poster side */}
      <div className="login-poster">
        <div className="login-mark">
          <div className="sidebar-brand-mark"><i className="bi bi-car-front-fill"></i></div>
          <div>
            <div className="sidebar-brand-wm" style={{ color: '#fff' }}>COTOU</div>
            <div className="sidebar-brand-sub" style={{ color: 'rgba(255,255,255,0.5)' }}>ERP autopeças</div>
          </div>
        </div>

        <div>
          <h2 className="login-headline">
            Cotação em<br/>tempo real entre<br/>
            <span style={{ color: 'var(--brand)' }}>vendas</span> e <span style={{ color: 'var(--brand)' }}>compras</span>.
          </h2>
          <p className="login-sub">
            Abra uma cotação no balcão, o setor de compras recebe alerta na hora, cota com fornecedores
            e devolve o preço pronto pra enviar ao cliente via WhatsApp.
          </p>
        </div>

        {/* Mock terminal-like preview */}
        <div style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 18, fontFamily: 'var(--mono)', fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>
          <div className="row" style={{ gap: 6, marginBottom: 10 }}>
            <span style={{ width: 8, height: 8, borderRadius: 99, background: '#dc2626' }}></span>
            <span style={{ width: 8, height: 8, borderRadius: 99, background: '#fbbf24' }}></span>
            <span style={{ width: 8, height: 8, borderRadius: 99, background: '#22c55e' }}></span>
            <span style={{ marginLeft: 8, color: 'rgba(255,255,255,0.35)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase' }}>cotou://stream</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div><span style={{ color: '#fbbf24' }}>[10:31]</span> João abriu COT-2026-0008 · Honda Civic STU6K34</div>
            <div><span style={{ color: '#60a5fa' }}>[10:33]</span> Maria assumiu cotação · status: em_cotacao</div>
            <div><span style={{ color: '#34d399' }}>[10:48]</span> Maria respondeu · R$ 425,00 · 2 dias</div>
            <div><span style={{ color: '#a78bfa' }}>[10:52]</span> WhatsApp enviado para cliente · ✓</div>
          </div>
        </div>

        <div className="login-meta">
          <div>v1.0 · 2026</div>
          <div>SQLite · Socket.io</div>
          <div>multi-role</div>
        </div>
      </div>

      {/* Form side */}
      <div className="login-form-wrap">
        <form className="login-form" onSubmit={onSubmit}>
          <h2 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 6px' }}>Entrar</h2>
          <p className="muted small" style={{ marginBottom: 24 }}>Acesso para vendas, compras e administração.</p>

          <div className="col" style={{ gap: 14 }}>
            <Field label="E-mail">
              <div className="input-group">
                <i className="bi bi-envelope input-icon"></i>
                <input
                  className="input"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com.br"
                  autoFocus
                />
              </div>
            </Field>

            <Field label="Senha">
              <div className="input-group">
                <i className="bi bi-lock input-icon"></i>
                <input
                  ref={pwdRef}
                  className="input"
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Sua senha"
                  style={{ paddingRight: 40 }}
                />
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setShowPwd(s => !s)}
                  style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', width: 30, height: 30 }}
                  title="Mostrar senha"
                >
                  <i className={`bi ${showPwd ? 'bi-eye-slash' : 'bi-eye'}`} style={{ fontSize: 13 }}></i>
                </button>
              </div>
            </Field>

            <div className="row between" style={{ marginTop: -4 }}>
              <label className="row tiny muted" style={{ gap: 6, cursor: 'pointer' }}>
                <input type="checkbox" defaultChecked /> Lembrar-me
              </label>
              <a href="#" className="tiny semibold" style={{ color: 'var(--brand)', textDecoration: 'none' }}>Esqueceu a senha?</a>
            </div>

            <Button variant="primary" size="lg" type="submit" iconRight={loggingIn ? 'bi-arrow-clockwise' : 'bi-arrow-right'} style={{ width: '100%', marginTop: 4 }} disabled={loggingIn}>
              {loggingIn ? 'Entrando…' : 'Entrar'}
            </Button>
          </div>

          {/* Acesso rápido — preenche só o e-mail; senha digitada pelo usuário */}
          {loginUsers.length > 0 && (
            <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
              <div className="tiny" style={{ color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: 'var(--mono)', textAlign: 'center', marginBottom: 10 }}>
                Acesso rápido
              </div>
              <div className="role-pick">
                {loginUsers.map(u => (
                  <button
                    key={u.id}
                    type="button"
                    className={`role-tile ${picked === u.id ? 'active' : ''}`}
                    onClick={() => { setEmail(u.email); setPicked(u.id); setTimeout(() => pwdRef.current?.focus(), 50); }}
                  >
                    <RoleBadge role={u.role} />
                    <div className="role-tile-name" style={{ marginTop: 6 }}>{u.name}</div>
                    <div className="role-tile-mail">{u.email}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Backend URL configurator — URL nunca exposta na tela; botão discreto apenas quando editando */}
          {editingBackend ? (
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className="bi bi-hdd-network" style={{ color: 'var(--text-faint)', fontSize: 12, flexShrink: 0 }}></i>
                <input
                  className="input"
                  style={{ flex: 1, height: 28, fontSize: 12, padding: '0 8px', fontFamily: 'var(--mono)' }}
                  value={backendDraft}
                  onChange={e => setBackendDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') applyBackend(backendDraft); if (e.key === 'Escape') setEditingBackend(false); }}
                  placeholder="https://seu-servidor.trycloudflare.com"
                  autoFocus
                />
                <button type="button" className="btn btn-primary" style={{ height: 28, padding: '0 10px', fontSize: 12 }} onClick={() => applyBackend(backendDraft)}>OK</button>
                <button type="button" className="btn btn-ghost" style={{ height: 28, padding: '0 8px', fontSize: 12 }} onClick={() => setEditingBackend(false)}>✕</button>
              </div>
            </div>
          ) : null}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 }}>
            <p className="tiny faint" style={{ margin: 0 }}>© 2026 COTOU · ERP Autopeças v1.0</p>
            <button
              type="button"
              onClick={() => { setBackendDraft(backendUrl); setEditingBackend(true); }}
              title="Configurar servidor"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-faint)', lineHeight: 1 }}
            >
              <i className="bi bi-hdd-network" style={{ fontSize: 12 }}></i>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

Object.assign(window, { LoginScreen });

