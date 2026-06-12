// COTOU — root app: router + tweaks

const { useState, useEffect } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "brand": "#2563eb",
  "theme": "light"
}/*EDITMODE-END*/;

function Router() {
  const { state, dispatch, currentUser } = useStore();
  const [showGuide, setShowGuide] = useState(false);

  // Show guide on first login per user
  useEffect(() => {
    if (!state.loggedIn || !currentUser) return;
    const key = `cotou_guide_seen_${currentUser.id}`;
    if (!localStorage.getItem(key)) {
      setShowGuide(true);
      localStorage.setItem(key, '1');
    }
  }, [state.loggedIn, currentUser?.id]);

  if (!state.loggedIn) return <LoginScreen />;

  let screen = null;
  switch (state.route.name) {
    case 'dashboard':         screen = <Dashboard />; break;
    case 'quotations':        screen = <QuotationsList />; break;
    case 'quotation-detail':  screen = <QuotationDetail />; break;
    case 'new-quotation':     screen = <NewQuotation key={state.route.name + JSON.stringify(state.route.params)} />; break;
    case 'catalog':           screen = <CatalogScreen />; break;
    case 'notifications':     screen = <NotificationsScreen />; break;
    case 'admin-users':       screen = <AdminUsersScreen />; break;
    case 'admin-settings':    screen = <AdminSettingsScreen />; break;
    case 'customers':         screen = <CustomersScreen />; break;
    case 'suppliers':         screen = <SuppliersScreen />; break;
    case 'reports':           screen = <ReportsScreen />; break;
    default:                  screen = <Dashboard />;
  }

  const titles = {
    'dashboard': { title: 'Dashboard', subtitle: 'Visão geral do dia' },
    'quotations': { title: 'Cotações', subtitle: 'Todas as cotações em fluxo' },
    'quotation-detail': { title: 'Detalhe da cotação', subtitle: null },
    'new-quotation': { title: 'Nova cotação', subtitle: 'Abertura' },
    'catalog': { title: 'Catálogo', subtitle: 'Peças cadastradas' },
    'notifications': { title: 'Notificações', subtitle: 'Eventos do sistema' },
    'admin-users': { title: 'Usuários', subtitle: 'Gestão de acesso' },
    'admin-settings': { title: 'Configurações', subtitle: 'Personalização do sistema' },
    'customers': { title: 'Clientes', subtitle: 'Histórico e gestão de clientes' },
    'suppliers': { title: 'Fornecedores', subtitle: 'Cadastro de fornecedores' },
    'reports':   { title: 'Relatórios', subtitle: 'Análise de desempenho' },
  };
  const t = titles[state.route.name] || titles.dashboard;

  return (
    <div className="app-root">
      <Sidebar />
      <main style={{ minWidth: 0 }}>
        <Topbar title={t.title} subtitle={t.subtitle} />
        {screen}
      </main>
      <MobileNav />
      {state.waConnectOpen && (
        <WhatsAppConnectModal
          userId={currentUser.id}
          onClose={() => dispatch({ type: 'close_wa_connect' })}
        />
      )}
      {showGuide && <GuidedTour onClose={() => setShowGuide(false)} />}
    </div>
  );
}

function MobileNav() {
  const { state, dispatch, currentUser, unreadCount } = useStore();
  const role = currentUser?.role || 'vendas';

  const items = {
    vendas:  ['dashboard', 'quotations', 'new-quotation', 'notifications'],
    compras: ['dashboard', 'quotations', 'customers', 'notifications'],
    admin:   ['dashboard', 'quotations', 'reports', 'notifications'],
  }[role] || ['dashboard', 'quotations', 'notifications'];

  return (
    <nav className="mobile-nav">
      {items.map(key => {
        const meta = NAV_META[key] || { label: key, icon: 'bi-circle' };
        const isActive = state.route.name === key;
        const badge = key === 'notifications' && unreadCount > 0 ? unreadCount : null;
        return (
          <button key={key} className={`mobile-nav-item ${isActive ? 'active' : ''}`}
            onClick={() => dispatch({ type: 'navigate', name: key })}>
            <div style={{ position: 'relative', display: 'inline-flex' }}>
              <i className={`bi ${meta.icon}`}></i>
              {badge && <span className="mobile-nav-badge">{badge > 9 ? '9+' : badge}</span>}
            </div>
            <span>{meta.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

/* =========================================================
   Tweaks
   ========================================================= */

const BRAND_PRESETS = ['#2563eb', '#0ea5e9', '#7c3aed', '#16a34a', '#dc2626', '#0f172a'];

function CotouTweaks() {
  const { TweaksPanel, TweakSection, TweakColor, TweakRadio, useTweaks } = window;
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  useEffect(() => {
    // Apply brand
    const brand = t.brand || '#dc2626';
    document.documentElement.style.setProperty('--brand', brand);
    // Auto-compute brand-hover & soft variants
    document.documentElement.style.setProperty('--brand-hover', shade(brand, -15));
    document.documentElement.style.setProperty('--brand-soft', tint(brand, 0.88));
    document.documentElement.style.setProperty('--brand-text', luminance(brand) > 0.55 ? '#0a0a0a' : '#ffffff');
  }, [t.brand]);

  useEffect(() => {
    document.documentElement.dataset.theme = t.theme || 'light';
  }, [t.theme]);

  // Listen for topbar theme toggle and reflect in tweak
  useEffect(() => {
    const handler = (e) => setTweak('theme', e.detail);
    window.addEventListener('cotou-theme', handler);
    return () => window.removeEventListener('cotou-theme', handler);
  }, []);

  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="Tema" />
      <TweakRadio
        label="Modo"
        value={t.theme}
        onChange={v => setTweak('theme', v)}
        options={['light', 'dark']}
      />
      <TweakSection label="Marca" />
      <TweakColor
        label="Cor primária"
        value={t.brand}
        onChange={v => setTweak('brand', v)}
        options={BRAND_PRESETS}
      />
    </TweaksPanel>
  );
}

/* Color utilities (simple) */
function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function rgbToHex(r, g, b) {
  const c = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return '#' + c(r) + c(g) + c(b);
}
function shade(hex, pct) {
  const { r, g, b } = hexToRgb(hex);
  const f = 1 + pct / 100;
  return rgbToHex(r * f, g * f, b * f);
}
function tint(hex, ratio) {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(r + (255 - r) * ratio, g + (255 - g) * ratio, b + (255 - b) * ratio);
}
function luminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

/* =========================================================
   Root
   ========================================================= */
function App() {
  return (
    <StoreProvider>
      <Router />
      <Toasts />
      <CotouTweaks />
    </StoreProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);

